# NG Project Diagram

> Visualises the structure of an Angular project from source code

## Launching the extension
- `'Show NG Project Diagram'` in the Command Palette (<kbd>Ctrl+Shift+P</kbd>), OR
- From the context menu option in the Explorer (<kbd>Ctrl+Shift+E</kbd>).

## Features

- Displays modules, components, services, and their relationships as an interactive network with movable symbols.
- Unique icons and colours for groups of symbols to help distinguish between them.
- Single-click symbols to view more details.
- Double-click symbols to open the corresponding file in the editor.
- Save network as image (location: `'<workspaceRoot>/.ng-project-diagram/project-diagram.png'`).
- Buttons to reset layout back to default (quick-reset) and to sync file changes (full-refresh).
- Filter by symbol type.
- Transparency support (also extends to transparency included/excluded in saved image).
- Zoom and pan network with mouse, keyboard (<kbd>&#8593; UP</kbd> <kbd>&#8595; DOWN</kbd> <kbd>&#8592; LEFT</kbd> <kbd>&#8594; RIGHT</kbd> <kbd>- MINUS</kbd> <kbd>+ PLUS</kbd>), or on-screen navigation controls.
- User interface compliments the current VS Code colour theme.

## Requirements

- Support for Angular versions &#8804; 12. Compatibility with Angular versions &lt; 10 is untested.
- VS Code version &#8805; 1.63.2.

## Known Issues

- VS Code theme colour change detection is not automatic. When switching between light, dark, or high-contrast themes, you will need to trigger a `quick-reset` to the network for navigation controls and symbol label colours to update.

## Release Notes

#### 0.1.0
- Initial release.
