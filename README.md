# 🎨 The Compiled Thought Themes (TCT)

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](https://marketplace.visualstudio.com/items?itemName=DelowarHossain.compiled-thought-themes)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Downloads](https://img.shields.io/badge/downloads-1k+-brightgreen.svg)](https://marketplace.visualstudio.com/items?itemName=DelowarHossain.compiled-thought-themes)

> **Intelligent, memory-optimized theme collection with smart recommendations, multi-index lookup, and enterprise-grade stability**

## ✨ Features

### 🧠 **Intelligent Theme System**

- **Multi-Index Theme Lookup**: Zero `THEME_NOT_FOUND` errors—themes resolve by manifest label, internal name, or disk filename.
- **Smart Recommendations**: Suggests optimal themes based on language syntax and time of day.
- **Context-Aware Switching**: Tailored color palettes for Python, JavaScript, TypeScript, React, HTML, CSS, Rust, Go, and more.
- **Memory Optimized**: Bounded O(1) LRU caching (up to 10 themes) with automatic TTL cleanup and in-flight request coalescing.
- **Auto Theme Switching**: Seamless automatic day/night theme scheduling.

### 🎨 **Beautiful 48-Theme Collection**

- **48 Carefully Crafted Themes**: Complete aesthetic overhaul ("Dorshoniyo Poriborton") with synchronized canonical branding.
- **WCAG AA Compliance**: High-contrast ratios (>= 4.5:1) ensuring superior legibility and reduced eye strain across light and dark themes.
- **Full TextMate Syntax Highlighting**: Rich token rules for all themes, including modern variants like Aurora Borealis, Cyber Synthwave, Deep Ocean, Desert Oasis, Morning Light, Quantum Dark, and Soft Dawn.
- **Rainbow Bracket Colorization**: Integrated bracket pair colorization across all themes for enhanced code navigation.
- **Workbench & Terminal Polish**: Hand-crafted 16-color ANSI terminal palettes, styled activity bars, status bars, sidebars, and minimap tokens.

### 🔤 **Advanced Typography**

- **Font Optimization**: Single-command typography configuration (Operator Mono, Fira Code, JetBrains Mono, Cascadia Code).
- **Font Ligatures**: One-click ligature enablement for modern code glyphs (`=>`, `===`, `!=`).
- **Italic Variants**: Beautiful cursive and italic variants for keywords, comments, and attributes.

### 📝 **Code Snippets**

- **Python Snippets**: Modern patterns, classes, decorators, and data structures.
- **React / JavaScript Snippets**: Modern React hooks, functional components, and async patterns.
- **TypeScript Support**: Full TypeScript and TSX snippet integration.

---

## 🚀 Quick Start

1. **Install** the extension from the VS Code Marketplace.
2. **Open Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. **Run**: `TCT: Select Theme`.
4. **Choose** your favorite theme from the interactive quick pick with instant preview.

---

## 🎯 Smart Commands

| Command | Identifier | Description |
| :--- | :--- | :--- |
| `TCT: Select Theme` | `DelowarHossain.selectTheme` | QuickPick theme selector with search, tags, and instant preview |
| `TCT: Toggle Italic Variant` | `DelowarHossain.toggleItalic` | Instant toggle between standard and italic counterpart |
| `TCT: Preview Themes` | `DelowarHossain.previewTheme` | Interactive Webview preview panel |
| `TCT: Optimize Font Settings` | `DelowarHossain.optimizeFontSettings` | Configures best-in-class coding fonts and ligatures |
| `TCT: Random Theme` | `DelowarHossain.randomTheme` | Surprise yourself with a randomly selected theme |
| `TCT: Enable Auto Theme Switching` | `DelowarHossain.enableAutoTheme` | Toggles automatic day/night theme scheduling |
| `TCT: View Theme Analytics` | `DelowarHossain.viewThemeAnalytics` | Displays local theme switching metrics and history |
| `TCT: Share Current Theme` | `DelowarHossain.shareTheme` | Generates shareable snippet for current theme settings |

---

## ⚙️ Configuration

Add and customize settings in your `settings.json`:

```json
{
  "DelowarHossain.autoTheme": true,
  "DelowarHossain.smartRecommendations": true,
  "DelowarHossain.fontFamily": "Operator Mono, Fira Code, JetBrains Mono",
  "DelowarHossain.fontLigatures": true,
  "DelowarHossain.enableItalic": true
}
```

---

## 🎨 Theme Catalog (48 Themes)

### 🌟 **Signature TCT Modern Themes**
- **TCT Aurora** & **TCT Aurora Borealis** - Vibrant northern lights emerald and cyan
- **TCT Cyber Synthwave** - High-energy neon cyberpunk aesthetic
- **TCT Deep Ocean** - Calming abyssal navy and aquamarine
- **TCT Desert Oasis** - Warm terracotta, amber, and golden sand
- **TCT Quantum Dark** - Ultra-modern deep void with electric accents
- **TCT Candyland** & **TCT Candyland Italic** - Playful pastel magenta and violet
- **TCT Sunset** - Warm orange, crimson, and twilight purple
- **TCT Forest** - Soothing nature tones and organic emerald
- **TCT Sea Wave** - Ocean blue gradients and cool marine tones
- **TCT Zen Garden** - Balanced charcoal and stone minimalism
- **TCT Starry Night** - Cosmic indigo and starlight gold

### 🔥 **Popular Dark Themes & Italic Variants**
- **TCT Darcula** & **TCT Darcula Italic**
- **TCT Dracula** & **TCT Dracula Italic**
- **TCT Monokai Pro** & **TCT Monokai Italic**
- **TCT Gruvbox** & **TCT Gruvbox Italic**
- **TCT Ayu** & **TCT Ayu Italic**
- **TCT Material** & **TCT Material Italic**
- **TCT One Dark** & **TCT One Dark Italic**
- **TCT Oceanic** & **TCT Oceanic Italic**
- **TCT Slime** & **TCT Slime Italic**
- **TCT Blue Velvet**, **TCT Neon Dreams**, **TCT Professional**, **TCT Night Owl**, **TCT Nord**

### ☀️ **Accessible Light Themes**
- **TCT Simple Light** - Clean, high-contrast minimal light theme (WCAG AA compliant)
- **TCT Simple as Light** - Refined, accessible day editing
- **TCT Morning Light** - Soft morning daylight with gentle amber tones
- **TCT Soft Dawn** - Pastel sunrise glow for relaxed reading
- **TCT Golden Hour** - Warm golden sunlight illumination

---

## 🔧 Performance & Architecture

- **O(1) LRU Caching**: Memory footprint capped with bounded LRU cache (10 items max).
- **TTL Expiration**: Background timer with `.unref()` ensures no process hanging during clean exit.
- **Request Coalescing**: Parallel theme requests share the same promise, preventing disk I/O thrashing.
- **Cross-Platform Resilience**: Works identically across Windows, macOS, and Linux.

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Run End-to-End test suite
node tests/e2e/runner.js

# Package extension (.vsix)
npm run package
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

- 🐛 [Report Issues](https://github.com/mdhossain-2437/open-source-the-compiled-thought-themes/issues)
- 💡 [Feature Requests](https://github.com/mdhossain-2437/open-source-the-compiled-thought-themes/issues)
- ⭐ [Rate & Review](https://marketplace.visualstudio.com/items?itemName=DelowarHossain.compiled-thought-themes)

---

**Made with ❤️ by Delowar Hossain**

_Transform your coding experience with intelligent, beautiful themes that adapt to your workflow._

