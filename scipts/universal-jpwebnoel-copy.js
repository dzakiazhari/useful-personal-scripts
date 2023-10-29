// ==UserScript==
// @name         Universal JP RAW Novel Chapter Copy
// @namespace    DA
// @version      1.3
// @description  Copy the chapter content from Japanese novel websites.
// @author       DA
// @license      GNU AGPLv3
// @match        https://kakuyomu.jp/works/*/episodes/*
// @match        https://syosetu.org/novel/*/*.html
// @match        https://*.syosetu.com/n*/*/
// @exclude      https://*.syosetu.com/novelreview/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @grant        none
// ==/UserScript==
// Use this script with Translation Aggregator (TA) plus MeCab, and JParser to study Japanese by reading novel

(function() {
	'use strict';
	// Site-specific settings for Kakuyomu
	const kakuyomuSettings = {
		chapterContentSelector: "#contentMain",
		previousPageSelector: '[data-link-click-action-name="WorksEpisodesEpisodeHeaderPreviousEpisode"]',
		nextPageSelector: '#contentMain-readNextEpisode'
	};
	// Site-specific settings for Hamelun
	const hamelunSettings = {
		chapterContentSelector: ".ss",
		previousPageSelector: 'li.novelnb a',
		nextPageSelector: 'li.novelnb a.next_page_link',
		tableOfContentsSelector: 'li.novelmokuzi a'
	};
	/// Site-specific settings for Narou
	const narouSettings = {
		chapterContentSelector: "#novel_contents",
		previousPageLink: 'a:contains("<<")',
		nextPageLink: 'a:contains(">>")'
	};

	const siteConfigs = [{
			urlPattern: /https:\/\/kakuyomu\.jp\/works\/.*\/episodes\/.*/,
			settings: kakuyomuSettings
		},
		{
			urlPattern: /https:\/\/syosetu\.org\/novel\/.*\/.*/,
			settings: hamelunSettings
		},
		{
			urlPattern: /https:\/\/.*\.syosetu\.com\/.*\/.*/,
			settings: narouSettings
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
		nextPageSelector
	} = currentSiteConfig.settings;

	scrollToTop();
	var observer = new MutationObserver(handlePageChanges);
	var observerConfig = {
		childList: true,
		subtree: true
	};
	observer.observe(document.body, observerConfig);
	//console.log("prevlink:", previousPageLink);
	//console.log("nextlink:", nextPageLink);

	var buttonContainer = document.createElement("div");
	buttonContainer.style.position = "fixed";
	buttonContainer.style.bottom = "20px";
	buttonContainer.style.left = "50%";
	buttonContainer.style.transform = "translateX(-50%)";
	buttonContainer.style.display = "flex";
	buttonContainer.style.justifyContent = "center";
	buttonContainer.style.alignItems = "center";
	buttonContainer.style.gap = "4px";

	var buttonGroup = document.createElement("div");
	buttonGroup.className = "btn-group";

	var previousButton = createButton("Previous Chapter", goToPreviousChapter, true);
	var copyButton = createButton("Copy Chapter", copyToClipboard, false);
	var nextButton = createButton("Next Chapter", goToNextChapter, false, true);

	previousButton.classList.add("btn-group__item");
	copyButton.classList.add("btn-group__item");
	nextButton.classList.add("btn-group__item");

	buttonGroup.appendChild(previousButton);
	buttonGroup.appendChild(copyButton);
	buttonGroup.appendChild(nextButton);

	buttonContainer.appendChild(buttonGroup);

	document.body.appendChild(buttonContainer);

	function handlePageChanges() {
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
		button.style.borderRadius = "0px";

		if (isFirstButton) {
			button.style.borderRadius = "30px 0 0 30px";
		}

		if (isLastButton) {
			button.style.borderRadius = "0 30px 30px 0";
			button.style.borderRight = "1px solid rgba(0, 0, 0, 0.1)";
		}

		button.style.whiteSpace = "nowrap";

		button.addEventListener("click", function() {
			console.log(text + " button clicked.");
			clickAction(button);
		});

		return button;
	}

	function copyToClipboard(button) {
		console.log("Copy button clicked.");
		button.disabled = true;

		var chapterContainer = document.querySelector(chapterContentSelector);
		if (!chapterContainer) {
			console.log("Unable to find chapter content on this page.");
			button.disabled = false;
			return;
		}

		var chapterContent = chapterContainer.innerText.trim();
		copyTextToClipboard(chapterContent)
			.then(function() {
				console.log("Chapter content has been copied to clipboard.");
				button.disabled = false;
				button.style.backgroundColor = "#2196F3"; // Change button color to blue
			})
			.catch(function(error) {
				console.log("Failed to copy chapter content:", error);
				button.disabled = false;
				// Display an error message to the user
				alert("Failed to copy chapter content. Please try again.");
			});
	}

	function copyTextToClipboard(text) {
		return new Promise(function(resolve, reject) {
			var textarea = document.createElement("textarea");
			textarea.value = text;
			textarea.style.position = "fixed";
			textarea.style.top = 0;
			textarea.style.left = 0;
			textarea.style.opacity = 0;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand("copy");
			document.body.removeChild(textarea);
			resolve();
		});
	}

	function goToPreviousChapter() {
		console.log("Previous Chapter button clicked.");
		var previousPageLink = $(narouSettings.previousPageLink);
		var previousPageSelectorLink = document.querySelector(previousPageSelector);

		if (previousPageLink.length > 0) {
			console.log("Previous Link:", previousPageLink[0].href);
			window.location = previousPageLink[0].href; // Treat it as a link
		} else if (previousPageSelectorLink) {
			previousPageSelectorLink.click();
			scrollToTop();
		} else {
			console.log("Unable to find previous chapter link.");
		}
	}

	function goToNextChapter() {
		console.log("Next Chapter button clicked.");
		var nextPageLink = $(narouSettings.nextPageLink);
		var nextPageSelectorLink = document.querySelector(nextPageSelector);

		if (nextPageLink.length > 0) {
			console.log("Next Link:", nextPageLink[0].href);
			window.location = nextPageLink[0].href; // Treat it as a link
		} else if (nextPageSelectorLink) {
			nextPageSelectorLink.click();
			scrollToTop();
		} else {
			console.log("Unable to find next chapter link.");
		}
	}

	// Event listener for the left arrow key
	document.addEventListener("keydown", function(event) {
		if (event.keyCode === 37) {
			// Left arrow key
			goToPreviousChapter();
		}
	});

	// Event listener for the right arrow key
	document.addEventListener("keydown", function(event) {
		if (event.keyCode === 39) {
			// Right arrow key
			goToNextChapter();
		}
	});

	function scrollToTop() {
		window.scrollTo({
			left: 0,
			top: 0,
			behavior: 'smooth'
		});
		console.log("Scroll to top.");
	}


})();