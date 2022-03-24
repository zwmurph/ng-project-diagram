// This script will be run within the webview itself. It cannot access the main VS Code APIs directly.
(function() {
    const vscode = acquireVsCodeApi();
    const container = document.getElementById('project-network');
    let network;

    // Event listener for messages sent from the extension to the webview
    window.addEventListener('message', (event) => {
        // Execute functions based on command sent in message
        const message = event.data;
        if (message.command === 'DISPLAY-DIAGRAM') {
            network = displayDiagram(message.data, container, vscode);
        } else if (message.command === 'DISPLAY-METADATA') {
            displayNodeMetaData(message.data);
        } else if (message.command === 'RESET-UI') {
            resetUI(true, true, true);
        } else if (message.command === 'SET-LABEL-OPTIONS') {
            network.setOptions({ nodes: { font: { color: message.data }}});
        }
    });

    // Event listener for download button
    document.getElementById('download-btn').addEventListener('click', () => {
        resetUI(false, true, false);
        sendNetworkDataUrl(vscode, container);
    });

    // Event listener for reset layout button
    document.getElementById('reset-btn').addEventListener('click', () => {
        resetUI(true, true, true);
        // Send a message to the extension
        vscode.postMessage({ command: 'RESET-LAYOUT' });
    });

    // Event listener for sync button
    document.getElementById('sync-btn').addEventListener('click', () => {
        resetUI(true, true, true);
        // Send a message to the extension
        vscode.postMessage({ command: 'SYNC-FILE-CHANGES' });
    });

    // Loop toggles and add a listener
    document.querySelectorAll('.toggle-input').forEach(function(input) {
        input.addEventListener('change', function() {
            resetUI(false, false, true);

            // Get the states of all toggles
            let toggleStates = [];
            document.querySelectorAll('.toggle-input').forEach(function(item) {
                toggleStates.push({ group: item.name, state: item.checked });
            });

            // Send a message to the extension
            vscode.postMessage({ command: 'FILTER-NODE-GROUPS', data: toggleStates });
        });
    });

    // Event listener for dropdown
    document.getElementById('dropdown-btn').addEventListener('click', () => {
        toggleDropdownContent();
    });

    // Event listener for transparency toggle
    document.getElementById('canvas-background-toggle').addEventListener('change', function() {
        resetUI(false, true, false);
        // Send a message to the extension
        vscode.postMessage({ command: 'TRANSPARENCY-TOGGLED', data: this.checked });

        // Change the canvas background
        container.classList.toggle('fill-background');
    });
}());

/**
 * Parses the network data into a Vis.js network and displays according to the options.
 * @param {*} networkMetadata Nodes and Edges to display along with Options for the Network.
 * @param {*} container HTMLElement to act as a container for the Network.
 * @param {*} vscode VS Code API reference.
 * @returns Instance of created network.
 */
function displayDiagram(networkMetadata, container, vscode) {
    const network = new vis.Network(container, networkMetadata.data, networkMetadata.options);

    // Update the UI with new icons
    createNavigationUi(container);

    // Only trigger this listener once, after the first drawing of the canvas
    network.once('afterDrawing', () => {
        // Disable hierarchical layout - is only needed for initial render. This allows the user to freely move
        //   nodes on the canvas
        network.setOptions({ layout: { hierarchical: false } });
    });

    // Event listener for single click
    network.on('click', () => {
        resetUI(false, true, false);
    });

    // Event listener for double click
    network.on('doubleClick', ({ nodes }) => {
        if (nodes != null && nodes.length > 0) {
            vscode.postMessage({
                command: 'NODE-DOUBLE-CLICKED',
                data: nodes[0],
            });
        }
    });

    // Event listener for node selection
    network.on('selectNode', ({ nodes }) => {
        if (nodes != null && nodes.length > 0) {
            vscode.postMessage({
                command: 'NODE-SELECTED',
                data: nodes[0],
            });
        }
    });

    // Event listener for node deselection
    network.on('deselectNode', () => {
        // Hide all detail containers on node deselect
        resetUI(false, false, true);
    });

    // Event listener for canvas drag
    network.on('dragStart', () => {
        // Hide all detail containers on node deselect
        resetUI(false, true, false);
    });

    // Event listeners for navigation buttons
    document.querySelectorAll('.vis-navigation .vis-button').forEach(function(button) {
        button.addEventListener('mousedown', function() {
            resetUI(false, true, false);
        });
    });

    return network;
}

/**
 * Displays metadata for a selected node.
 * @param {*} nodeMetadata Metadata for selected node.
 */
function displayNodeMetaData(nodeMetadata) {   
    // Set the metadata into the given fields
    if (nodeMetadata.containerId === 'module-details-container') {
        // Modules
        document.getElementById('metadata-module-name').innerHTML = nodeMetadata.name;
        document.getElementById('metadata-module-imports').innerHTML = nodeMetadata.imports;
        document.getElementById('metadata-module-declarations').innerHTML = nodeMetadata.declarations;
        document.getElementById('metadata-module-providers').innerHTML = nodeMetadata.providers;
        document.getElementById('metadata-module-type').innerHTML = nodeMetadata.type;
    } else if (nodeMetadata.containerId === 'component-details-container') {
        // Components
        document.getElementById('metadata-component-name').innerHTML = nodeMetadata.name;
        document.getElementById('metadata-component-selector').innerHTML = nodeMetadata.selector;
        document.getElementById('metadata-component-changedetection').innerHTML = nodeMetadata.changeDetection;
        document.getElementById('metadata-component-injecteddependencies').innerHTML = nodeMetadata.injectedDependencies;
        document.getElementById('metadata-component-inputs').innerHTML = nodeMetadata.inputs;
        document.getElementById('metadata-component-outputs').innerHTML = nodeMetadata.outputs;
    } else if (nodeMetadata.containerId === 'injectable-details-container') {
        // Injectables
        document.getElementById('metadata-injectable-name').innerHTML = nodeMetadata.name;
        document.getElementById('metadata-injectable-providedin').innerHTML = nodeMetadata.providedIn;
    }

    // Make the container visible
    const container = document.getElementById(nodeMetadata.containerId);
    container.style.display = 'flex';
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
 * All SVGs source: [https://fonts.google.com/icons].
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
 * Toggles dropdown content and icon.
 * @param {*} state Show or hide.
 */
function toggleDropdownContent(state) {
    // Toggle dropdown content
    if (state === 'show') {
        document.querySelector('#dropdown-toggle-content').classList.add('shown');
        document.querySelector('#drop-down-icon').classList.remove('shown');
        document.querySelector('#drop-up-icon').classList.add('shown');
    } else if (state === 'hide') {
        document.querySelector('#dropdown-toggle-content').classList.remove('shown');
        document.querySelector('#drop-down-icon').classList.add('shown');
        document.querySelector('#drop-up-icon').classList.remove('shown');
    } else {
        document.querySelector('#dropdown-toggle-content').classList.toggle('shown');
        document.querySelector('#drop-down-icon').classList.toggle('shown');
        document.querySelector('#drop-up-icon').classList.toggle('shown');
    }
}

/**
 * Resets sections of the UI.
 * @param {*} resetToggles Mark toggles back to checked.
 * @param {*} hideDropdowns Hide dropdown containers.
 * @param {*} hideNodeDetails Hide node detail containers.
 */
function resetUI(resetToggles, hideDropdowns, hideNodeDetails) {
    // Reset toggle checked states
    if (resetToggles === true) {
        document.querySelectorAll('.toggle-input').forEach(function(element) {
            element.checked = true;
        });
    }
    // Hide dropdown containers
    if (hideDropdowns === true) {
        toggleDropdownContent('hide');
    }
    // Hide node detail containers
    if (hideNodeDetails === true) {
        document.querySelectorAll('.details-container').forEach((container) => container.style.display = 'none');
    }
}
