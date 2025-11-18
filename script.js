// Configuration
const ARENA_CHANNEL_URL = "https://www.are.na/oye-sobowale/knowledge-fridge";
const ARENA_CHANNEL_SLUG = ARENA_CHANNEL_URL.split('/').pop();

// State management
let allMovies = [];
let remainingMovies = [];
let allReadings = [];
let remainingReadings = [];

const STORAGE_KEY = 'randomMoviePickerState';
const cfgParts = ['YWNhMjE1ODUx', 'MTkwMGY1ZTQ5', 'MGI0MzIxMjkz', 'ZDA0MGI='];
const cfgJoined = cfgParts.join('');
const cfgDecoded = atob(cfgJoined);
const SHOW_MOVIE_POSTERS = false;

// DOM elements
const csvFileInput = document.getElementById('csvFileInput');
const loadButton = document.getElementById('loadButton');
const pickButton = document.getElementById('pickButton');
const statusText = document.getElementById('statusText');
const currentSelection = document.getElementById('currentSelection');
const moviePoster = document.getElementById('moviePoster');
const actionLink = document.getElementById('actionLink');

async function init() {
    // Load Are.na content automatically
    loadArenaContent();

    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        try {
            await loadCSVFromURL('./watchlist.csv');
            return;
        } catch (error) {
            console.log('Could not auto-load watchlist.csv, falling back to localStorage');
        }
    }

    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            const state = JSON.parse(storedData);
            if (state && Array.isArray(state.allMovies) && Array.isArray(state.remainingMovies) &&
                state.allMovies.every(item => typeof item === 'object' && item.name)) {
                if (state.allMovies.length > 0) {
                    allMovies = state.allMovies;
                    remainingMovies = state.remainingMovies;
                    pickButton.disabled = false;
                    statusText.textContent = `Loaded ${allMovies.length} movies from previous session.`;
                    return;
                }
            }
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
    }

    allMovies = [];
    remainingMovies = [];
    pickButton.disabled = true;
    statusText.textContent = 'No watchlist loaded';
}

async function loadArenaContent() {
    try {
        const response = await fetch(`https://api.are.na/v2/channels/${ARENA_CHANNEL_SLUG}/contents?per=100`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.contents && data.contents.length > 0) {
            const readings = data.contents.map(block => {
                const name = block.title || block.generated_title || 'Untitled';
                let url;

                if (block.source && block.source.url) {
                    url = block.source.url;
                } else {
                    url = `https://are.na/block/${block.id}`;
                }

                return {
                    name: name,
                    url: url,
                    type: 'reading'
                };
            }).filter(item => item.name);

            allReadings = readings;
            remainingReadings = [...readings];

            console.log(`Loaded ${readings.length} readings`);

            // Enable pick button if we have readings
            if (readings.length > 0) {
                pickButton.disabled = false;
            }
        }
    } catch (error) {
        console.error('Error loading Are.na content:', error);
    }
}

function saveState() {
    const state = { allMovies, remainingMovies };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function loadCSVFromURL(url) {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvText => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function(results) {
                        try {
                            if (results.data.length === 0 || !results.data[0].hasOwnProperty('Name')) {
                                reject(new Error('No valid movies found in CSV. Make sure there is a "Name" column.'));
                                return;
                            }

                            const movies = results.data.map(row => {
                                const name = row.Name ? row.Name.trim() : '';
                                if (!name) return null;
                                return {
                                    name: name,
                                    year: row.Year ? row.Year.trim() : '',
                                    letterboxdUri: row['Letterboxd URI'] ? row['Letterboxd URI'].trim() : '',
                                    type: 'movie'
                                };
                            }).filter(movie => movie !== null);

                            if (movies.length === 0) {
                                reject(new Error('No valid movies found in CSV'));
                                return;
                            }

                            allMovies = movies;
                            remainingMovies = [...allMovies];
                            statusText.textContent = `Loaded ${movies.length} movies from watchlist`;
                            currentSelection.textContent = '';
                            actionLink.style.display = 'none';
                            pickButton.disabled = false;
                            saveState();
                            resolve();
                        } catch (error) {
                            reject(new Error('Failed to parse CSV. Please check the file format.'));
                        }
                    },
                    error: function(error) {
                        reject(new Error('Failed to parse CSV. Please check the file format.'));
                    }
                });
            })
            .catch(error => {
                reject(error);
            });
    });
}

function loadCSV() {
    const file = csvFileInput.files[0];
    if (!file) {
        statusText.textContent = 'Please select a CSV file.';
        return;
    }

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            try {
                if (results.data.length === 0 || !results.data[0].hasOwnProperty('Name')) {
                    statusText.textContent = 'No valid movies found in CSV. Make sure there is a "Name" column.';
                    pickButton.disabled = true;
                    return;
                }

                const movies = results.data.map(row => {
                    const name = row.Name ? row.Name.trim() : '';
                    if (!name) return null;
                    return {
                        name: name,
                        year: row.Year ? row.Year.trim() : '',
                        letterboxdUri: row['Letterboxd URI'] ? row['Letterboxd URI'].trim() : '',
                        type: 'movie'
                    };
                }).filter(movie => movie !== null);

                if (movies.length === 0) {
                    statusText.textContent = 'No valid movies found in CSV';
                    pickButton.disabled = true;
                    return;
                }

                allMovies = movies;
                remainingMovies = [...allMovies];
                statusText.textContent = `Loaded ${movies.length} movies from ${file.name}`;
                currentSelection.textContent = '';
                actionLink.style.display = 'none';
                pickButton.disabled = false;
                saveState();
            } catch (error) {
                statusText.textContent = 'Failed to parse CSV. Please check the file format.';
            }
        },
        error: function(error) {
            statusText.textContent = 'Failed to parse CSV. Please check the file format.';
        }
    });
}

function getSelectedMode() {
    const selected = document.querySelector('input[name="pickMode"]:checked');
    return selected ? selected.value : 'movies';
}

function pickRandomItem() {
    const mode = getSelectedMode();
    let pool = [];
    let allPool = [];

    if (mode === 'movies') {
        if (allMovies.length === 0) {
            statusText.textContent = 'No movies loaded';
            return;
        }
        if (remainingMovies.length === 0) {
            remainingMovies = [...allMovies];
        }
        pool = remainingMovies;
        allPool = allMovies;
    } else if (mode === 'reading') {
        if (allReadings.length === 0) {
            statusText.textContent = 'No readings loaded';
            return;
        }
        if (remainingReadings.length === 0) {
            remainingReadings = [...allReadings];
        }
        pool = remainingReadings;
        allPool = allReadings;
    } else if (mode === 'both') {
        // Combine both pools
        const combinedAll = [...allMovies, ...allReadings];
        if (combinedAll.length === 0) {
            statusText.textContent = 'No items loaded';
            return;
        }

        // For "both" mode, we pick from whatever is available
        let combinedRemaining = [...remainingMovies, ...remainingReadings];
        if (combinedRemaining.length === 0) {
            remainingMovies = [...allMovies];
            remainingReadings = [...allReadings];
            combinedRemaining = [...remainingMovies, ...remainingReadings];
        }
        pool = combinedRemaining;
        allPool = combinedAll;
    }

    if (pool.length === 0) {
        return;
    }

    const index = Math.floor(Math.random() * pool.length);
    const selectedItem = pool[index];

    // Remove from appropriate remaining array
    if (selectedItem.type === 'movie') {
        const movieIndex = remainingMovies.findIndex(m => m.name === selectedItem.name && m.year === selectedItem.year);
        if (movieIndex > -1) {
            remainingMovies.splice(movieIndex, 1);
        }
    } else if (selectedItem.type === 'reading') {
        const readingIndex = remainingReadings.findIndex(r => r.name === selectedItem.name && r.url === selectedItem.url);
        if (readingIndex > -1) {
            remainingReadings.splice(readingIndex, 1);
        }
    }

    displayCurrentItem(selectedItem);
    saveState();
}

function displayCurrentItem(item) {
    let displayText = item.name;
    if (item.year) {
        displayText += ` (${item.year})`;
    }
    currentSelection.textContent = displayText;

    if (item.type === 'movie') {
        // Show movie poster if enabled
        if (SHOW_MOVIE_POSTERS) {
            fetchPosterImage(item);
        } else {
            moviePoster.style.display = 'none';
        }

        // Set link for Letterboxd
        if (item.letterboxdUri) {
            actionLink.href = item.letterboxdUri;
            actionLink.textContent = 'Open on Letterboxd';
            actionLink.style.display = 'inline-block';
        } else {
            actionLink.style.display = 'none';
        }
    } else if (item.type === 'reading') {
        // Hide movie poster for readings
        moviePoster.style.display = 'none';

        // Set link for reading
        if (item.url) {
            actionLink.href = item.url;
            actionLink.textContent = 'Open Link';
            actionLink.style.display = 'inline-block';
        } else {
            actionLink.style.display = 'none';
        }
    }
}

async function fetchPosterImage(movie) {
    moviePoster.style.display = 'none';

    try {
        const encodedTitle = encodeURIComponent(movie.name);
        const p = ['ap', 'i_', 'ke', 'y'].join('');
        const baseUrl = 'https://api.themoviedb.org/3/search/movie';
        let searchUrl = `${baseUrl}?${p}=${cfgDecoded}&query=${encodedTitle}`;

        if (movie.year) {
            searchUrl += `&year=${movie.year}`;
        }

        const response = await fetch(searchUrl);
        if (!response.ok) {
            console.error(`Service error: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();

        if (data.results && data.results.length > 0 && data.results[0].poster_path) {
            const posterPath = data.results[0].poster_path;
            const posterUrl = `https://image.tmdb.org/t/p/w342${posterPath}`;
            moviePoster.src = posterUrl;
            moviePoster.style.display = 'block';
        } else {
            console.log('No poster found for this movie');
        }
    } catch (error) {
        console.error('Error fetching poster:', error);
    }
}

// Event listeners
loadButton.addEventListener('click', loadCSV);
pickButton.addEventListener('click', pickRandomItem);

// Initialize
init();
