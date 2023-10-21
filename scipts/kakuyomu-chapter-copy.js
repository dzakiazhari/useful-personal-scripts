// ==UserScript==
// @name         Kakuyomu Chapter Copy
// @namespace    DA
// @version      1.0
// @description  Copy the chapter content from a Kakuyomu episode page.
// @author       DA
// @license      GNU AGPLv3
// @match        https://kakuyomu.jp/works/*/episodes/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var buttonContainer = createButtonContainer();
    var copyButton = createButton("Copy Chapter", "#4CAF50", copyToClipboard, "copy-button");
    var nextButton = createButton("Next Episode", "#2196F3", goToNextChapter);
    var previousButton = createButton("Previous Episode", "#2196F3", goToPreviousChapter);

    buttonContainer.appendChild(previousButton);
    buttonContainer.appendChild(copyButton);
    buttonContainer.appendChild(nextButton);
    document.body.appendChild(buttonContainer);

    function createButtonContainer() {
        var container = document.createElement("div");
        container.style.position = "fixed";
        container.style.bottom = "20px";
        container.style.left = "50%";
        container.style.transform = "translateX(-50%)";
        container.style.display = "flex";
        container.style.justifyContent = "space-between";
        container.style.alignItems = "center";
        container.style.padding = "5px";
        container.style.backgroundColor = "#f1f1f1";
        container.style.borderRadius = "4px";
        return container;
    }

    function createButton(text, backgroundColor, clickAction, className) {
        var button = document.createElement("button");
        button.textContent = text;
        button.style.fontSize = "16px";
        button.style.padding = "5px 10px";
        button.style.border = "none";
        button.style.backgroundColor = backgroundColor;
        button.style.color = "white";
        button.style.cursor = "pointer";
        button.addEventListener("click", function () {
            console.log(text + " button clicked.");
            clickAction();
            if (className) {
                button.classList.add(className);
            }
        });
        return button;
    }

    function copyToClipboard() {
        console.log("Copy button clicked.");
        var chapterContainer = document.getElementById("contentMain");
        if (!chapterContainer) {
            console.log("Unable to find chapter content on this page.");
            return;
        }
        var chapterContent = chapterContainer.innerText.trim();
        copyTextToClipboard(chapterContent);
        copyButton.style.backgroundColor = "#2196F3"; // Change button color to blue
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

    function copyTextToClipboard(text) {
        var textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.top = 0;
        textarea.style.left = 0;
        textarea.style.opacity = 0;
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        console.log("Chapter content has been copied to the clipboard.");
        console.log("Copied chapter content:", text);
    }

    function scrollToTop() {
        window.scrollTo(0, 0);
    }
})();