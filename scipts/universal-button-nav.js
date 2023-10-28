// ==UserScript==
// @name         Universal Navigation Button
// @namespace    DA
// @version      1.2
// @description  Universal Navigation Button
// @author       DA
// @match        https://yoursite.com
// @grant        none
// ==/UserScript==
//Please configure yoursite on the url match section above

(function() {
    'use strict';
  
    const cssStyles = `
      .button-container {
        position: fixed;
        top: 50%;
        right: 20px;
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
  
      .button-content {
        font-size: 1.4em;
        color: #000;
        transition: color 0.2s ease-in-out;
      }
  
      .button:hover .button-content {
        color: #333;
      }
    `;
  
    // Create the button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
  
    // Scroll to top function
    const scrollToTop = () => {
      window.scrollTo({
        left: 0,
        top: 0,
        behavior: 'smooth'
      });
      console.log('Scrolling to top.'); 
    };
  
    // Scroll to bottom function
    const scrollToBottom = () => {
      window.scrollTo({
        left: 0,
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      console.log('Scrolling to bottom.');
    };
  
    // Press left arrow function
    const pressLeftArrow = () => {
      const event = new KeyboardEvent('keydown', { keyCode: 37 });
      document.dispatchEvent(event);
      console.log('Left arrow pressed.');
    };
  
    // Press right arrow function
    const pressRightArrow = () => {
      const event = new KeyboardEvent('keydown', { keyCode: 39 });
      document.dispatchEvent(event);
      console.log('Right arrow pressed.');
    };
  
    // Reload the webpage
    const reloadPage = () => {
      window.location.reload();
      console.log('Reloading the page.');
    };
  
    // Create a button
    const createButton = (className, content, order, clickHandler) => {
      const button = document.createElement('button');
      button.className = `button ${className}`;
      button.textContent = content;
      button.addEventListener('click', clickHandler);
      button.style.order = order;
      return button;
    };
  
    // Create the buttons
    const upButton = createButton('up', '▲', 1, scrollToTop); 
    const downButton = createButton('down', '▼', 2, scrollToBottom); 
    const reloadButton = createButton('reload', 'R', 3, reloadPage); 
    const rightButton = createButton('right', '►', 4, pressRightArrow); 
    const leftButton = createButton('left', '◄', 5, pressLeftArrow);
  
    // Append the buttons to the button container
    buttonContainer.appendChild(upButton);
    buttonContainer.appendChild(downButton);
    buttonContainer.appendChild(reloadButton);
    buttonContainer.appendChild(document.createElement('br'));
    buttonContainer.appendChild(rightButton);
    buttonContainer.appendChild(leftButton);
  
    // Append the button container to the document body
    document.body.appendChild(buttonContainer);
  
    // Add CSS styles
    const styleElement = document.createElement('style');
    styleElement.textContent = cssStyles;
    document.head.appendChild(styleElement);
  
    // Debugging log
    console.log('Universal Navigation Button userscript loaded.');
  })();