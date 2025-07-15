# Installation Guide

## Prerequisites

1. **Node.js** (version 14.x or higher)

   - Download from: https://nodejs.org/

2. **Visual Studio Code** (version 1.70.0 or higher)

   - Download from: https://code.visualstudio.com/

3. **Operator Mono Font** (optional but recommended)
   - For the best experience with italic themes

## Building from Source

1. **Clone or download this repository**

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Compile the extension**

   ```bash
   npm run compile
   ```

4. **Package the extension**

   ```bash
   npm run package
   ```

   This will create a `.vsix` file in the root directory.

## Installing the Extension

### Method 1: Command Line

```bash
code --install-extension delowar-all-in-one-extension-1.0.0.vsix
```

### Method 2: VS Code UI

1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Click on the "..." menu
4. Select "Install from VSIX..."
5. Browse to the `.vsix` file and select it

## Quick Build (Windows)

Simply run the provided batch file:

```bash
build.bat
```

## Setting Up Operator Mono Font

1. Install Operator Mono font on your system
2. Open VS Code settings (Ctrl+,)
3. Search for "font family"
4. Set to: `Operator Mono, Fira Code, Consolas, 'Courier New', monospace`

Or add to your `settings.json`:

```json
{
  "editor.fontFamily": "Operator Mono, Fira Code, Consolas, 'Courier New', monospace",
  "editor.fontLigatures": true
}
```

## Troubleshooting

### TypeScript errors during compilation

Make sure you have all dependencies installed:

```bash
npm install --save-dev @types/vscode @types/node typescript
```

### Extension not loading

1. Check the VS Code version (must be 1.70.0 or higher)
2. Reload VS Code window (Ctrl+R or Cmd+R)
3. Check the Output panel for any error messages

### Themes not showing up

1. Make sure all theme JSON files are in the `themes/` directory
2. Verify the paths in `package.json` are correct
3. Reload VS Code window

## Development

To run the extension in development mode:

1. Open this project in VS Code
2. Press F5 to launch a new VS Code window with the extension loaded
3. Make changes and reload the window to test
