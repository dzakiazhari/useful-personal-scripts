// ==UserScript==
// @name         Universal JP RAW Novel Chapter Copy
// @namespace    DA
// @version      1.2
// @description  Copy the chapter content from Japanese novel websites.
// @author       DA
// @license      GNU AGPLv3
// @match        https://kakuyomu.jp/works/*/episodes/*
// @match        https://syosetu.org/novel/*/*
// @match        https://*.syosetu.com/n*/*/
// @grant        none
// ==/UserScript==
// Use this script with Translation Aggregator (TA) plus MeCab, and JParser to study Japanese by reading novel

(function() {
	'use strict';
	// Custom implementation of :contains selector, currently unused
	function containsSelector(selector, text) {
		var elements = document.querySelectorAll(selector);

		return Array.prototype.filter.call(elements, function(element) {
			return new RegExp(text, 'i').test(element.textContent);
		});
	}

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
	// Site-specific settings for Narou
  // Previous and Next only work for page 2 onwards
	const narouSettings = {
		chapterContentSelector: "#novel_contents",
		previousPageSelector: 'div.novel_bn a:nth-child(1):not(:has(span))',
		nextPageSelector: 'div.novel_bn a:nth-child(2):not(:has(span))'
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

	// Previous and Next
  function goToPreviousChapter() {
    console.log("Previous Chapter button clicked.");

    var previousPageLink = document.querySelector(previousPageSelector);
    if (!previousPageLink) {
      console.log("Unable to find previous chapter link.");
      return;
    }

    previousPageLink.click();
  }

  function goToNextChapter() {
    console.log("Next Chapter button clicked.");

    var nextPageLink = document.querySelector(nextPageSelector);
    if (!nextPageLink) {
      console.log("Unable to find next chapter link.");
      return;
    }

    nextPageLink.click();
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
			top: 0,
			behavior: "smooth"
		});
	}

	// End

})();