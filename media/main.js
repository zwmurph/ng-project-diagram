// This script will be run within the webview itself. It cannot access the main VS Code APIs directly.
(function() {
    const vscode = acquireVsCodeApi();
    const container = document.getElementById('project-network');

    // Event listener for messages sent from the extension to the webview
    window.addEventListener('message', (event) => {
        // Execute functions based on command sent in message
        const message = event.data;
        if (message.command === 'DISPLAY-DIAGRAM') {
            displayDiagram(message.data, container, vscode);
        }
    });

    // Event listener for download button
    document.getElementById('download-btn').addEventListener('click', () => {
        sendNetworkDataUrl(vscode, container);
    });
}());

/**
 * Parses the network data into a Vis.js network and displays according to the options.
 * @param {*} networkMetadata Nodes and Edges to display along with Options for the Network.
 * @param {*} container HTMLElement to act as a container for the Network.
 * @param {*} vscode VS Code API reference.
 */
function displayDiagram(networkMetadata, container, vscode) {
    console.log('data', networkMetadata.data);
    console.log('options', networkMetadata.options);

    // Wait for fonts to load before creating the network
    new Promise((resolve) => {
        if (document.fonts) {
            // Preferred method for loading fonts
            document.fonts
                .load('normal normal 900 24px/1 "Font Awesome 5 Free"')
                .catch(console.error.bind(console, 'Failed to load Font Awesome 5.'))
                .then(function() {
                    // Create a network
                    resolve(new vis.Network(container, networkMetadata.data, networkMetadata.options));
                })
                .catch(console.error.bind(console, 'Failed to render the network with Font Awesome 5.'));
        } else {
            // Fallback for loading fonts (wait and hope)
            window.addEventListener('load', function() {
                setTimeout(function() {
                    // Create a network
                    resolve(new vis.Network(container, networkMetadata.data, networkMetadata.options));
                }, 500);
            });
        }
    }).then((network) => {
        // Update the UI with new icons
        createNavigationUi(container);

        // Only trigger this listener once, after the first drawing of the canvas
        network.once('afterDrawing', () => {
            // Disable hierarchical layout - is only needed for initial render. This allows the user to freely move
            //   nodes on the canvas
            network.setOptions({ layout: { hierarchical: false } });
        });

        // Event listener for double click
        network.on('doubleClick', ({ nodes, edges, event, pointer }) => {
            if (nodes != null && nodes.length > 0) {
                vscode.postMessage({
                    command: 'NODE-DOUBLE-CLICKED',
                    data: nodes[0],
                });
            }
        });
    }, () => {});
}

/**
 * Sends the network data URL back to the extension.
 * @param {*} vscode VS Code API reference.
 * @param {*} networkContainer HTMLElement reference to the Network container.
 */
function sendNetworkDataUrl(vscode, networkContainer) {
    // Get the data URL from the canvas element
    const canvasElement = networkContainer.getElementsByTagName('canvas')[0];
    const dataUrl = canvasElement.toDataURL();

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
