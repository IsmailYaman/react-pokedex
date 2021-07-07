const pokedex = document.getElementById('pokedex');

const fetchNormalPokemon = () => {
    const promises = [];
    for (let i = 1; i <= 807; i++) {
        const url = `https://pokeapi.co/api/v2/pokemon/${i}`;
        promises.push(fetch(url).then((res) => res.json()));
    }
    Promise.all(promises).then((results) => {
        const pokemon = results.map((result) => ({
            name: result.name,
            image: result.sprites['front_default'],
            type: result.types.map((type) => type.type.name).join(', '),
            id: result.id
        }));
        displayPokemon(pokemon);
    });
};

const fetchShinyPokemon = () => {
    const promises = [];
    for (let i = 1; i <= 807; i++) {
        const url = `https://pokeapi.co/api/v2/pokemon/${i}`;
        promises.push(fetch(url).then((res) => res.json()));
    }
    Promise.all(promises).then((results) => {
        const pokemon = results.map((result) => ({
            name: result.name,
            image: result.sprites['front_shiny'],
            type: result.types.map((type) => type.type.name).join(', '),
            id: result.id
        }));
        displayPokemon(pokemon);
    });
};

const displayPokemon = (pokemon) => {

    const pokemonHTMLString = pokemon
        .map(
            (pokeman) =>
            `
            <div class="card my-3 mx-3 col-sm-12 col-md-3 col-lg-3">
            <a href="https://pokemondb.net/pokedex/${pokeman.name}"><img class="card-img-top"  src="${pokeman.image}" alt="${pokeman.name}"></a>
                <hr style="margin:0px";>
                <div class="card-body" style="padding-top:1rem;">
                    <h5 class="card-title">${pokeman.id}. ${pokeman.name}</h5>
                    <p class="card-text">${pokeman.type}</p>
                    
                </div>
            </div>
            `
        )
        .join('');
    pokedex.innerHTML = pokemonHTMLString;
};


fetchNormalPokemon();
fetchShinyPokemon();