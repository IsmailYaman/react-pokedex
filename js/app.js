// Global variables
let allPokemon = [];        // Stores all fetched pokemon data
let currentPokemon = [];    // Stores currently filtered/displayed pokemon
let currentPage = 1;
let pokemonPerPage = 12;
let isShiny = false;
let allTypes = [];
let loadedPokemonCount = 0;
let totalPokemonCount = 0;
let activeFilters = {       // Tracks currently active filters
    search: '',
    type: '',
    generation: ''
};
let generationRanges = {
    1: { start: 1, end: 151 },
    2: { start: 152, end: 251 },
    3: { start: 252, end: 386 },
    4: { start: 387, end: 493 },
    5: { start: 494, end: 649 },
    6: { start: 650, end: 721 },
    7: { start: 722, end: 809 },
    8: { start: 810, end: 898 }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Show loading indicator
    toggleLoadingIndicator(true);
    
    // Set up event listeners
    setupEventListeners();
    
    // Load Pokemon types for filter
    fetchPokemonTypes();
    
    // Fetch initial Pokemon data with pagination
    fetchPokemonList();
});

// Setup all event listeners
function setupEventListeners() {
    // Toggle between normal and shiny sprites
    document.getElementById('normalView').addEventListener('click', (e) => {
        e.preventDefault();
        toggleShinyMode(false);
    });
    
    document.getElementById('shinyView').addEventListener('click', (e) => {
        e.preventDefault();
        toggleShinyMode(true);
    });
    
    // Search functionality
    document.getElementById('searchButton').addEventListener('click', () => {
        const searchInput = document.getElementById('searchInput');
        activeFilters.search = searchInput.value.toLowerCase();
        filterAndDisplayPokemon();
    });
    
    document.getElementById('searchInput').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            activeFilters.search = e.target.value.toLowerCase();
            filterAndDisplayPokemon();
        }
    });
    
    // Filters
    document.getElementById('typeFilter').addEventListener('change', (e) => {
        activeFilters.type = e.target.value;
        filterAndDisplayPokemon();
    });
    
    document.getElementById('genFilter').addEventListener('change', (e) => {
        activeFilters.generation = e.target.value;
        filterAndDisplayPokemon();
    });
    
    document.getElementById('sortOption').addEventListener('change', filterAndDisplayPokemon);
    
    // Clear all filters button
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
    
    // Set up modal events for displaying Pokemon details
    const pokemonDetailModal = document.getElementById('pokemonDetailModal');
    pokemonDetailModal.addEventListener('show.bs.modal', (event) => {
        const button = event.relatedTarget;
        const pokemonId = button.getAttribute('data-pokemon-id');
        displayPokemonDetails(pokemonId);
    });
    
    // Reset JSON tab when modal is hidden
    pokemonDetailModal.addEventListener('hidden.bs.modal', () => {
        // Reset to details tab when modal is closed
        const detailsTab = document.getElementById('details-tab');
        const bsTab = new bootstrap.Tab(detailsTab);
        bsTab.show();
        
        // Reset copy button text
        document.getElementById('copyJsonBtn').innerHTML = '<i class="fas fa-copy me-1"></i>Copy JSON';
    });
}

// Toggle between normal and shiny sprites
function toggleShinyMode(shiny) {
    if (isShiny !== shiny) {
        isShiny = shiny;
        updateActiveNavLink();
        if (currentPokemon.length > 0) {
            displayPokemon(currentPokemon);
        }
    }
}

// Update active nav link based on current view
function updateActiveNavLink() {
    document.getElementById('normalView').classList.toggle('active', !isShiny);
    document.getElementById('shinyView').classList.toggle('active', isShiny);
}

// Fetch Pokemon types for the type filter
async function fetchPokemonTypes() {
    try {
        const response = await fetch('https://pokeapi.co/api/v2/type');
        const data = await response.json();
        
        // Filter out non-standard types like 'unknown' and 'shadow'
        allTypes = data.results.filter(type => 
            !['unknown', 'shadow'].includes(type.name)
        );
        
        // Populate the type filter dropdown
        const typeFilter = document.getElementById('typeFilter');
        allTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = capitalizeFirstLetter(type.name);
            typeFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching Pokemon types:', error);
    }
}

// Fetch initial list of Pokemon with pagination
async function fetchPokemonList(limit = 100, offset = 0) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
        const data = await response.json();
        
        totalPokemonCount = data.count;
        
        // Fetch detailed data for each Pokemon in the list
        const detailedDataPromises = data.results.map(pokemon => 
            fetchPokemonData(pokemon.url)
        );
        
        // Process results as they come in
        const results = await Promise.allSettled(detailedDataPromises);
        
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                allPokemon.push(result.value);
                loadedPokemonCount++;
            }
        });
        
        // Sort Pokemon by ID
        allPokemon.sort((a, b) => a.id - b.id);
        
        // Update display if we have Pokemon to show
        if (allPokemon.length > 0) {
            filterAndDisplayPokemon();
        }
        
        // If we haven't loaded all Pokemon yet, fetch more
        if (loadedPokemonCount < totalPokemonCount && loadedPokemonCount < 898) {
            fetchPokemonList(100, loadedPokemonCount);
        } else {
            toggleLoadingIndicator(false);
        }
    } catch (error) {
        console.error('Error fetching Pokemon list:', error);
        toggleLoadingIndicator(false);
    }
}

// Fetch detailed data for a single Pokemon
async function fetchPokemonData(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Extract only the data we need
        return {
            id: data.id,
            name: data.name,
            sprites: {
                normal: data.sprites.front_default,
                shiny: data.sprites.front_shiny
            },
            types: data.types.map(type => type.type.name),
            height: data.height,
            weight: data.weight,
            abilities: data.abilities.map(ability => ability.ability.name),
            stats: data.stats.map(stat => ({
                name: stat.stat.name,
                value: stat.base_stat
            })),
            species_url: data.species.url
        };
    } catch (error) {
        console.error(`Error fetching data for Pokemon at ${url}:`, error);
        return null;
    }
}

// Filter Pokemon based on current filter settings and display them
function filterAndDisplayPokemon() {
    const sortOption = document.getElementById('sortOption').value;
    
    // Reset to first page when filters change
    currentPage = 1;
    
    // Filter Pokemon
    currentPokemon = allPokemon.filter(pokemon => {
        // Name filter
        if (activeFilters.search && !pokemon.name.includes(activeFilters.search)) {
            return false;
        }
        
        // Type filter
        if (activeFilters.type && !pokemon.types.includes(activeFilters.type)) {
            return false;
        }
        
        // Generation filter
        if (activeFilters.generation) {
            const range = generationRanges[activeFilters.generation];
            if (pokemon.id < range.start || pokemon.id > range.end) {
                return false;
            }
        }
        
        return true;
    });
    
    // Sort Pokemon
    if (sortOption === 'name') {
        currentPokemon.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        currentPokemon.sort((a, b) => a.id - b.id);
    }
    
    // Update active filters display
    updateActiveFiltersDisplay();
    
    // Display filtered Pokemon
    displayPokemon(currentPokemon);
    updatePagination();
}

// Display Pokemon on the page
function displayPokemon(pokemonList) {
    const pokedexContainer = document.getElementById('pokedex');
    pokedexContainer.innerHTML = '';
    
    // Calculate slice for current page
    const startIndex = (currentPage - 1) * pokemonPerPage;
    const endIndex = startIndex + pokemonPerPage;
    const currentPagePokemon = pokemonList.slice(startIndex, endIndex);
    
    if (currentPagePokemon.length === 0) {
        pokedexContainer.innerHTML = '<div class="col-12 text-center my-5"><h3>No Pokémon found. Try adjusting your filters.</h3></div>';
        return;
    }
    
    // Create HTML for each Pokemon
    currentPagePokemon.forEach(pokemon => {
        const pokemonCard = document.createElement('div');
        pokemonCard.className = 'col-sm-6 col-md-4 col-lg-3 mb-4';
        
        // Choose sprite based on current view mode
        const spriteUrl = isShiny ? pokemon.sprites.shiny : pokemon.sprites.normal;
        
        // Create type badges HTML
        const typeBadges = pokemon.types.map(type => 
            `<span class="type-badge type-${type}">${capitalizeFirstLetter(type)}</span>`
        ).join('');
        
        pokemonCard.innerHTML = `
            <div class="pokemon-card">
                <div class="card-img-container">
                    <img src="${spriteUrl}" alt="${pokemon.name}" class="img-fluid">
                    <div class="pokemon-id">#${pokemon.id}</div>
                </div>
                <div class="card-body">
                    <h5 class="card-title">${capitalizeFirstLetter(pokemon.name)}</h5>
                    <div class="pokemon-types">
                        ${typeBadges}
                    </div>
                    <button class="btn btn-primary btn-sm mt-3 w-100" 
                            data-bs-toggle="modal" 
                            data-bs-target="#pokemonDetailModal"
                            data-pokemon-id="${pokemon.id}">
                        View Details
                    </button>
                </div>
            </div>
        `;
        
        pokedexContainer.appendChild(pokemonCard);
    });
}

// Display detailed information for a single Pokemon
async function displayPokemonDetails(pokemonId) {
    const pokemon = allPokemon.find(p => p.id == pokemonId);
    if (!pokemon) return;
    
    const modalTitle = document.getElementById('pokemonDetailModalLabel');
    const modalContent = document.getElementById('pokemonDetailContent');
    
    modalTitle.textContent = `#${pokemon.id} ${capitalizeFirstLetter(pokemon.name)}`;
    
    // Choose sprite based on current view mode
    const spriteUrl = isShiny ? pokemon.sprites.shiny : pokemon.sprites.normal;
    
    // Create type badges HTML
    const typeBadges = pokemon.types.map(type => 
        `<span class="type-badge type-${type}">${capitalizeFirstLetter(type)}</span>`
    ).join('');
    
    // Try to fetch species data for more details
    let speciesData = null;
    try {
        const speciesResponse = await fetch(pokemon.species_url);
        speciesData = await speciesResponse.json();
    } catch (error) {
        console.error('Error fetching species data:', error);
    }
    
    // Fetch the complete Pokemon data for JSON view
    let completeData = null;
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
        completeData = await response.json();
        
        // Display the JSON data in the JSON tab
        displayJsonData(completeData);
    } catch (error) {
        console.error('Error fetching complete Pokemon data:', error);
        document.getElementById('jsonDataDisplay').textContent = 'Error loading JSON data.';
    }
    
    // Get English flavor text if available
    let flavorText = 'No description available.';
    if (speciesData && speciesData.flavor_text_entries) {
        const englishEntry = speciesData.flavor_text_entries.find(
            entry => entry.language.name === 'en'
        );
        if (englishEntry) {
            flavorText = englishEntry.flavor_text.replace(/\f/g, ' ');
        }
    }
    
    // Create stat bars
    const statBars = pokemon.stats.map(stat => {
        // Calculate width percentage (max stat value is typically 255)
        const percentage = Math.min(100, (stat.value / 255) * 100);
        return `
            <div class="row align-items-center mb-1">
                <div class="col-4 col-md-3">
                    ${formatStatName(stat.name)}
                </div>
                <div class="col-2 col-md-1 text-end">
                    ${stat.value}
                </div>
                <div class="col-6 col-md-8">
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    modalContent.innerHTML = `
        <div class="pokemon-detail-header">
            <img src="${spriteUrl}" alt="${pokemon.name}" class="img-fluid">
            <div>
                <div class="mb-3">${typeBadges}</div>
                <p>${flavorText}</p>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <h5>Details</h5>
                <table class="table">
                    <tr>
                        <th>Height</th>
                        <td>${(pokemon.height / 10).toFixed(1)} m</td>
                    </tr>
                    <tr>
                        <th>Weight</th>
                        <td>${(pokemon.weight / 10).toFixed(1)} kg</td>
                    </tr>
                    <tr>
                        <th>Abilities</th>
                        <td>${pokemon.abilities.map(ability => 
                            capitalizeFirstLetter(ability.replace('-', ' '))
                        ).join(', ')}</td>
                    </tr>
                </table>
            </div>
            
            <div class="col-md-6">
                <h5>Base Stats</h5>
                <div class="stats-container">
                    ${statBars}
                </div>
            </div>
        </div>
    `;
    
    // Set up copy button functionality
    document.getElementById('copyJsonBtn').addEventListener('click', copyJsonToClipboard);
}

// Display formatted JSON data with syntax highlighting
function displayJsonData(data) {
    const jsonContainer = document.getElementById('jsonDataDisplay');
    
    // Convert data to a formatted JSON string with indentation
    const formattedJson = JSON.stringify(data, null, 2);
    
    // Apply syntax highlighting
    const highlightedJson = syntaxHighlightJson(formattedJson);
    
    // Set the HTML content
    jsonContainer.innerHTML = highlightedJson;
}

// Add syntax highlighting to JSON
function syntaxHighlightJson(json) {
    // Replace special characters to prevent HTML injection
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Apply regex patterns to add span elements with classes for styling
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
    });
}

// Copy JSON data to clipboard
function copyJsonToClipboard() {
    const jsonDisplay = document.getElementById('jsonDataDisplay');
    const jsonText = jsonDisplay.textContent;
    
    // Create a temporary textarea element to copy the text
    const textarea = document.createElement('textarea');
    textarea.value = jsonText;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        // Execute copy command
        const successful = document.execCommand('copy');
        
        // Provide user feedback
        const copyBtn = document.getElementById('copyJsonBtn');
        const originalText = copyBtn.innerHTML;
        
        if (successful) {
            copyBtn.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
        } else {
            copyBtn.innerHTML = '<i class="fas fa-times me-1"></i>Failed';
        }
        
        // Reset button text after a delay
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    } catch (err) {
        console.error('Error copying text:', err);
    }
    
    // Remove the temporary textarea
    document.body.removeChild(textarea);
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(currentPokemon.length / pokemonPerPage);
    
    // Update both top and bottom pagination
    ['Top', 'Bottom'].forEach(position => {
        const paginationElement = document.getElementById(`pagination${position}`);
        paginationElement.innerHTML = '';
        
        // Don't show pagination if there's only one page
        if (totalPages <= 1) {
            return;
        }
        
        // Previous button
        const prevButton = document.createElement('li');
        prevButton.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevButton.innerHTML = `<a class="page-link" href="#" aria-label="Previous">
            <span aria-hidden="true">&laquo;</span>
        </a>`;
        prevButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                goToPage(currentPage - 1);
            }
        });
        paginationElement.appendChild(prevButton);
        
        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // Adjust if we're near the end
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;
            pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            pageItem.addEventListener('click', (e) => {
                e.preventDefault();
                goToPage(i);
            });
            paginationElement.appendChild(pageItem);
        }
        
        // Next button
        const nextButton = document.createElement('li');
        nextButton.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextButton.innerHTML = `<a class="page-link" href="#" aria-label="Next">
            <span aria-hidden="true">&raquo;</span>
        </a>`;
        nextButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                goToPage(currentPage + 1);
            }
        });
        paginationElement.appendChild(nextButton);
    });
}

// Go to a specific page
function goToPage(page) {
    currentPage = page;
    displayPokemon(currentPokemon);
    updatePagination();
    
    // Scroll to top of the pokedex container
    document.getElementById('pokedex').scrollIntoView({ behavior: 'smooth' });
}

// Show or hide loading indicator
function toggleLoadingIndicator(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (show) {
        loadingIndicator.classList.remove('d-none');
    } else {
        loadingIndicator.classList.add('d-none');
    }
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Format stat name for display
function formatStatName(statName) {
    switch (statName) {
        case 'hp': return 'HP';
        case 'attack': return 'Attack';
        case 'defense': return 'Defense';
        case 'special-attack': return 'Sp. Atk';
        case 'special-defense': return 'Sp. Def';
        case 'speed': return 'Speed';
        default: return capitalizeFirstLetter(statName);
    }
}

// Update the active filters display
function updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('activeFilters');
    const clearFiltersButton = document.getElementById('clearFilters');
    activeFiltersContainer.innerHTML = '';
    
    let hasActiveFilters = false;
    
    // Create a tag for search filter if active
    if (activeFilters.search) {
        const searchTag = createFilterTag('Name', activeFilters.search, () => {
            document.getElementById('searchInput').value = '';
            activeFilters.search = '';
            filterAndDisplayPokemon();
        });
        activeFiltersContainer.appendChild(searchTag);
        hasActiveFilters = true;
    }
    
    // Create a tag for type filter if active
    if (activeFilters.type) {
        const typeTag = createFilterTag('Type', capitalizeFirstLetter(activeFilters.type), () => {
            document.getElementById('typeFilter').value = '';
            activeFilters.type = '';
            filterAndDisplayPokemon();
        });
        activeFiltersContainer.appendChild(typeTag);
        hasActiveFilters = true;
    }
    
    // Create a tag for generation filter if active
    if (activeFilters.generation) {
        const genTag = createFilterTag('Generation', 'Gen ' + activeFilters.generation, () => {
            document.getElementById('genFilter').value = '';
            activeFilters.generation = '';
            filterAndDisplayPokemon();
        });
        activeFiltersContainer.appendChild(genTag);
        hasActiveFilters = true;
    }
    
    // Show or hide the clear all filters button
    if (hasActiveFilters) {
        clearFiltersButton.classList.remove('d-none');
    } else {
        clearFiltersButton.classList.add('d-none');
    }
}

// Create a filter tag element
function createFilterTag(name, value, onRemove) {
    const tag = document.createElement('div');
    tag.className = 'filter-tag';
    tag.innerHTML = `
        <span class="filter-name">${name}:</span>
        <span class="filter-value">${value}</span>
        <span class="remove-filter"><i class="fas fa-times"></i></span>
    `;
    
    // Add click event for the remove button
    tag.querySelector('.remove-filter').addEventListener('click', onRemove);
    
    return tag;
}

// Clear all active filters
function clearAllFilters() {
    // Reset filter values in the UI
    document.getElementById('searchInput').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('genFilter').value = '';
    
    // Reset active filters object
    activeFilters.search = '';
    activeFilters.type = '';
    activeFilters.generation = '';
    
    // Apply the reset filters
    filterAndDisplayPokemon();
}