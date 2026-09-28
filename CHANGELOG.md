# Change Log

All notable changes to the "The Compiled Thought Themes Extension" will be documented in this file.

## [4.0.0] - 2026-09-28

### 🚀 Major v4.0.0 Release - Core Stability, Semantic Highlighting & Visual Overhaul

#### 🧠 Theme Switching & Core Extension Stability
- **Multi-Index Theme Lookup**: Implemented bulletproof multi-index theme lookup in `ThemeManager` supporting lookup by manifest label (e.g. `"TCT Ayu"`), internal JSON name (e.g. `"ayu"`), and disk filename (e.g. `"ayu.json"`), resolving paths with `path.resolve(context.extensionPath, theme.path)` and permanently eliminating `THEME_NOT_FOUND` errors.
- **LRU Cache & Concurrency**: Unified `ThemeManager` with O(1) bounded LRU cache eviction (10 items max), 1-hour TTL with disposable background timer (`.unref()` clean exit), and promise coalescing for concurrent in-flight loads.
- **Clean Codebase Consolidation**: Removed unintegrated duplicate files `src/iconPacks.new.ts` and `src/themeManager.new.ts`.
- **Manifest Registration**: Registered `darculaItalic.json` and `TCTAurora.json` in `package.json` `contributes.themes`, completing the 48-theme collection.
- **Command Reliability**: Wired all extension commands (`DelowarHossain.selectTheme`, `toggleItalic`, `previewTheme`, `optimizeFontSettings`, `randomTheme`, `enableAutoTheme`, `customizeTheme`) with comprehensive error handling.

#### 🌟 Zero-Reload Dynamic Customization Engine
- **Runtime Style Toggling**: Added `CustomizationManager` and `TCT: Customize Theme Styles (Italic/Bold/Accents)` interactive QuickPick command.
- **Customization Settings**: Introduced `tct.customization.italicComments`, `tct.customization.italicKeywords`, `tct.customization.boldKeywords`, `tct.customization.accentStatusBar`, and `tct.customization.vividMode` without restarting VS Code.
- **Third-Party Theme Safety**: Scoped customizations strictly to TCT themes (`"[TCT *]"` brackets), leaving other themes untouched.

#### 🧠 Full Semantic Highlighting Across All 48 Themes
- **Modern Language Server Integration**: Added `"semanticHighlighting": true` and rich 29-rule `semanticTokenColors` (interfaces, type parameters, readonly variables, function/method declarations, enum members) across all 48 themes.
- **WCAG 2.1 AA Compliance**: Mathematically verified contrast ratios exceeding 4.5:1 for all semantic tokens and normal text against editor backgrounds.
- **Dual Syntax Token Invariant**: Complete TextMate `tokenColors` preserved as standard fallbacks for non-semantic environments.

#### 🎨 Visual & Aesthetic Overhaul ("Dorshoniyo Poriborton")
- **Canonical Naming Synchronization**: Synchronized internal `"name"` attribute across legacy branded themes to match canonical `package.json` labels, eliminating legacy third-party naming artifacts.
- **UI Theme Type Correction**: Fixed `TCTGoldenHour.json` manifest registration to `uiTheme: "vs"` to properly match its light canvas.
- **Workbench UI Polish**: Added comprehensive terminal ANSI 16-color palettes, tab headers, and minimap tokens across themes.
- **Marketplace Branding**: Added `galleryBanner` (`#0B132B`) and marketplace badges to `package.json`.

#### 🧪 Quality Gate & Test Infrastructure
- **147 Tests Passing (100% Success)**: 62 Jest unit and lifecycle tests and 85 multi-tier E2E scenario tests passing with zero failures.
- **Zero Lint Warnings**: Remediated all ESLint warnings down to 0 across the entire codebase (`npm run lint`).
- **Automated CI/CD**: Added Node 20/22 GitHub Actions workflow (`ci.yml`) and dual-publishing release pipeline (`publish.yml`) for VS Code Marketplace & Open VSX.
- **Clean VSIX Packaging**: Verified production packaging of `compiled-thought-themes-4.0.0.vsix` (69 files, 1.50 MB, zero dead code or leaked artifacts).

## [3.1.0] - 2025-01-16

### Enhanced Edition Release

- ✨ Rebranded as "The Compiled Thought Themes - Enhanced Edition"
- 🔄 Version bump to 3.1.0 for enhanced release
- 📦 Updated package configuration for new release
- 🎨 Added new premium theme variants: Aurora, Aurora Borealis, Cyber Synthwave, Deep Ocean, Desert Oasis, Golden Hour, Neon Dreams, Quantum Dark
- 🌅 Enhanced light theme collection with Morning Light and Soft Dawn
- 🔧 Improved extension stability and performance

## [3.0.0] - 2025-07-16

### Major Update

- ThemeManager overhaul: improved memory, speed, and error handling
- LRU+TTL cache, metrics, and smarter invalidation
- Theme preview, search, and quick switch features
- More light, dark, and unique TCT themes
- Workspace-specific theme settings and migration system
- Theme export/import, user ratings, and analytics
- Modularized code, better docs, and new tests
- Bug fixes: duplicate cache logic, validation errors, diagnostics

## [2.0.0] - 2025-01-15

### Added

- Initial release with 30+ themes
- Python code snippets
- React/JavaScript/TypeScript code snippets
- Support for Operator Mono font with italic variants
- Theme selector command
- Toggle italic variant command
- Configuration options for font settings

### Themes Included

#### Dark Themes

- Ayu / Ayu Italic
- Blue Velvet
- Darcula / Darcula Italic
- Dark Theme
- Default Color
- Dracula
- Gruvbox / Gruvbox Italic
- Material / Material Italic
- Monokai / Monokai Italic
- Monokai Pro
- Ocean Blue
- Oceanic / Oceanic Italic
- Official
- One Dark / One Dark Italic
- Party
- Peace of Eye / Peace of Eye Dracula
- Professional
- Shades of Grey
- Slime / Slime Italic
- Traditional
- Vintage

#### Light Themes

- Simple Light

### Features

- Quick theme selection via command palette
- Automatic font configuration for Operator Mono
- Font ligature support
- Snippet support for multiple languages
