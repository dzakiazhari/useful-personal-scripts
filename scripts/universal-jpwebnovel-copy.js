// ==UserScript==
// @name         Universal JP RAW Novel Chapter Copy with Advanced Bookmark Management (Redesigned)
// @namespace    DA
// @version      9.1
// @description  Copy chapter content and manage bookmarks with advanced features: redesigned UI, interactive tagging, advanced filtering, pagination, and improved layout. Now with status dropdown.
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
    const SETTINGS_KEY = 'userSettings';
    const STATUS_OPTIONS = ['Not Started', 'Reading', 'Completed', 'On Hold', 'Dropped'];
    let showOnlyFavorites = false;
    let searchQuery = '';
    let filterWebsite = '';
    let filterTags = [];
    let filterStatus = '';
    let currentPage = 1;
    let itemsPerPage = 5;
    let sortBy = 'dateAdded';
    let sortOrder = 'desc';

    const defaultSettings = {
        navButtonPosition: 'center' // 'left', 'center', or 'right'
    };

    let userSettings = GM_getValue(SETTINGS_KEY, defaultSettings);

    const siteConfigs = [{
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

    const {
        chapterContentSelector,
        previousPageSelector,
        nextPageSelector,
        previousPageText,
        nextPageText
    } = currentSiteConfig.settings;

    function createButton(icon, text, clickAction, additionalClass = "") {
        const button = document.createElement("button");
        button.className = `nav-button ${additionalClass}`;

        const iconElement = document.createElement("span");
        iconElement.innerHTML = icon;
        iconElement.className = "button-icon";
        button.appendChild(iconElement);

        if (text) {
            const textNode = document.createTextNode(text);
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
        buttonContainer.id = "navigationButtonContainer";

        const buttons = [{
                icon: "&#9664;",
                text: "Prev",
                action: goToPreviousChapter
            },
            {
                icon: "&#128203;",
                text: "Copy",
                action: copyToClipboard
            },
            {
                icon: "&#9654;",
                text: "Next",
                action: goToNextChapter
            },
            {
                icon: "&#9733;",
                text: "Bookmark",
                action: bookmarkChapter
            },
            {
                icon: "&#128065;",
                text: "View",
                action: toggleBookmarkPanel
            },
            {
                icon: "&#9881;",
                text: "Settings",
                action: toggleSettingsPanel
            }
        ];

        buttons.forEach(btn => {
            const button = createButton(btn.icon, btn.text, btn.action);
            buttonContainer.appendChild(button);
        });

        document.body.appendChild(buttonContainer);
        updateNavigationButtonPosition();

        const style = document.createElement('style');
        style.textContent = `
        /* General styles */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.5;
            color: #333;
        }

        /* Button container */
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
            padding: 10px;
            background-color: rgba(240, 240, 240, 0.8);
            backdrop-filter: blur(5px);
            border-radius: 25px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .nav-button {
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f0f0f0;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 20px;
            padding: 8px 12px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 80px;
            height: 36px;
        }

        .nav-button:hover {
            background-color: #e0e0e0;
            transform: translateY(-2px);
        }

        .nav-button:active {
            transform: scale(0.98);
        }

        .nav-button .button-icon {
            margin-right: 6px;
            font-size: 16px;
        }

        /* Panels container */
        .panels-container {
            position: fixed;
            top: 5%;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            justify-content: center;
            z-index: 1001;
            gap: 20px;
            width: 90%;
            max-width: 1200px;
        }

        #bookmarkPanel, #settingsPanel {
            background-color: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            padding: 25px;
            display: none;
            max-height: 80vh;
            overflow-y: auto;
        }

        #bookmarkPanel {
            width: 90%;
        }

        #settingsPanel {
            width: 25%;
        }

        /* Headings */
        h3 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #333;
        }

        /* Bookmark header */
        .bookmark-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .bookmark-stats {
            display: flex;
            gap: 15px;
        }

        .stat-item {
            background-color: #f5f5f7;
            border-radius: 10px;
            padding: 8px 15px;
            font-size: 14px;
            font-weight: 500;
        }

        /* Search and filter container */
        .search-filter-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 20px;
        }

        .search-bar, .filter-select, .tag-filter, .sort-select, .favorite-toggle {
            flex: 1;
            min-width: 150px;
            padding: 8px 12px;
            font-size: 14px;
            border: 1px solid #ccc;
            border-radius: 8px;
            background-color: #fff;
        }

        .favorite-toggle {
            background-color: #f0f0f0;
            color: #333;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        .favorite-toggle.active {
            background-color: #ffd700;
            color: #333;
        }

        /* Bookmark table */
        .bookmark-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0 8px;
            table-layout: fixed;
        }

        .bookmark-table th,
        .bookmark-table td {
            padding: 12px 8px;
            text-align: left;
            vertical-align: middle;
        }

        .bookmark-table th {
            font-size: 14px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        .bookmark-table th:hover {
            background-color: #f0f0f0;
        }

        .bookmark-table td {
            background-color: #f8f8f8;
            border: 1px solid #e0e0e0;
        }

        .bookmark-table tr td:first-child {
            border-top-left-radius: 8px;
            border-bottom-left-radius: 8px;
        }

        .bookmark-table tr td:last-child {
            border-top-right-radius: 8px;
            border-bottom-right-radius: 8px;
        }

        /* Column widths */
        .title-column { width: 50%; }
        .date-column { width: 10%; }
        .status-column { width: 15%; }
        .tags-column { width: 15%; }
        .action-column { width: 13%; }

        .bookmark-title {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
        }

        /* Status dropdown */
        .status-select {
            width: 100%;
            padding: 4px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background-color: #fff;
            font-size: 12px;
            cursor: pointer;
        }

        .status-select:hover {
            border-color: #999;
        }

        .status-select:focus {
            outline: none;
            border-color: #0066cc;
            box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
        }

        /* Tags */
        .tag-container {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-bottom: 4px;
        }

        .tag {
            background-color: #e4e4e4;
            border-radius: 12px;
            padding: 2px 8px;
            font-size: 11px;
            white-space: nowrap;
        }

        .tag-buttons {
            display: flex;
            gap: 4px;
        }

        .add-tag-btn,
        .edit-tags-btn {
            background: none;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            padding: 2px 6px;
        }

        .add-tag-btn:hover,
        .edit-tags-btn:hover {
            background-color: #f0f0f0;
        }

        /* Action buttons */
        .action-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }

        .action-buttons button {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            font-size: 14px;
            color: #666;
            transition: color 0.3s ease;
        }

        .action-buttons button:hover {
            color: #333;
        }

        .favorite-btn.active {
            color: red;
        }

        /* Pagination */
        .pagination-container {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
            margin-top: 20px;
        }

        .pagination-button {
            background-color: #f0f0f0;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 15px;
            padding: 8px 15px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        .pagination-button:hover {
            background-color: #e0e0e0;
        }

        .pagination-button:disabled {
            background-color: #f5f5f5;
            color: #999;
            cursor: not-allowed;
        }

        /* Settings panel */
        .settings-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .settings-group button,
        .settings-group select {
            background-color: #f0f0f0;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 10px 15px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        .settings-group button:hover,
        .settings-group select:hover {
            background-color: #e0e0e0;
        }

        #clearBookmarksButton {
            background-color: #ff3b30;
            color: white;
        }

        #clearBookmarksButton:hover {
            background-color: #d70015;
        }

        .file-input-wrapper {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .file-input-wrapper label {
            font-size: 14px;
            font-weight: 500;
            color: #333;
        }

        .file-input-wrapper input[type="file"] {
            font-size: 12px;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 8px;
            background-color: #f5f5f7;
        }

        `;
        document.head.appendChild(style);
    }

    function updateNavigationButtonPosition() {
        const container = document.getElementById('navigationButtonContainer');
        if (container) {
            switch (userSettings.navButtonPosition) {
                case 'left':
                    container.style.left = '20px';
                    container.style.right = 'auto';
                    container.style.transform = 'none';
                    break;
                case 'center':
                    container.style.left = '50%';
                    container.style.right = 'auto';
                    container.style.transform = 'translateX(-50%)';
                    break;
                case 'right':
                    container.style.left = 'auto';
                    container.style.right = '20px';
                    container.style.transform = 'none';
                    break;
            }
        }
    }

    function createPanelsContainer() {
        const panelsContainer = document.createElement("div");
        panelsContainer.className = "panels-container";

        const bookmarkPanel = document.createElement("div");
        bookmarkPanel.id = "bookmarkPanel";

        const settingsPanel = document.createElement("div");
        settingsPanel.id = "settingsPanel";

        panelsContainer.appendChild(bookmarkPanel);
        panelsContainer.appendChild(settingsPanel);

        document.body.appendChild(panelsContainer);
    }

    function createBookmarkInterface() {
        const bookmarkPanel = document.getElementById("bookmarkPanel");
        if (!bookmarkPanel) {
            console.error("Bookmark panel not found");
            return;
        }

        bookmarkPanel.innerHTML = `
            <div class="bookmark-header">
                <h3>Bookmarks</h3>
                <div class="bookmark-stats">
                    <div class="stat-item" id="totalBookmarks">Total Bookmarks: 0</div>
                    <div class="stat-item" id="totalFavorites">Total Favorites: 0</div>
                </div>
            </div>
            <div class="search-filter-container">
                <input type="text" class="search-bar" placeholder="Search bookmarks...">
                <select class="filter-select website-filter">
                    <option value="">Filter by Website...</option>
                </select>
                <select class="filter-select tag-filter">
                    <option value="">Filter by Tag...</option>
                </select>
                <select class="filter-select status-filter">
                    <option value="">Filter by Status...</option>
                    ${STATUS_OPTIONS.map(status => `<option value="${status}">${status}</option>`).join('')}
                </select>
                <select class="sort-select">
                    <option value="dateAdded_desc">Date Added (Newest)</option>
                    <option value="dateAdded_asc">Date Added (Oldest)</option>
                    <option value="title_asc">Title (A-Z)</option>
                    <option value="title_desc">Title (Z-A)</option>
                </select>
                <button class="favorite-toggle">Show Favorites</button>
            </div>
            <table class="bookmark-table">
                <thead>
                    <tr>
                        <th class="title-column">Title</th>
                        <th class="date-column">Date Added</th>
                        <th class="status-column">Status</th>
                        <th class="tags-column">Tags</th>
                        <th class="action-column">Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
            <div class="pagination-container"></div>
        `;

        const searchBar = bookmarkPanel.querySelector(".search-bar");
        if (searchBar) {
            searchBar.addEventListener("input", (e) => {
                searchQuery = e.target.value.toLowerCase();
                updateBookmarkList();
            });
        }

        const websiteFilter = bookmarkPanel.querySelector(".website-filter");
        if (websiteFilter) {
            websiteFilter.addEventListener("change", (e) => {
                filterWebsite = e.target.value;
                updateBookmarkList();
            });
        }

        const tagFilter = bookmarkPanel.querySelector(".tag-filter");
        if (tagFilter) {
            tagFilter.addEventListener("change", (e) => {
                filterTags = e.target.value ? [e.target.value] : [];
                updateBookmarkList();
            });
        }

        const statusFilter = bookmarkPanel.querySelector(".status-filter");
        if (statusFilter) {
            statusFilter.addEventListener("change", (e) => {
                filterStatus = e.target.value;
                updateBookmarkList();
            });
        }

        const sortSelect = bookmarkPanel.querySelector(".sort-select");
        if (sortSelect) {
            sortSelect.addEventListener("change", (e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('_');
                sortBy = newSortBy;
                sortOrder = newSortOrder;
                updateBookmarkList();
            });
        }

        const favoriteToggle = bookmarkPanel.querySelector(".favorite-toggle");
        if (favoriteToggle) {
            favoriteToggle.addEventListener("click", () => {
                showOnlyFavorites = !showOnlyFavorites;
                favoriteToggle.classList.toggle("active");
                favoriteToggle.textContent = showOnlyFavorites ? "Show All" : "Show Favorites";
                updateBookmarkList();
            });
        }

        populateFilterOptions();
        updateBookmarkList();
    }

    function populateFilterOptions() {
        const bookmarks = getBookmarks();
        const websiteFilter = document.querySelector(".website-filter");
        const tagFilter = document.querySelector(".tag-filter");

        if (!websiteFilter || !tagFilter) {
            console.error("Filter elements not found");
            return;
        }

        // Clear existing options
        websiteFilter.innerHTML = '<option value="">Filter by Website...</option>';
        tagFilter.innerHTML = '<option value="">Filter by Tag...</option>';

        // Populate website filter
        const websites = [...new Set(bookmarks.map(bookmark => new URL(bookmark.url).hostname))];
        websites.forEach(website => {
            const option = document.createElement("option");
            option.value = website;
            option.textContent = website;
            websiteFilter.appendChild(option);
        });

        // Populate tag filter
        const allTags = [...new Set(bookmarks.flatMap(bookmark => bookmark.tags || []))];
        allTags.forEach(tag => {
            const option = document.createElement("option");
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });
    }

    function updateBookmarkList() {
        const bookmarks = getFilteredAndSortedBookmarks();
        const bookmarkTable = document.querySelector(".bookmark-table tbody");
        const paginationContainer = document.querySelector(".pagination-container");
        const totalBookmarksElem = document.getElementById("totalBookmarks");
        const totalFavoritesElem = document.getElementById("totalFavorites");

        if (!bookmarkTable || !paginationContainer || !totalBookmarksElem || !totalFavoritesElem) {
            console.error("Required elements for updating bookmark list not found");
            return;
        }

        bookmarkTable.innerHTML = "";
        paginationContainer.innerHTML = "";

        const totalItems = bookmarks.length;
        const favoriteItems = bookmarks.filter(bookmark => bookmark.isFavorite).length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedBookmarks = bookmarks.slice(startIndex, startIndex + itemsPerPage);

        paginatedBookmarks.forEach((bookmark, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
            <td class="title-column">
                <span class="bookmark-title" title="${bookmark.title}">${bookmark.title}</span>
            </td>
            <td class="date-column">${new Date(bookmark.dateAdded).toLocaleDateString()}</td>
            <td class="status-column">
                <select class="status-select">
                    ${STATUS_OPTIONS.map(status =>
                        `<option value="${status}" ${(bookmark.status || 'Not Started') === status ? 'selected' : ''}>${status}</option>`
                    ).join('')}
                </select>
            </td>
            <td class="tags-column">
                <div class="tag-container">
                    ${(bookmark.tags || []).slice(0, 2).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    ${bookmark.tags && bookmark.tags.length > 2 ? `<span class="tag">+${bookmark.tags.length - 2}</span>` : ''}
                </div>
                <div class="tag-buttons">
                    <button class="add-tag-btn">+</button>
                    ${bookmark.tags && bookmark.tags.length > 0 ? '<button class="edit-tags-btn">Edit</button>' : ''}
                </div>
            </td>
            <td class="action-column">
                <div class="action-buttons">
                    <button class="favorite-btn ${bookmark.isFavorite ? 'active' : ''}" title="Favorite">${bookmark.isFavorite ? '★' : '☆'}</button>
                    <button class="visit-btn" title="Visit">&#128279;</button>
                    <button class="edit-btn" title="Edit">&#9998;</button>
                    <button class="delete-btn" title="Delete">&#128465;</button>
                </div>
            </td>
        `;

            const statusSelect = row.querySelector('.status-select');
            statusSelect.addEventListener('change', (e) => {
                updateStatus(bookmark, e.target.value);
            });

            const addTagBtn = row.querySelector('.add-tag-btn');
            addTagBtn.addEventListener('click', () => addTagsPrompt(bookmark));

            const editTagsBtn = row.querySelector('.edit-tags-btn');
            if (editTagsBtn) {
                editTagsBtn.addEventListener('click', () => editTagsPrompt(bookmark));
            }

            const favoriteBtn = row.querySelector('.favorite-btn');
            favoriteBtn.addEventListener('click', () => toggleFavoriteBookmark(bookmark.url));

            const visitBtn = row.querySelector('.visit-btn');
            visitBtn.addEventListener('click', () => window.location.href = bookmark.url);

            const editBtn = row.querySelector('.edit-btn');
            editBtn.addEventListener('click', () => editBookmarkTitle(bookmark.url));

            const deleteBtn = row.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => removeBookmark(bookmark.url));

            bookmarkTable.appendChild(row);
        });


        totalBookmarksElem.textContent = `Total Bookmarks: ${totalItems}`;
        totalFavoritesElem.textContent = `Total Favorites: ${favoriteItems}`;

        if (totalPages > 1) {
            const prevButton = document.createElement("button");
            prevButton.textContent = "Previous";
            prevButton.className = "pagination-button";
            prevButton.disabled = currentPage === 1;
            prevButton.addEventListener("click", () => {
                currentPage--;
                updateBookmarkList();
            });
            paginationContainer.appendChild(prevButton);

            const pageText = document.createElement("span");
            pageText.textContent = `${currentPage} / ${totalPages}`;
            paginationContainer.appendChild(pageText);

            const nextButton = document.createElement("button");
            nextButton.textContent = "Next";
            nextButton.className = "pagination-button";
            nextButton.disabled = currentPage === totalPages;
            nextButton.addEventListener("click", () => {
                currentPage++;
                updateBookmarkList();
            });
            paginationContainer.appendChild(nextButton);
        }
    }

    function getFilteredAndSortedBookmarks() {
        let bookmarks = getBookmarks();

        if (searchQuery) {
            bookmarks = bookmarks.filter(bookmark =>
                bookmark.title.toLowerCase().includes(searchQuery) ||
                (bookmark.tags && bookmark.tags.some(tag => tag.toLowerCase().includes(searchQuery)))
            );
        }

        if (filterWebsite) {
            bookmarks = bookmarks.filter(bookmark => new URL(bookmark.url).hostname === filterWebsite);
        }

        if (filterTags.length > 0) {
            bookmarks = bookmarks.filter(bookmark =>
                bookmark.tags && filterTags.every(tag => bookmark.tags.includes(tag))
            );
        }

        if (filterStatus) {
            bookmarks = bookmarks.filter(bookmark => (bookmark.status || 'Not Started') === filterStatus);
        }

        if (showOnlyFavorites) {
            bookmarks = bookmarks.filter(bookmark => bookmark.isFavorite);
        }

        // Sort bookmarks
        bookmarks.sort((a, b) => {
            if (sortBy === 'dateAdded') {
                return sortOrder === 'asc' ? new Date(a.dateAdded) - new Date(b.dateAdded) : new Date(b.dateAdded) - new Date(a.dateAdded);
            } else if (sortBy === 'title') {
                return sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
            }
        });

        return bookmarks;
    }

    function addTagsPrompt(bookmark) {
        const tagsInput = prompt("Enter tags separated by commas:");
        if (tagsInput) {
            const newTags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
            addTags(bookmark, newTags);
        }
    }

    function addTags(bookmark, newTags) {
        const bookmarks = getBookmarks();
        const index = bookmarks.findIndex(b => b.url === bookmark.url);

        if (index !== -1) {
            if (!bookmarks[index].tags) {
                bookmarks[index].tags = [];
            }
            bookmarks[index].tags = [...new Set([...bookmarks[index].tags, ...newTags])];
            saveBookmarks(bookmarks);
            updateBookmarkList();
            populateFilterOptions();
        }
    }

    function editTagsPrompt(bookmark) {
        const currentTags = bookmark.tags ? bookmark.tags.join(', ') : '';
        const tagsInput = prompt("Edit tags (separate by commas):", currentTags);
        if (tagsInput !== null) {
            const newTags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
            updateTags(bookmark, newTags);
        }
    }

    function updateTags(bookmark, newTags) {
        const bookmarks = getBookmarks();
        const index = bookmarks.findIndex(b => b.url === bookmark.url);

        if (index !== -1) {
            bookmarks[index].tags = newTags;
            saveBookmarks(bookmarks);
            updateBookmarkList();
            populateFilterOptions();
        }
    }

    function updateStatus(bookmark, newStatus) {
        const bookmarks = getBookmarks();
        const index = bookmarks.findIndex(b => b.url === bookmark.url);

        if (index !== -1) {
            bookmarks[index].status = newStatus;
            saveBookmarks(bookmarks);
            updateBookmarkList();
        }
    }

    function toggleFavoriteBookmark(url) {
        const bookmarks = getBookmarks();
        const bookmark = bookmarks.find(b => b.url === url);
        if (bookmark) {
            bookmark.isFavorite = !bookmark.isFavorite;
            saveBookmarks(bookmarks);
            updateBookmarkList();
        }
    }

    function editBookmarkTitle(url) {
        const bookmarks = getBookmarks();
        const bookmark = bookmarks.find(b => b.url === url);
        if (bookmark) {
            const newTitle = prompt("Enter a new title for this bookmark:", bookmark.title);
            if (newTitle) {
                bookmark.title = newTitle;
                saveBookmarks(bookmarks);
                updateBookmarkList();
            }
        }
    }

    function removeBookmark(url) {
        if (confirm("Are you sure you want to delete this bookmark?")) {
            let bookmarks = getBookmarks();
            bookmarks = bookmarks.filter(bookmark => bookmark.url !== url);
            saveBookmarks(bookmarks);
            updateBookmarkList();
            populateFilterOptions();
        }
    }

    function getBookmarks() {
        const bookmarksJson = GM_getValue(BOOKMARKS_KEY, "[]");
        return JSON.parse(bookmarksJson);
    }

    function saveBookmarks(bookmarks) {
        GM_setValue(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    }

    function toggleBookmarkPanel() {
        const bookmarkPanel = document.getElementById("bookmarkPanel");
        const settingsPanel = document.getElementById("settingsPanel");
        if (bookmarkPanel) {
            bookmarkPanel.style.display = (bookmarkPanel.style.display === "none" || bookmarkPanel.style.display === "") ? "block" : "none";
            if (settingsPanel) {
                settingsPanel.style.display = "none";
            }
        }
    }

    function toggleSettingsPanel() {
        const settingsPanel = document.getElementById("settingsPanel");
        const bookmarkPanel = document.getElementById("bookmarkPanel");
        if (settingsPanel) {
            settingsPanel.style.display = (settingsPanel.style.display === "none" || settingsPanel.style.display === "") ? "block" : "none";
            if (bookmarkPanel) {
                bookmarkPanel.style.display = "none";
            }
        }
    }

    async function copyToClipboard(button) {
        button.disabled = true;

        const chapterContainer = document.querySelector(chapterContentSelector);
        if (!chapterContainer) {
            console.error("Chapter content container not found");
            alert("Failed to find chapter content. Please check if you're on a valid chapter page.");
            button.disabled = false;
            return;
        }

        const chapterContent = chapterContainer.innerText.trim();
        try {
            await navigator.clipboard.writeText(chapterContent);
            button.style.backgroundColor = "#2196F3";
            setTimeout(() => {
                button.style.backgroundColor = "#f0f0f0";
            }, 1000);
        } catch (error) {
            console.error("Failed to copy chapter content:", error);
            alert("Failed to copy chapter content. Please try again or copy manually.");
        } finally {
            button.disabled = false;
        }
    }

    function goToPreviousChapter() {
        navigateToChapter(previousPageText, previousPageSelector);
    }

    function goToNextChapter() {
        navigateToChapter(nextPageText, nextPageSelector);
    }

    function navigateToChapter(textSelector, fallbackSelector) {
        const pageLink = textSelector ? findLinkByText(textSelector) : document.querySelector(fallbackSelector);
        if (pageLink) {
            window.location = pageLink.href;
        } else {
            console.error("Navigation link not found");
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

    function bookmarkChapter() {
        let chapterTitle = document.title;
        const chapterUrl = window.location.href;
        const bookmarks = getBookmarks();

        if (bookmarks.some(bookmark => bookmark.url === chapterUrl)) {
            if (!confirm("This chapter is already bookmarked. Do you want to re-add it?")) {
                return;
            }
        }

        chapterTitle = formatChapterTitle(chapterTitle);

        bookmarks.push({
            title: chapterTitle,
            url: chapterUrl,
            dateAdded: new Date().toISOString(),
            isFavorite: false,
            tags: [],
            status: 'Not Started'
        });

        saveBookmarks(bookmarks);
        alert("Chapter bookmarked!");
        updateBookmarkList();
    }

    function formatChapterTitle(originalTitle) {
        if (typeof originalTitle !== 'string') {
            console.error('Invalid originalTitle:', originalTitle);
            return 'Unknown Chapter';
        }

        console.log('Original title:', originalTitle);

        const chapterRegexPatterns = [
            /第\s*(\d+)\s*話/,
            /第\s*(\d+)\s*章/,
            /第\s*(\d+)\s*卷/,
            /(\d+)\s*話/,
            /([０-９]+)話/,
            /(\d+)\s*章/,
            /Chapter\s*(\d+)/i,
            /Ch\.?\s*(\d+)/i,
            /Episode\s*(\d+)/i,
            /Ep\.?\s*(\d+)/i,
            /(\d+)\./,
            /(\d+):/,
            /\s+(\d+)\s+/,
            /Part\s*(\d+)/i,
            /Section\s*(\d+)/i,
            /Volume\s*(\d+)/i,
            /Vol\.?\s*(\d+)/i
        ];

        let chapterNum;
        for (const regex of chapterRegexPatterns) {
            console.log('Trying regex:', regex);
            const match = originalTitle.match(regex);
            if (match && match[1]) {
                chapterNum = match[1];
                console.log('Match found:', match);
                break;
            }
        }

        if (!chapterNum) {
            console.log('No match found with predefined patterns. Trying to extract any number.');
            const numberMatch = originalTitle.match(/\d+/);
            if (numberMatch) {
                chapterNum = numberMatch[0];
                console.log('Number extracted:', chapterNum);
            }
        }

        if (!chapterNum) {
            console.log('No number found. Using original title.');
            return originalTitle;
        }

        const formattedTitle = `[CH${chapterNum}] ${originalTitle}`;
        console.log('Formatted title:', formattedTitle);
        return formattedTitle;
    }

    function createSettingsPanel() {
        const settingsPanel = document.getElementById("settingsPanel");
        if (!settingsPanel) {
            console.error("Settings panel not found");
            return;
        }

        settingsPanel.innerHTML = `
            <h3>Settings</h3>
            <div class="settings-group">
                <label for="navButtonPosition">Navigation Button Position:</label>
                <select id="navButtonPosition">
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                </select>
                <button id="exportButton">Export Data</button>
                <div class="file-input-wrapper">
                    <label for="importInput">Import Data</label>
                    <input type="file" id="importInput" accept=".json">
                </div>
                <button id="clearBookmarksButton">Clear Bookmarks</button>
            </div>
        `;

        const navPositionSelect = settingsPanel.querySelector("#navButtonPosition");
        navPositionSelect.value = userSettings.navButtonPosition;
        navPositionSelect.addEventListener("change", (e) => {
            userSettings.navButtonPosition = e.target.value;
            GM_setValue(SETTINGS_KEY, userSettings);
            updateNavigationButtonPosition();
        });

        const exportButton = settingsPanel.querySelector("#exportButton");
        if (exportButton) {
            exportButton.addEventListener("click", exportBookmarksAndSettings);
        }

        const importInput = settingsPanel.querySelector("#importInput");
        if (importInput) {
            importInput.addEventListener("change", importBookmarksAndSettings);
        }

        const clearButton = settingsPanel.querySelector("#clearBookmarksButton");
        if (clearButton) {
            clearButton.addEventListener("click", clearAllBookmarks);
        }
    }

    function exportBookmarksAndSettings() {
        const bookmarks = getBookmarks();
        const data = {
            bookmarks: bookmarks.map(bookmark => ({
                title: bookmark.title,
                url: bookmark.url,
                dateAdded: bookmark.dateAdded,
                isFavorite: bookmark.isFavorite,
                tags: bookmark.tags || [],
                status: bookmark.status || 'Not Started'
            })),
            settings: userSettings
        };
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const currentDate = new Date().toISOString().split('T')[0];
        a.download = `bookmarks_export_${currentDate}.json`;
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
                if (data.bookmarks && Array.isArray(data.bookmarks)) {
                    const importedBookmarks = data.bookmarks.map(bookmark => ({
                        title: bookmark.title,
                        url: bookmark.url,
                        dateAdded: bookmark.dateAdded,
                        isFavorite: bookmark.isFavorite,
                        tags: bookmark.tags || [],
                        status: bookmark.status || 'Not Started'
                    }));
                    saveBookmarks(importedBookmarks);
                    if (data.settings) {
                        userSettings = {
                            ...defaultSettings,
                            ...data.settings
                        };
                        GM_setValue(SETTINGS_KEY, userSettings);
                        updateNavigationButtonPosition();
                    }
                    updateBookmarkList();
                    populateFilterOptions();
                    alert("Bookmarks and settings imported successfully!");
                } else {
                    throw new Error("Invalid format or no bookmarks found.");
                }
            } catch (error) {
                console.error("Import error:", error);
                alert("Failed to import bookmarks. Please ensure the file is a valid JSON with bookmarks.");
            }
        };
        reader.readAsText(file);
    }

    function clearAllBookmarks() {
        if (confirm("Are you sure you want to clear all bookmarks? This action cannot be undone.")) {
            saveBookmarks([]);
            updateBookmarkList();
            populateFilterOptions();
            alert("All bookmarks have been cleared.");
        }
    }

    // Initialize the script
    function init() {
        createNavigationButtons();
        updateNavigationButtonPosition();
        createPanelsContainer();
        createBookmarkInterface();
        createSettingsPanel();
    }

    // Run the initialization when the DOM is fully loaded
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();