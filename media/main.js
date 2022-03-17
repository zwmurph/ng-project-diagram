// This script will be run within the webview itself. It cannot access the main VS Code APIs directly.
(function() {
    const vscode = acquireVsCodeApi();
    const container = document.getElementById('project-network');

    // Event listener for messages sent from the extension to the webview
    window.addEventListener('message', (event) => {
        // Execute functions based on command sent in message
        const message = event.data;
        if (message.command === 'DISPLAY-DIAGRAM') {
            displayDiagram(message.data, container);
        }
    });

    // Event listener for download button
    document.getElementById('download-btn').addEventListener('click', () => {
        sendNetworkDataUrl(vscode, container);
    });

    // Event listener for transparency toggle
    // document.getElementById('canvas-background-toggle').addEventListener('change', function() {
    //     handleTransparencyToggleChange(this.checked, container);
    // });
}());

/**
 * Parses the network data into a Vis.js network and displays according to the options.
 * @param {*} networkMetadata Nodes and Edges to display along with Options for the Network.
 * @param {*} container HTMLElement to act as a container for the Network.
 */
function displayDiagram(networkMetadata, container) {
    console.log('data', networkMetadata.data);
    console.log('options', networkMetadata.options);

    // Create a new Vis.js network
    const network = new vis.Network(container, networkMetadata.data, networkMetadata.options);
   
    // Update the UI with new icons
    createNavigationUi(container);

    // Only trigger this listener once, after the first drawing of the canvas
    network.once('afterDrawing', () => {
        // Disable hierarchical layout - is only needed for initial render. This allows the user to freely move
        //   nodes on the canvas
        network.setOptions({ layout: { hierarchical: false } });
    });
}

/**
 * Sends the network data URL back to the extension.
 * @param {*} vscode VS Code API reference.
 * @param {*} networkContainer HTMLElement reference to the Network container.
 */
function sendNetworkDataUrl(vscode, networkContainer) {
    let canvasContext;

    // Get the canvas element and checkbox state
    const canvasElement = networkContainer.getElementsByTagName('canvas')[0];
    const transparencyToggleChecked = document.getElementById('canvas-background-toggle').checked;

    // Check if the image should be saved with a transparent background or not
    if (!transparencyToggleChecked) {
        console.log('not checked - fill background');

        // Get the canvas context from the element
        canvasContext = canvasElement.getContext('2d');

        // Save the context to restore from later
        canvasContext.save();
    
        // Set the new compositions for the canvas to be behind existing
        canvasContext.globalCompositeOperation = 'destination-over';
    
        // Set the background colour with a filled shaped
        canvasContext.fillStyle = 'white';
        canvasContext.fillRect(0, 0, canvasElement.width, canvasElement.height);
    }

    // Get the data URL from the canvas element
    const dataUrl = canvasElement.toDataURL();

    if (!transparencyToggleChecked) {
        console.log('restore');
        // Restore the canvas
        canvasContext.restore();
    }

    // Send a message to the extension with this data
    vscode.postMessage({
        command: 'NETWORK-DATA-URL',
        data: dataUrl,
    });
}

/**
 * Function that inserts SVG elements within existing controls of Vis Network.
 * They are then styled with CSS according to current VS Code theme settings.
 * All SVGs source: [https://fonts.google.com/icons]
 * @param {*} networkContainer HTMLElement reference to the Network container.
 */
function createNavigationUi(networkContainer) {
    // Up arrow
    networkContainer.querySelector('.vis-network .vis-navigation .vis-button.vis-up')
        .innerHTML += '<svg class="nav-icon nav-arrow" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>';
    
    // Down arrow
    networkContainer.querySelector('.vis-network .vis-navigation .vis-button.vis-down')
        .innerHTML += '<svg class="nav-icon nav-arrow" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';

    // Left arrow
    networkContainer.querySelector('.vis-network .vis-navigation .vis-button.vis-left')
        .innerHTML += '<svg class="nav-icon nav-arrow" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>';

    // Right arrow
    networkContainer.querySelector('.vis-network .vis-navigation .vis-button.vis-right')
        .innerHTML += '<svg class="nav-icon nav-arrow" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>';

    // Fit canvas
    networkContainer.querySelector('.vis-network .vis-navigation .vis-button.vis-zoomExtends')
        .innerHTML += '<svg class="nav-icon nav-zoom" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><g><path d="M0,0h24v24H0V0z" fill="none"/></g><g><path d="M6,16h12V8H6V16z M8,10h8v4H8V10z M4,15H2v3c0,1.1,0.9,2,2,2h3v-2H4V15z M4,6h3V4H4C2.9,4,2,4.9,2,6v3h2V6z M20,4h-3v2h3v3 h2V6C22,4.9,21.1,4,20,4z M20,18h-3v2h3c1.1,0,2-0.9,2-2v-3h-2V18z"/></g></svg>';

    // Zoom in
    networkContainer.querySelector('.vis-network .vis-navigation .vis-button.vis-zoomIn')
        .innerHTML += '<svg class="nav-icon nav-zoom" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2z"/></svg>';

    // Zoom out
    networkContainer.querySelector('.vis-network .vis-navigation .vis-button.vis-zoomOut')
        .innerHTML += '<svg class="nav-icon nav-zoom" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"/></svg>';
}

/**
 * Handles logic for when the canvas transparency toggle is clicked.
 * @param {*} checked Current state of the checkbox - checked or not.
 * @param {*} networkContainer HTMLElement reference to the Network container.
 */
function handleTransparencyToggleChange(checked, networkContainer) {
    if (checked) {
        console.log('make transparent');
    } else {
        console.log('fill with colour');

        // Get the canvas element
        const canvasElement = networkContainer.getElementsByTagName('canvas')[0];
        fillCanvasBackgroundWithColor(canvasElement, 'aquamarine');
    }
}

function fillCanvasBackgroundWithColor(canvas, color) {
    // Get the 2D drawing context from the provided canvas.
    const context = canvas.getContext('2d');
  
    // We're going to modify the context state, so it's
    // good practice to save the current state first.
    context.save();
  
    // Normally when you draw on a canvas, the new drawing
    // covers up any previous drawing it overlaps. This is
    // because the default `globalCompositeOperation` is
    // 'source-over'. By changing this to 'destination-over',
    // our new drawing goes behind the existing drawing. This
    // is desirable so we can fill the background, while leaving
    // the chart and any other existing drawing intact.
    // Learn more about `globalCompositeOperation` here:
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
    context.globalCompositeOperation = 'destination-over';
  
    // Fill in the background. We do this by drawing a rectangle
    // filling the entire canvas, using the provided color.
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
  
    // Restore the original context state from `context.save()`
    // context.restore();
  }