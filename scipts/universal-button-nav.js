// ==UserScript==
// @name         Universal Navigation Button
// @namespace    DA
// @version      1.3
// @description  Universal Navigation Button
// @author       DA
// @match        https://yoursite.com/*
// @grant        none
// ==/UserScript==

(function() {
	'use strict';

	const cssStyles = `
  .button-container {
    position: fixed;
    top: 50%;
    right: 65px;
    transform: translateY(-50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .button {
    margin: 5px;
    width: 36px;
    height: 36px;
    border-radius: 0;
    background-color: #fff;
    border: none;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.26);
    cursor: pointer;
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  }

  @media (prefers-color-scheme: dark) {
    .button {
      color: black !important;
    }
  }
  `;

	const buttonContainer = document.createElement('div');
	buttonContainer.className = 'button-container';

	const scrollToTop = () => {
		window.scrollTo({
			left: 0,
			top: 0,
			behavior: 'smooth'
		});
		console.log('Scrolling to top.');
	};

	const scrollToBottom = () => {
		window.scrollTo({
			left: 0,
			top: document.body.scrollHeight,
			behavior: 'smooth'
		});
		console.log('Scrolling to bottom.');
	};

	const pressLeftArrow = () => {
		const event = new KeyboardEvent('keydown', {
			keyCode: 37
		});
		document.dispatchEvent(event);
		console.log('Left arrow pressed.');
	};

	const pressRightArrow = () => {
		const event = new KeyboardEvent('keydown', {
			keyCode: 39
		});
		document.dispatchEvent(event);
		console.log('Right arrow pressed.');
	};

	const reloadPage = () => {
		window.location.reload();
		console.log('Reloading the page.');
	};

	const createButton = (className, content, order, clickHandler) => {
		const button = document.createElement('button');
		button.className = `button ${className}`;
		button.textContent = content;
		button.addEventListener('click', clickHandler);
		button.style.order = order;
		return button;
	};

	const upButton = createButton('up', '▲', 1, scrollToTop);
	const downButton = createButton('down', '▼', 2, scrollToBottom);
	const reloadButton = createButton('reload', 'R', 3, reloadPage);
	const rightButton = createButton('right', '►', 4, pressRightArrow);
	const leftButton = createButton('left', '◄', 5, pressLeftArrow);

	buttonContainer.appendChild(upButton);
	buttonContainer.appendChild(downButton);
	buttonContainer.appendChild(reloadButton);
	buttonContainer.appendChild(document.createElement('br'));
	buttonContainer.appendChild(rightButton);
	buttonContainer.appendChild(leftButton);

	document.body.appendChild(buttonContainer);

	const styleElement = document.createElement('style');
	styleElement.textContent = cssStyles;
	document.head.appendChild(styleElement);

	console.log('Universal Navigation Button userscript loaded.');
})();