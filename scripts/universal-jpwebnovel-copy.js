// ==UserScript==
// @name         Universal JP RAW Novel Chapter Copy with Advanced Bookmark Management
// @namespace    DA
// @version      3.3
// @description  Copy chapter content and manage bookmarks with advanced features including search, filtering by website, sorting, custom titles, undo delete, favorites, extended export/import functionality, and website favicons. Improved UI/UX for bookmark view and settings panel.
// @author       DA
// @license      GNU AGPLv3
// @match        https://kakuyomu.jp/works/*/episodes/*
// @match        https://syosetu.org/novel/*/*.html
// @match        https://*.syosetu.com/n*/*/
// @exclude      https://*.syosetu.com/novelreview/*
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    const BOOKMARKS_KEY = 'userBookmarks';
    const FAVORITE_BOOKMARKS_KEY = 'favoriteBookmarks';
    const SETTINGS_KEY = 'bookmarkSettings';
    let isTableView = false;
    let showOnlyFavorites = false;
    let searchQuery = '';
    let filterWebsite = '';
    let lastDeletedBookmark = null;

    const siteConfigs = [
        {
            urlPattern: /https:\/\/kakuyomu\.jp\/works\/.*\/episodes\/.*/,
            settings: {
                chapterContentSelector: "#contentMain",
                previousPageSelector: '[data-link-click-action-name="WorksEpisodesEpisodeHeaderPreviousEpisode"]',
                nextPageSelector: '#contentMain-readNextEpisode'
            }
        },
        {
            urlPattern: /https:\/\/syosetu\.org\/novel\/.*\/.*/,
            settings: {
                chapterContentSelector: ".ss",
                previousPageSelector: 'li.novelnb a',
                nextPageSelector: 'li.novelnb a.next_page_link',
                tableOfContentsSelector: 'li.novelmokuzi a'
            }
        },
        {
            urlPattern: /https:\/\/.*\.syosetu\.com\/.*\/.*/,
            settings: {
                chapterContentSelector: "#novel_contents",
                previousPageText: '前へ',
                nextPageText: '次へ'
            }
        }
    ];

    const currentSiteConfig = siteConfigs.find(config => config.urlPattern.test(window.location.href));

    if (!currentSiteConfig) {
        console.log("This script is not applicable to the current site.");
        return;
    }

    const { chapterContentSelector, previousPageSelector, nextPageSelector, previousPageText, nextPageText } = currentSiteConfig.settings;

    const observer = new MutationObserver(handlePageChanges);
    observer.observe(document.body, { childList: true, subtree: true });

    createNavigationButtons();
    createPanelsContainer();
    createBookmarkInterface();
    createSettingsPanel();

    function handlePageChanges() {
        console.log("Page has changed");
    }

    function createButton(icon, text, clickAction, additionalClass = "") {
        const button = document.createElement("button");
        button.className = `nav-button ${additionalClass}`;

        const iconElement = document.createElement("span");
        iconElement.innerHTML = icon;
        iconElement.className = "button-icon";
        button.appendChild(iconElement);

        if (text) {
            const textNode = document.createTextNode(text);
            textNode.className = "button-text";
            button.appendChild(textNode);
        }

        button.addEventListener("click", () => {
            console.log(`${text || 'Icon'} button clicked.`);
            clickAction(button);
        });

        return button;
    }

    function createNavigationButtons() {
        const buttonContainer = document.createElement("div");
        buttonContainer.className = "button-container";

        const previousButton = createButton("&#9664;", "Prev", goToPreviousChapter);
        const copyButton = createButton("&#128203;", "Copy", copyToClipboard);
        const nextButton = createButton("&#9654;", "Next", goToNextChapter);
        const bookmarkButton = createButton("&#9733;", "Bookmark", bookmarkChapter);
        const viewBookmarksButton = createButton("&#128065;", "View", toggleBookmarkPanel);
        const settingsButton = createButton("&#9881;", "Settings", toggleSettingsPanel);

        buttonContainer.append(previousButton, copyButton, nextButton, bookmarkButton, viewBookmarksButton, settingsButton);
        document.body.appendChild(buttonContainer);

        const style = document.createElement('style');
        style.textContent = `
            .button-container {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 8px;
                z-index: 1000;
                padding: 8px;
                background-color: rgba(255, 255, 255, 0.9);
                border-radius: 12px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }

            .nav-button {
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 8px 12px;
                font-size: 14px;
                cursor: pointer;
                transition: background-color 0.3s ease, transform 0.2s ease;
                min-width: 100px;
                height: 40px; /* Consistent height for all buttons */
            }

            .nav-button:hover {
                background-color: #45a049;
            }

            .nav-button:active {
                transform: scale(0.95);
            }

            .nav-button .button-icon {
                margin-right: 6px;
                font-size: 16px;
            }

            .nav-button .button-text {
                font-size: 14px;
            }

            @media (max-width: 600px) {
                .nav-button {
                    padding: 6px 10px;
                    font-size: 12px;
                    min-width: 80px;
                }

                .button-container {
                    flex-direction: column;
                }
            }

            .panels-container {
                position: fixed;
                top: 60px;
                right: 20px;
                display: flex;
                gap: 20px;
                z-index: 1001;
            }

            #bookmarkPanel, #settingsPanel {
                width: 300px;
                max-height: 80vh;
                overflow-y: auto;
                background-color: white;
                border: 1px solid #ccc;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
                padding: 15px;
                border-radius: 8px;
                display: none; /* Hidden by default */
            }

            #bookmarkPanel ul, #settingsPanel ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            #bookmarkPanel table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
            }

            #bookmarkPanel th, #bookmarkPanel td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }

            #bookmarkPanel th {
                background-color: #f2f2f2;
                font-weight: bold;
            }

            #bookmarkPanel .table-row:hover {
                background-color: #f0f0f0;
            }

            .bookmark-counter {
                margin-top: 10px;
                font-weight: bold;
                text-align: right;
            }

            .bookmark-number {
                font-weight: bold;
                margin-right: 10px;
            }

            .action-buttons {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .action-button {
                background: none;
                border: none;
                cursor: pointer;
                color: #777;
                font-size: 16px;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.3s ease, color 0.3s ease;
            }

            .action-button:hover {
                background-color: #e0e0e0;
                color: #333;
            }

            .action-button .icon {
                font-size: 16px;
            }

            .action-button .text {
                display: none; /* Hide text to make buttons compact */
            }

                        .toggle-view-button {
                margin-top: 10px;
                padding: 8px 12px;
                background-color: #2196F3;
                border: none;
                color: white;
                cursor: pointer;
                border-radius: 5px;
                transition: background-color 0.3s ease;
                width: 100%;
                text-align: center;
            }

            .toggle-view-button:hover {
                background-color: #1976D2;
            }

            .toggle-favorites-button {
                margin-top: 10px;
                padding: 8px 12px;
                background-color: #FFC107;
                border: none;
                color: white;
                cursor: pointer;
                border-radius: 5px;
                transition: background-color 0.3s ease;
                width: 100%;
                text-align: center;
            }

            .toggle-favorites-button:hover {
                background-color: #FFA000;
            }

            .undo-delete-button {
                margin-top: 10px;
                padding: 8px 12px;
                background-color: #f44336;
                border: none;
                color: white;
                cursor: pointer;
                border-radius: 5px;
                transition: background-color 0.3s ease;
                width: 100%;
                text-align: center;
            }

            .undo-delete-button:hover {
                background-color: #d32f2f;
            }

            #settingsPanel button {
                width: 100%;
                padding: 8px 12px;
                background-color: #2196F3;
                border: none;
                color: white;
                cursor: pointer;
                border-radius: 5px;
                margin-bottom: 10px; /* Space between buttons */
                transition: background-color 0.3s ease;
                text-align: center;
            }

            #settingsPanel button:hover {
                background-color: #1976D2;
            }

            #exportButton {
                background-color: #FF9800;
            }

            #exportButton:hover {
                background-color: #F57C00;
            }

            #importButton {
                background-color: #4CAF50;
            }

            #importButton:hover {
                background-color: #388E3C;
            }

            #clearBookmarksButton {
                background-color: #f44336;
            }

            #clearBookmarksButton:hover {
                background-color: #d32f2f;
            }

            #settingsPanel input[type="file"] {
                display: none;
            }

            #settingsPanel label {
                background-color: #4CAF50;
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                cursor: pointer;
                transition: background-color 0.3s ease;
                display: block;
                text-align: center;
                margin-bottom: 10px;
            }

            #settingsPanel label:hover {
                background-color: #388E3C;
            }

            .search-bar {
                width: 100%;
                padding: 8px 12px;
                margin-bottom: 10px;
                border-radius: 5px;
                border: 1px solid #ccc;
                font-size: 14px;
            }

            .sort-select, .filter-select {
                width: 100%;
                padding: 8px 12px;
                margin-bottom: 10px;
                border-radius: 5px;
                border: 1px solid #ccc;
                font-size: 14px;
            }

            .favicon {
                width: 16px;
                height: 16px;
                margin-right: 6px;
                vertical-align: middle;
            }

            .bookmark-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid #ddd;
                transition: background-color 0.3s ease;
            }

            .bookmark-item:hover {
                background-color: #f9f9f9;
            }

            .bookmark-title {
                flex-grow: 1;
                margin-left: 10px;
                font-size: 14px;
                color: #333;
                text-decoration: none;
            }
        `;
        document.head.append(style);
    }

    function createPanelsContainer() {
        const panelsContainer = document.createElement("div");
        panelsContainer.className = "panels-container";

        const settingsPanel = document.createElement("div");
        settingsPanel.id = "settingsPanel";

        const bookmarkPanel = document.createElement("div");
        bookmarkPanel.id = "bookmarkPanel";

        panelsContainer.appendChild(settingsPanel);
        panelsContainer.appendChild(bookmarkPanel);

        document.body.appendChild(panelsContainer);
    }

    function createBookmarkInterface() {
        const bookmarkPanel = document.getElementById("bookmarkPanel");

        const title = document.createElement("h3");
        title.textContent = "Bookmarks";
        title.style.marginTop = "0";
        bookmarkPanel.appendChild(title);

        const searchBar = document.createElement("input");
        searchBar.type = "text";
        searchBar.className = "search-bar";
        searchBar.placeholder = "Search bookmarks...";
        searchBar.addEventListener("input", (e) => {
            searchQuery = e.target.value.toLowerCase();
            updateBookmarkList();
        });
        bookmarkPanel.appendChild(searchBar);

        const sortSelect = document.createElement("select");
        sortSelect.className = "sort-select";
        sortSelect.innerHTML = `
            <option value="default">Sort by...</option>
            <option value="title">Title</option>
            <option value="date">Date Added</option>
        `;
        sortSelect.addEventListener("change", updateBookmarkList);
        bookmarkPanel.appendChild(sortSelect);

        const filterSelect = document.createElement("select");
        filterSelect.className = "filter-select";
        filterSelect.innerHTML = `
            <option value="">Filter by Website...</option>
        `;
        filterSelect.addEventListener("change", (e) => {
            filterWebsite = e.target.value;
            updateBookmarkList();
        });
        bookmarkPanel.appendChild(filterSelect);

        const toggleViewButton = document.createElement("button");
        toggleViewButton.textContent = "Switch to Table View";
        toggleViewButton.className = "toggle-view-button";
        toggleViewButton.addEventListener("click", toggleView);
        bookmarkPanel.appendChild(toggleViewButton);

        const toggleFavoritesButton = document.createElement("button");
        toggleFavoritesButton.textContent = "Show Only Favorites";
        toggleFavoritesButton.className = "toggle-favorites-button";
        toggleFavoritesButton.addEventListener("click", toggleFavorites);
        bookmarkPanel.appendChild(toggleFavoritesButton);

        const bookmarkList = document.createElement("ul");
        bookmarkList.style.display = "block"; // List view by default
        bookmarkPanel.appendChild(bookmarkList);

        const bookmarkTable = document.createElement("table");
        bookmarkTable.style.display = "none"; // Hidden by default
        bookmarkPanel.appendChild(bookmarkTable);

        const bookmarkCounter = document.createElement("div");
        bookmarkCounter.className = "bookmark-counter";
        bookmarkPanel.appendChild(bookmarkCounter);

        const undoDeleteButton = document.createElement("button");
        undoDeleteButton.textContent = "Undo Delete";
        undoDeleteButton.className = "undo-delete-button";
        undoDeleteButton.addEventListener("click", undoDeleteBookmark);
        bookmarkPanel.appendChild(undoDeleteButton);

        populateFilterOptions(); // Populate the website filter options
        updateBookmarkList();
    }

    function populateFilterOptions() {
        const bookmarks = getBookmarks();
        const filterSelect = document.querySelector(".filter-select");
        const websites = [...new Set(bookmarks.map(bookmark => new URL(bookmark.url).hostname))];

        websites.forEach(website => {
            const option = document.createElement("option");
            option.value = website;
            option.textContent = website;
            filterSelect.appendChild(option);
        });
    }

    function toggleView() {
        isTableView = !isTableView;
        updateBookmarkList();
    }

    function toggleFavorites() {
        showOnlyFavorites = !showOnlyFavorites;
        updateBookmarkList();
    }

    function toggleBookmarkPanel() {
        const bookmarkPanel = document.getElementById("bookmarkPanel");
        bookmarkPanel.style.display = (bookmarkPanel.style.display === "none" || bookmarkPanel.style.display === "") ? "block" : "none";
    }

    function updateBookmarkList() {
        const bookmarks = getFilteredAndSortedBookmarks();
        const bookmarkList = document.querySelector("#bookmarkPanel ul");
        const bookmarkTable = document.querySelector("#bookmarkPanel table");
        const bookmarkCounter = document.querySelector(".bookmark-counter");
        bookmarkList.innerHTML = "";
        bookmarkTable.innerHTML = "";

        if (isTableView) {
            bookmarkList.style.display = "none";
            bookmarkTable.style.display = "table";
            createBookmarkTable(bookmarks, bookmarkTable);
            document.querySelector(".toggle-view-button").textContent = "Switch to List View";
        } else {
            bookmarkList.style.display = "block";
            bookmarkTable.style.display = "none";
            createBookmarkList(bookmarks, bookmarkList);
            document.querySelector(".toggle-view-button").textContent = "Switch to Table View";
        }

        // Update the bookmark counter
        bookmarkCounter.textContent = `Total Bookmarks: ${bookmarks.length}`;
    }

    function getFilteredAndSortedBookmarks() {
        let bookmarks = getBookmarks();

        // Filter by search query
        if (searchQuery) {
            bookmarks = bookmarks.filter(bookmark => bookmark.title.toLowerCase().includes(searchQuery));
        }

        // Filter by website
        if (filterWebsite) {
            bookmarks = bookmarks.filter(bookmark => new URL(bookmark.url).hostname === filterWebsite);
        }

        // Show only favorites if toggled
        if (showOnlyFavorites) {
            const favorites = getFavoriteBookmarks();
            bookmarks = bookmarks.filter(bookmark => favorites.includes(bookmark.url));
        }

        // Sort bookmarks
        const sortSelect = document.querySelector(".sort-select").value;
        switch (sortSelect) {
            case "title":
                bookmarks.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case "date":
                bookmarks.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
                break;
        }

        return bookmarks;
    }

    function createBookmarkList(bookmarks, bookmarkList) {
        bookmarks.forEach((bookmark, index) => {
            const listItem = document.createElement("li");
            listItem.className = "bookmark-item";

            const number = document.createElement("span");
            number.textContent = `${index + 1}.`;
            number.className = "bookmark-number";
            listItem.appendChild(number);

            const favicon = document.createElement("img");
            favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}`;
            favicon.className = "favicon";
            listItem.appendChild(favicon);

            const link = document.createElement("a");
            link.textContent = bookmark.title || "Untitled Chapter";
            link.href = bookmark.url;
            link.className = "bookmark-title";
            link.addEventListener("click", (e) => {
                e.preventDefault();
                window.location.href = bookmark.url;
            });
            listItem.appendChild(link);

            const actionButtons = document.createElement("div");
            actionButtons.className = "action-buttons";

            const favoriteBtn = document.createElement("button");
            favoriteBtn.innerHTML = "&#9733;"; // Star icon
            favoriteBtn.className = "action-button";
            favoriteBtn.title = "Favorite";
            favoriteBtn.addEventListener("click", () => {
                toggleFavoriteBookmark(bookmark.url);
            });
            actionButtons.appendChild(favoriteBtn);

            const editBtn = document.createElement("button");
            editBtn.innerHTML = "&#9998;"; // Pencil icon
            editBtn.className = "action-button";
            editBtn.title = "Rename";
            editBtn.addEventListener("click", () => {
                editBookmarkTitle(bookmark.url);
            });
            actionButtons.appendChild(editBtn);

            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = "&#128465;"; // Trash can icon
            deleteBtn.className = "action-button";
            deleteBtn.title = "Delete";
            deleteBtn.addEventListener("click", () => {
                removeBookmark(bookmark.url);
            });
            actionButtons.appendChild(deleteBtn);

            listItem.appendChild(actionButtons);
            bookmarkList.appendChild(listItem);
        });
    }

    function createBookmarkTable(bookmarks, bookmarkTable) {
        const headerRow = document.createElement("tr");

        const headerIndex = document.createElement("th");
        headerIndex.textContent = "#";
        headerRow.appendChild(headerIndex);

        const headerTitle = document.createElement("th");
        headerTitle.textContent = "Title";
        headerRow.appendChild(headerTitle);

        const headerActions = document.createElement("th");
        headerActions.textContent = "Actions";
        headerRow.appendChild(headerActions);

        bookmarkTable.appendChild(headerRow);

        bookmarks.forEach((bookmark, index) => {
            const row = document.createElement("tr");
            row.className = "table-row";

            const cellIndex = document.createElement("td");
            cellIndex.textContent = `${index + 1}`;
            row.appendChild(cellIndex);

            const cellTitle = document.createElement("td");

            const favicon = document.createElement("img");
            favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}`;
            favicon.className = "favicon";
            cellTitle.appendChild(favicon);

            const titleText = document.createTextNode((bookmark.title.length > 20) ? bookmark.title.substring(0, 20) + '...' : bookmark.title);
            cellTitle.appendChild(titleText);
            row.appendChild(cellTitle);

            const cellActions = document.createElement("td");
            cellActions.className = "action-buttons";

            const favoriteBtn = document.createElement("button");
            favoriteBtn.innerHTML = "&#9733;"; // Star icon
            favoriteBtn.className = "action-button";
            favoriteBtn.title = "Favorite";
            favoriteBtn.addEventListener("click", () => {
                toggleFavoriteBookmark(bookmark.url);
            });

            const editBtn = document.createElement("button");
            editBtn.innerHTML = "&#9998;"; // Pencil icon
            editBtn.className = "action-button";
            editBtn.title = "Rename";
            editBtn.addEventListener("click", () => {
                editBookmarkTitle(bookmark.url);
            });

            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = "&#128465;"; // Trash can icon
            deleteBtn.className = "action-button";
            deleteBtn.title = "Delete";
            deleteBtn.addEventListener("click", () => {
                removeBookmark(bookmark.url);
            });

            cellActions.appendChild(favoriteBtn);
            cellActions.appendChild(editBtn);
            cellActions.appendChild(deleteBtn);
            row.appendChild(cellActions);

            bookmarkTable.appendChild(row);
        });
    }

    function getBookmarks() {
        const bookmarksJson = GM_getValue(BOOKMARKS_KEY, "[]");
        return JSON.parse(bookmarksJson);
    }

    function saveBookmarks(bookmarks) {
        GM_setValue(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    }

    function getFavoriteBookmarks() {
        const favoritesJson = GM_getValue(FAVORITE_BOOKMARKS_KEY, "[]");
        return JSON.parse(favoritesJson);
    }

    function saveFavoriteBookmarks(favorites) {
        GM_setValue(FAVORITE_BOOKMARKS_KEY, JSON.stringify(favorites));
    }

    function bookmarkChapter() {
        const chapterTitle = document.title;
        const chapterUrl = window.location.href;
        const bookmarks = getBookmarks();

        if (!bookmarks.some(bookmark => bookmark.url === chapterUrl)) {
            bookmarks.push({ title: chapterTitle, url: chapterUrl, dateAdded: new Date().toISOString() });
            saveBookmarks(bookmarks);
            alert("Chapter bookmarked!");
            updateBookmarkList();
        } else {
            alert("This chapter is already bookmarked.");
        }
    }

    function removeBookmark(url) {
        let bookmarks = getBookmarks();
        const bookmarkToRemove = bookmarks.find(bookmark => bookmark.url === url);
        lastDeletedBookmark = bookmarkToRemove; // Store for undo
        bookmarks = bookmarks.filter(bookmark => bookmark.url !== url);
        saveBookmarks(bookmarks);
        updateBookmarkList();
    }

    function undoDeleteBookmark() {
        if (lastDeletedBookmark) {
            const bookmarks = getBookmarks();
            bookmarks.push(lastDeletedBookmark);
            saveBookmarks(bookmarks);
            lastDeletedBookmark = null;
            updateBookmarkList();
        } else {
            alert("No bookmark to undo.");
        }
    }

    function toggleFavoriteBookmark(url) {
        let favorites = getFavoriteBookmarks();
        if (favorites.includes(url)) {
            favorites = favorites.filter(favUrl => favUrl !== url);
        } else {
            favorites.push(url);
        }
        saveFavoriteBookmarks(favorites);
        updateBookmarkList();
    }

    function editBookmarkTitle(url) {
        const bookmarks = getBookmarks();
        const bookmark = bookmarks.find(b => b.url === url);
        const newTitle = prompt("Enter a new title for this bookmark:", bookmark.title);
        if (newTitle) {
            bookmark.title = newTitle;
            saveBookmarks(bookmarks);
            updateBookmarkList();
        }
    }

    async function copyToClipboard(button) {
        console.log("Copy button clicked.");
        button.disabled = true;

        const chapterContainer = document.querySelector(chapterContentSelector);
        if (!chapterContainer) {
            console.log("Unable to find chapter content on this page.");
            button.disabled = false;
            return;
        }

        const chapterContent = chapterContainer.innerText.trim();
        try {
            await navigator.clipboard.writeText(chapterContent);
            console.log("Chapter content has been copied to clipboard.");
            button.style.backgroundColor = "#2196F3"; // Change button color to blue
            setTimeout(() => {
                button.style.backgroundColor = "#4CAF50";
            }, 1000);
        } catch (error) {
            console.log("Failed to copy chapter content:", error);
            alert("Failed to copy chapter content. Please try again.");
        } finally {
            button.disabled = false;
        }
    }

    function findLinkByText(text) {
        const links = document.querySelectorAll('a');
        for (let link of links) {
            if (link.textContent.includes(text)) {
                return link;
            }
        }
        return null;
    }

    function navigateToChapter(textSelector, fallbackSelector) {
        const pageLink = textSelector ? findLinkByText(textSelector) : document.querySelector(fallbackSelector);

        if (pageLink) {
            console.log(`Navigating to: ${pageLink.href}`);
            window.location = pageLink.href;
        } else {
            console.log("Unable to find chapter navigation link.");
        }
    }

    function goToPreviousChapter() {
        console.log("Previous Chapter button clicked.");
        navigateToChapter(previousPageText, previousPageSelector);
    }

    function goToNextChapter() {
        console.log("Next Chapter button clicked.");
        navigateToChapter(nextPageText, nextPageSelector);
    }

    function toggleSettingsPanel() {
        const settingsPanel = document.getElementById("settingsPanel");
        settingsPanel.style.display = (settingsPanel.style.display === "none" || settingsPanel.style.display === "") ? "block" : "none";
    }

    function createSettingsPanel() {
        const settingsPanel = document.getElementById("settingsPanel");

        const title = document.createElement("h3");
        title.textContent = "Settings";
        title.style.marginTop = "0";
        settingsPanel.appendChild(title);

        const exportButton = document.createElement("button");
        exportButton.id = "exportButton";
        exportButton.textContent = "Export Data";
        exportButton.addEventListener("click", exportBookmarksAndSettings);
        settingsPanel.appendChild(exportButton);

        const importLabel = document.createElement("label");
        importLabel.htmlFor = "importInput";
        importLabel.textContent = "Import Data";
        settingsPanel.appendChild(importLabel);

        const importInput = document.createElement("input");
        importInput.type = "file";
        importInput.id = "importInput";
        importInput.accept = ".json";
        importInput.addEventListener("change", importBookmarksAndSettings);
        settingsPanel.appendChild(importInput);

        const clearButton = document.createElement("button");
        clearButton.id = "clearBookmarksButton";
        clearButton.textContent = "Clear Bookmarks";
        clearButton.addEventListener("click", clearAllBookmarks);
        settingsPanel.appendChild(clearButton);
    }

    function exportBookmarksAndSettings() {
        const bookmarks = getBookmarks();
        const favorites = getFavoriteBookmarks();
        const settings = { isTableView, showOnlyFavorites, searchQuery, filterWebsite };
        const data = { bookmarks, favorites, settings };
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "bookmarks_and_settings.json";
        a.click();

        URL.revokeObjectURL(url);
    }

    function importBookmarksAndSettings(event) {
        const file = event.target.files[0];
        if (!file) {
            alert("No file selected.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (data.bookmarks && data.favorites && data.settings) {
                    saveBookmarks(data.bookmarks);
                    saveFavoriteBookmarks(data.favorites);
                    ({ isTableView, showOnlyFavorites, searchQuery, filterWebsite } = data.settings);
                    populateFilterOptions(); // Re-populate filter options after import
                    updateBookmarkList();
                    alert("Bookmarks and settings imported successfully!");
                } else {
                    throw new Error("Invalid format.");
                }
            } catch (error) {
                console.error("Failed to import bookmarks and settings:", error);
                alert("Failed to import bookmarks and settings. Please ensure the file is a valid JSON.");
            }
        };
        reader.readAsText(file);
    }

    function clearAllBookmarks() {
        if (confirm("Are you sure you want to clear all bookmarks? This action cannot be undone.")) {
            saveBookmarks([]);
            saveFavoriteBookmarks([]);
            updateBookmarkList();
            alert("All bookmarks have been cleared.");
        }
    }

})();

