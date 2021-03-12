(function() {
    // Cache the complete pokemon list for multiple form submissions
    let cachedPokemon = null;

    function ready(fn) {
        if (document.readyState !== 'loading'){
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    function attachVisibilityToggleListeners() {
        // Get a list of inputs that have data-toggleVisibility
        const toggles = document.querySelectorAll('[data-toggleVisibility]');

        // For each of those inputs
        toggles.forEach((el) => {
            // Find the element they control
            const controlledElement = document.getElementById(el.getAttribute('data-toggleVisibility'));

            // Attach an event handler (click) to the inputs that toggles the
            // visibility of the controlled element
            el.addEventListener('click', (e) => {
                if (controlledElement.classList.contains('hidden')) {
                    controlledElement.classList.remove('hidden');
                } else {
                    controlledElement.classList.add('hidden');
                }
            });
        });
    }

    function getPokemonList() {
        if (cachedPokemon) {
            return new Promise((resolve) => resolve(cachedPokemon));
        }

        return fetch('https://pokeapi.co/api/v2/pokemon?limit=898')
            .then((res) => {
                if (res.ok) {
                    return res.json();
                }

                throw new Error(res.statusText);
            })
            .then((pokemonList) => {
                const promises = [];

                pokemonList.results.forEach((pokemon) => {
                    const id = pokemon.url.match(/\/\d+\//)[0].replace(/\//g, '');

                    const pokemonPromise = fetch(pokemon.url)
                        .then((res) => {
                            if (res.ok) {
                                return res.json();
                            }

                            throw new Error(res.statusText);
                        })
                        .then((json) => {
                            return json;
                        })
                        .catch(() => {
                            return null;
                        });

                    const speciesPromise = fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`)
                        .then((res) => {
                            if (res.ok) {
                                return res.json();
                            }

                            throw new Error(res.statusText);
                        })
                        .then((json) => {
                            return json;
                        })
                        .catch(() => {
                            return null;
                        });

                    promises.push(Promise.all([pokemonPromise, speciesPromise]));
                })

                return Promise.all(promises);
            })
            .catch((err) => {
                console.error(err);
            })
    }

    function setLoading() {
        const button = document.getElementById('form-submit');
        button.innerText = 'Loading...';
        button.setAttribute('disabled', 'disabled');
    }

    function unsetLoading() {
        const button = document.getElementById('form-submit');
        button.innerText = 'Show me my team';
        button.removeAttribute('disabled');
    }

    function getFormValues() {
        const values = {};

        values.excludeLegendaries = document.getElementById('exclude-legendaries').checked;
        values.babyOnly = document.getElementById('baby').checked;

        if (document.getElementById('type-specialist').checked) {
            values.typeSpecialist = document.getElementById('type-selection').value;
        } else {
            values.typeSpecialist = false;
        }

        return values;
    }

    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)]
    }

    function getTypeNames(pokemon) {
        return pokemon[0].types.map((type) => type.type.name);
    }

    function getAbilityNames(pokemon) {
        return pokemon[0].abilities.map((ability) => ability.ability.name);
    }

    function filterPokemonList(pokemonList, filters) {
        // Filter out any nulls
        let validPokemon = pokemonList.filter((pokemon) => pokemon[0] && pokemon[1]);

        if (filters.excludeLegendaries) {
            validPokemon = validPokemon.filter((pokemon) => (!pokemon[1].is_legendary && !pokemon[1].is_mythical));
        }

        if (filters.babyOnly) {
            validPokemon = validPokemon.filter((pokemon) => pokemon[1].is_baby);
        }

        if (filters.typeSpecialist) {
            validPokemon = validPokemon.filter((pokemon) => {
                const types = getTypeNames(pokemon);
                return types.includes(filters.typeSpecialist);
            });
        }

        return validPokemon;
    }

    function pickSix(arr) {
        const selected = new Set();

        for (let i = 0; i < Math.min(arr.length, 6); i++) {
            let choice = randomChoice(arr);

            while (selected.has(choice)) {
                choice = randomChoice(arr);
            }

            selected.add(choice);
        }

        return [ ...selected ];
    }

    function renderPokemon(pokemonList) {
        const container = document.getElementById('selected-pokemon');

        if (!pokemonList.length) {
            const emptyMsg = document.createElement('p');
            emptyMsg.classList.add('pokemon-empty');
            emptyMsg.innerText = 'No pokemon matched your criteria.';
            container.append(emptyMsg);
        } else {
            pokemonList.forEach((pokemon) => {
                const pokemonCard = document.createElement('article');
                pokemonCard.classList.add('pokemon');

                const sprite = document.createElement('img');
                sprite.setAttribute('alt', pokemon[0].name);
                sprite.setAttribute('src', pokemon[0].sprites.front_default);
                sprite.classList.add('pokemon-sprite');
                pokemonCard.append(sprite);

                const name = document.createElement('h2');
                name.classList.add('pokemon-name');
                name.innerText = pokemon[0].name;
                pokemonCard.append(name);

                const type = document.createElement('p');
                type.classList.add('pokemon-type');
                type.innerText = getTypeNames(pokemon).join(', ');
                pokemonCard.append(type);

                const ability = document.createElement('p');
                ability.classList.add('pokemon-ability');
                ability.innerText = getAbilityNames(pokemon).join(', ');
                pokemonCard.append(ability);

                container.append(pokemonCard);
            });
        }
    }

    function clearPokemon() {
        const container = document.getElementById('selected-pokemon');
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    function onFormSubmit(e) {
        e.preventDefault();

        setLoading();
        clearPokemon();

        // Get the list of Pokemon details
        getPokemonList()
            .then((pokemonList) => {
                cachedPokemon = pokemonList;
                const filters = getFormValues();
                const validPokemonList = filterPokemonList(pokemonList, filters);
                const selectedPokemon = pickSix(validPokemonList);
                renderPokemon(selectedPokemon);
                unsetLoading();
            });
    }

    function attachFormSubmitListener() {
        const form = document.getElementById('pokemon-selector');
        form.addEventListener('submit', onFormSubmit);
    }

    function main() {
        attachVisibilityToggleListeners();
        attachFormSubmitListener();
    }

    ready(main());
})();
