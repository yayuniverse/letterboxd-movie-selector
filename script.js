// State variables
let allMovies = [];
let remainingMovies = [];

// LocalStorage key
const STORAGE_KEY = 'randomMoviePickerState';

// DOM elements
const csvFileInput = document.getElementById('csvFileInput');
const loadButton = document.getElementById('loadButton');
const pickButton = document.getElementById('pickButton');
const statusText = document.getElementById('statusText');
const currentSelection = document.getElementById('currentSelection');
const letterboxdLink = document.getElementById('letterboxdLink');

// Initialize on page load
async function init() {
    // If running over http/https, try to auto-load CSV from repo
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        try {
            await loadCSVFromURL('./watchlist.csv');
            return; // Successfully loaded CSV from repo
        } catch (error) {
            // Failed to load CSV from repo, fall back to localStorage or default state
            console.log('Could not auto-load watchlist.csv, falling back to localStorage');
        }
    }

    // Try to restore state from localStorage
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);

        if (storedData) {
            const state = JSON.parse(storedData);

            // Validate structure
            if (state &&
                Array.isArray(state.allMovies) &&
                Array.isArray(state.remainingMovies) &&
                state.allMovies.every(item => typeof item === 'object' && item.name)) {

                if (state.allMovies.length > 0) {
                    // Restore state
                    allMovies = state.allMovies;
                    remainingMovies = state.remainingMovies;

                    // Update UI
                    pickButton.disabled = false;
                    statusText.textContent = `Loaded ${allMovies.length} movies from previous session.`;

                    return;
                }
            }

            // If we get here, data was invalid
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch (error) {
        // If parsing fails, clear storage
        localStorage.removeItem(STORAGE_KEY);
    }

    // Default state
    allMovies = [];
    remainingMovies = [];
    pickButton.disabled = true;
    statusText.textContent = 'No watchlist loaded';
}

// Save state to localStorage
function saveState() {
    const state = {
        allMovies,
        remainingMovies
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Load CSV from URL (for auto-loading from repo)
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
                            // Check if Name column exists
                            if (results.data.length === 0 || !results.data[0].hasOwnProperty('Name')) {
                                reject(new Error('No valid movies found in CSV. Make sure there is a "Name" column.'));
                                return;
                            }

                            // Extract movie data (same logic as manual upload)
                            const movies = results.data
                                .map(row => {
                                    const name = row.Name ? row.Name.trim() : '';
                                    if (!name) return null;

                                    return {
                                        name: name,
                                        year: row.Year ? row.Year.trim() : '',
                                        letterboxdUri: row['Letterboxd URI'] ? row['Letterboxd URI'].trim() : ''
                                    };
                                })
                                .filter(movie => movie !== null);

                            if (movies.length === 0) {
                                reject(new Error('No valid movies found in CSV'));
                                return;
                            }

                            // Update state
                            allMovies = movies;
                            remainingMovies = [...allMovies];

                            // Update UI
                            statusText.textContent = `Loaded ${movies.length} movies from watchlist`;
                            currentSelection.textContent = '';
                            letterboxdLink.style.display = 'none';
                            pickButton.disabled = false;

                            // Save to localStorage
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

// Load CSV file (manual upload)
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
                // Check if Name column exists
                if (results.data.length === 0 || !results.data[0].hasOwnProperty('Name')) {
                    statusText.textContent = 'No valid movies found in CSV. Make sure there is a "Name" column.';
                    pickButton.disabled = true;
                    return;
                }

                // Extract movie data
                const movies = results.data
                    .map(row => {
                        const name = row.Name ? row.Name.trim() : '';
                        if (!name) return null;

                        return {
                            name: name,
                            year: row.Year ? row.Year.trim() : '',
                            letterboxdUri: row['Letterboxd URI'] ? row['Letterboxd URI'].trim() : ''
                        };
                    })
                    .filter(movie => movie !== null);

                if (movies.length === 0) {
                    statusText.textContent = 'No valid movies found in CSV';
                    pickButton.disabled = true;
                    return;
                }

                // Update state
                allMovies = movies;
                remainingMovies = [...allMovies];

                // Update UI
                statusText.textContent = `Loaded ${movies.length} movies from ${file.name}`;
                currentSelection.textContent = '';
                letterboxdLink.style.display = 'none';
                pickButton.disabled = false;

                // Save to localStorage
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

// Pick random movie
function pickRandomMovie() {
    if (allMovies.length === 0) {
        return;
    }

    // Reset if all movies have been picked
    if (remainingMovies.length === 0) {
        remainingMovies = [...allMovies];
    }

    // Select random movie
    const index = Math.floor(Math.random() * remainingMovies.length);
    const selectedMovie = remainingMovies[index];

    // Update state
    remainingMovies.splice(index, 1);

    // Update UI
    displayCurrentMovie(selectedMovie);

    // Save to localStorage
    saveState();
}

// Display current movie with name, year, and Letterboxd link
function displayCurrentMovie(movie) {
    let displayText = movie.name;
    if (movie.year) {
        displayText += ` (${movie.year})`;
    }
    currentSelection.textContent = displayText;

    // Show or hide Letterboxd link
    if (movie.letterboxdUri) {
        letterboxdLink.href = movie.letterboxdUri;
        letterboxdLink.style.display = 'inline-block';
    } else {
        letterboxdLink.style.display = 'none';
    }
}

// Event listeners
loadButton.addEventListener('click', loadCSV);
pickButton.addEventListener('click', pickRandomMovie);

// Initialize on page load
init();
