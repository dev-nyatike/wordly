
// Select HTML elements
const searchForm = document.getElementById("search-form");
const wordInput = document.getElementById("word-input");
const results = document.getElementById("results");
const statusMessage = document.getElementById("status");
const favoritesList = document.getElementById("favorites-list");
const themeToggle = document.getElementById("theme-toggle");
const searchButton = document.getElementById("search-button");

// Load saved favorites from localStorage
let favorites = [];

try {
    const storedFavorites = JSON.parse(
        localStorage.getItem("wordlyFavorites") || "[]"
    );

    if (Array.isArray(storedFavorites)) {
        favorites = storedFavorites.filter(
            word => typeof word === "string"
        );
    }
} catch (error) {
    favorites = [];
}

// Keep track of the word currently displayed
let currentWord = "";

// Save favorites in the browser
function saveFavorites() {
    localStorage.setItem(
        "wordlyFavorites",
        JSON.stringify(favorites)
    );
}

// Helper function to create safe HTML elements
function createElement(tag, text, className = "") {
    const element = document.createElement(tag);

    element.textContent = text;

    if (className) {
        element.className = className;
    }

    return element;
}

// Search for a word using the Free Dictionary API
async function searchWord(word) {
    const cleanWord = word.trim();

    if (!cleanWord) {
        statusMessage.textContent = "Please enter a word.";
        return;
    }

    statusMessage.textContent = "Searching...";
    results.replaceChildren();
    searchButton.disabled = true;

    try {
        const url =
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`;

        const response = await fetch(url);

        if (response.status === 404) {
            throw new Error("Word not found. Check the spelling and try again.");
        }

        if (!response.ok) {
            throw new Error("Something went wrong. Please try again.");
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("No definition was found for this word.");
        }

        currentWord = data[0].word || cleanWord;

        displayWord(data[0]);

        statusMessage.textContent = "";

    } catch (error) {
        results.replaceChildren();

        statusMessage.textContent = error.message.includes("Failed to fetch")
            ? "Network error. Check your internet connection and try again."
            : error.message;

    } finally {
        searchButton.disabled = false;
    }
}

// Display word information
function displayWord(entry) {
    results.replaceChildren();

    const card = createElement("article", "", "definition-card");

    const heading = createElement("h2", entry.word);
    card.appendChild(heading);

    // Find pronunciation
    const phoneticText =
        entry.phonetic ||
        entry.phonetics?.find(item => item.text)?.text ||
        "Pronunciation unavailable";

    const phonetic = createElement(
        "p",
        phoneticText,
        "phonetic"
    );

    card.appendChild(phonetic);

    // Favorite button
    const favoriteButton = createElement(
        "button",
        "",
        "favorite-button"
    );

    updateFavoriteButton(favoriteButton);

    favoriteButton.addEventListener("click", () => {
        toggleFavorite(entry.word);
        updateFavoriteButton(favoriteButton);
    });

    card.appendChild(favoriteButton);

    // Display meanings and definitions
    entry.meanings.forEach(meaning => {
        const meaningSection = createElement(
            "div",
            "",
            "meaning"
        );

        const partOfSpeech = createElement(
            "h3",
            meaning.partOfSpeech
        );

        meaningSection.appendChild(partOfSpeech);

        const definitionList = document.createElement("ol");

        meaning.definitions.forEach(definition => {
            const item = document.createElement("li");

            item.appendChild(
                createElement("p", definition.definition)
            );

            if (definition.example) {
                const example = createElement(
                    "p",
                    `Example: "${definition.example}"`
                );

                item.appendChild(example);
            }

            definitionList.appendChild(item);
        });

        meaningSection.appendChild(definitionList);

        // Display synonyms
        const synonyms = [
            ...(meaning.synonyms || []),
            ...meaning.definitions.flatMap(
                definition => definition.synonyms || []
            )
        ];

        const uniqueSynonyms = [...new Set(synonyms)];

        if (uniqueSynonyms.length > 0) {
            const synonymText = createElement(
                "p",
                `Synonyms: ${uniqueSynonyms.join(", ")}`
            );

            meaningSection.appendChild(synonymText);
        }

        card.appendChild(meaningSection);
    });

    // Display source links
    if (entry.sourceUrls && entry.sourceUrls.length > 0) {
        const sourceHeading = createElement("h3", "Sources");
        card.appendChild(sourceHeading);

        entry.sourceUrls.forEach(source => {
            const link = document.createElement("a");

            link.href = source;
            link.textContent = source;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            card.appendChild(link);
            card.appendChild(document.createElement("br"));
        });
    }

    results.appendChild(card);
}

// Update favorite button text
function updateFavoriteButton(button) {
    const isSaved = favorites.some(
        word => word.toLowerCase() === currentWord.toLowerCase()
    );

    button.textContent = isSaved
        ? "★ Remove from Favorites"
        : "☆ Save to Favorites";

    button.classList.toggle("saved", isSaved);
}

// Add or remove a favorite word
function toggleFavorite(word) {
    const existingIndex = favorites.findIndex(
        item => item.toLowerCase() === word.toLowerCase()
    );

    if (existingIndex >= 0) {
        favorites.splice(existingIndex, 1);
    } else {
        favorites.push(word);
    }

    saveFavorites();
    renderFavorites();
}

// Display saved words
function renderFavorites() {
    favoritesList.replaceChildren();

    if (favorites.length === 0) {
        favoritesList.appendChild(
            createElement(
                "li",
                "You have not saved any words yet.",
                "empty-favorites"
            )
        );

        return;
    }

    favorites.forEach(word => {
        const listItem = document.createElement("li");

        // Click a saved word to search for it again
        const wordButton = createElement(
            "button",
            word,
            "favorite-word"
        );

        wordButton.addEventListener("click", () => {
            wordInput.value = word;
            searchWord(word);
        });

        // Remove a saved word
        const removeButton = createElement(
            "button",
            "Remove",
            "remove-favorite"
        );

        removeButton.addEventListener("click", () => {
            favorites = favorites.filter(
                item => item.toLowerCase() !== word.toLowerCase()
            );

            saveFavorites();
            renderFavorites();

            if (
                currentWord &&
                currentWord.toLowerCase() === word.toLowerCase()
            ) {
                const favoriteButton =
                    results.querySelector(".favorite-button");

                if (favoriteButton) {
                    updateFavoriteButton(favoriteButton);
                }
            }
        });

        listItem.appendChild(wordButton);
        listItem.appendChild(removeButton);

        favoritesList.appendChild(listItem);
    });
}

// Handle search form submission
searchForm.addEventListener("submit", event => {
    event.preventDefault();

    const word = wordInput.value.trim();

    searchWord(word);
});

// Toggle dark mode
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    const darkModeEnabled =
        document.body.classList.contains("dark-mode");

    localStorage.setItem(
        "wordlyDarkMode",
        darkModeEnabled
    );

    themeToggle.textContent = darkModeEnabled
        ? "☀️ Toggle Light Mode"
        : "🌙 Toggle Dark Mode";
});

// Restore the user's saved theme
const savedTheme = localStorage.getItem("wordlyDarkMode");

if (savedTheme === "true") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️ Toggle Light Mode";
}

// Display favorites when the page loads
renderFavorites();
