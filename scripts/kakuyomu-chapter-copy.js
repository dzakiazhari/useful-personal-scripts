// ==UserScript==
// @name         Kakuyomu Chapter Copy
// @namespace    DA
// @version      1.2
// @description  Copy the chapter content from a Kakuyomu episode page.
// @author       DA
// @license      GNU AGPLv3
// @match        https://kakuyomu.jp/works/*/episodes/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    scrollToTop(); // Scroll to the top of the page

    // Create a MutationObserver to handle dynamic page changes
    var observer = new MutationObserver(handlePageChanges);
    var observerConfig = { childList: true, subtree: true };
    observer.observe(document.body, observerConfig);

    // Create button container
    var buttonContainer = document.createElement("div");
    buttonContainer.style.position = "fixed";
    buttonContainer.style.bottom = "20px";
    buttonContainer.style.left = "50%";
    buttonContainer.style.transform = "translateX(-50%)";
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "center";
    buttonContainer.style.alignItems = "center"; // Add alignment property
    buttonContainer.style.gap = "4px"; // Add gap between buttons

    var buttonGroup = document.createElement("div"); // Create the button group container
    buttonGroup.className = "btn-group"; // Add the btn-group class

    var previousButton = createButton("Previous Episode", goToPreviousChapter, true);
    var copyButton = createButton("Copy Chapter", copyToClipboard, false);
    var nextButton = createButton("Next Episode", goToNextChapter, false, true);

    // Add the btn-group__item class to each button
    previousButton.classList.add("btn-group__item");
    copyButton.classList.add("btn-group__item");
    nextButton.classList.add("btn-group__item");

    buttonGroup.appendChild(previousButton);
    buttonGroup.appendChild(copyButton);
    buttonGroup.appendChild(nextButton);

    buttonContainer.appendChild(buttonGroup);

    document.body.appendChild(buttonContainer);

    function handlePageChanges() {
        // Handle dynamic page changes here
        // For example, you can reattach event listeners or update button states
        console.log("Page has changed");
    }

    function createButton(text, clickAction, isFirstButton, isLastButton) {
        var button = document.createElement("button");
        button.textContent = text;
        button.style.padding = "5px 10px";
        button.style.border = "none";
        button.style.backgroundColor = "#4CAF50";
        button.style.color = "white";
        button.style.cursor = "pointer";
        button.style.borderRadius = "0px"; // Default border radius

        if (isFirstButton) {
            button.style.borderRadius = "30px 0 0 30px"; // Rounded left side for the first button
        }

        if (isLastButton) {
            button.style.borderRadius = "0 30px 30px 0"; // Rounded right side for the last button
            button.style.borderRight = "1px solid rgba(0, 0, 0, 0.1)"; // Add right border to separate buttons
        }

        button.style.whiteSpace = "nowrap"; // Prevent text from wrapping

        button.addEventListener("click", function () {
            console.log(text + " button clicked.");
            clickAction(button);
        });

        return button;
    }

    function copyToClipboard(button) {
        console.log("Copy button clicked.");
        button.disabled = true; // Disable the button to prevent multiple clicks

        var chapterContainer = document.getElementById("contentMain");
        if (!chapterContainer) {
            console.log("Unable to find chapter content on this page.");
            button.disabled = false; // Re-enable the button
            return;
        }

        var chapterContent = chapterContainer.innerText.trim();
        copyTextToClipboard(chapterContent)
            .then(function () {
                console.log("Chapter content has been copied to the clipboard.");
                button.style.backgroundColor = "#2196F3"; // Change button color to blue
            })
            .catch(function (error) {
                console.log("Failed to copy chapter content:", error);
                button.disabled = false; // Re-enable the button
                // Display an error message to the user
                alert("Failed to copy chapter content. Please try again.");
            });
    }

    function copyTextToClipboard(text) {
        return new Promise(function (resolve, reject) {
            if (!navigator.clipboard) {
                reject("Clipboard API is not supported.");
                return;
            }

            navigator.clipboard.writeText(text)
                .then(resolve)
                .catch(reject);
        });
    }


    function goToNextChapter() {
        console.log("Next episode button clicked.");
        var nextEpisodeButton = document.getElementById('contentMain-readNextEpisode');
        if (!nextEpisodeButton) {
            console.log('Unable to find next episode button on this page.');
            return;
        }
        nextEpisodeButton.click();
        scrollToTop(); // Scroll to the top of the page
    }

    function goToPreviousChapter() {
        console.log("Previous episode button clicked.");
        var previousEpisodeButton = document.querySelector('[data-link-click-action-name="WorksEpisodesEpisodeHeaderPreviousEpisode"]');
        if (!previousEpisodeButton) {
            console.log('Unable to find previous episode button on this page.');
            return;
        }
        previousEpisodeButton.click();
        scrollToTop(); // Scroll to the top of the page
    }

    function scrollToTop() {
        window.scrollTo(0, 0);
    }
})();