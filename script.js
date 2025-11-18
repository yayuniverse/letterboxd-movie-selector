// State variables
let allMovies = [];
let remainingMovies = [];
let pickedHistory = [];

// LocalStorage key
const STORAGE_KEY = 'randomMoviePickerState';

// DOM elements
const csvFileInput = document.getElementById('csvFileInput');
const loadButton = document.getElementById('loadButton');
const pickButton = document.getElementById('pickButton');
const statusText = document.getElementById('statusText');
const currentSelection = document.getElementById('currentSelection');
const letterboxdLink = document.getElementById('letterboxdLink');
const historyList = document.getElementById('historyList');

// Initialize on page load
function init() {
    // Try to restore state from localStorage
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);

        if (storedData) {
            const state = JSON.parse(storedData);

            // Validate structure
            if (state &&
                Array.isArray(state.allMovies) &&
                Array.isArray(state.remainingMovies) &&
                Array.isArray(state.pickedHistory) &&
                state.allMovies.every(item => typeof item === 'object' && item.name)) {

                if (state.allMovies.length > 0) {
                    // Restore state
                    allMovies = state.allMovies;
                    remainingMovies = state.remainingMovies;
                    pickedHistory = state.pickedHistory;

                    // Update UI
                    pickButton.disabled = false;
                    statusText.textContent = `Loaded ${allMovies.length} movies from previous session.`;

                    // Show most recent selection if any
                    if (pickedHistory.length > 0) {
                        displayCurrentMovie(pickedHistory[pickedHistory.length - 1]);
                    }

                    renderHistory();
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
    pickedHistory = [];
    pickButton.disabled = true;
    statusText.textContent = 'No watchlist loaded';
}

// Save state to localStorage
function saveState() {
    const state = {
        allMovies,
        remainingMovies,
        pickedHistory
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Load CSV file
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
                pickedHistory = [];

                // Update UI
                statusText.textContent = `Loaded ${movies.length} movies from ${file.name}`;
                currentSelection.textContent = '';
                letterboxdLink.style.display = 'none';
                historyList.innerHTML = '';
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
        pickedHistory = [];
        historyList.innerHTML = '';
    }

    // Select random movie
    const index = Math.floor(Math.random() * remainingMovies.length);
    const selectedMovie = remainingMovies[index];

    // Update state
    remainingMovies.splice(index, 1);
    pickedHistory.push(selectedMovie);

    // Update UI
    displayCurrentMovie(selectedMovie);
    renderHistory();

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

// Render history list
function renderHistory() {
    historyList.innerHTML = '';

    // Show history from oldest to newest
    pickedHistory.forEach(movie => {
        const div = document.createElement('div');
        let displayText = movie.name;
        if (movie.year) {
            displayText += ` (${movie.year})`;
        }
        div.textContent = displayText;
        historyList.appendChild(div);
    });
}

// Event listeners
loadButton.addEventListener('click', loadCSV);
pickButton.addEventListener('click', pickRandomMovie);

// Initialize on page load
init();
