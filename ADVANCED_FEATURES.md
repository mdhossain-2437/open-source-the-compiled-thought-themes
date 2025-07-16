# 🎨 Advanced Features Guide

## 🤖 AI-Powered Features (Gemini Integration)

### Code Analysis

- **Real-time Bug Detection**: Gemini AI analyzes your code in real-time
- **Context-Aware Suggestions**: Get smart recommendations based on your coding patterns
- **Performance Optimization**: AI-powered suggestions for code optimization

### Theme Recommendations

- **Smart Color Suggestions**: AI analyzes your preferences and suggests color combinations
- **Context-Based Themes**: Automatically switches themes based on:
  - Time of day
  - Programming language
  - Project type
  - Coding patterns

## 🎨 Theme Customization

### Custom Theme Builder

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run `TCT: Open Theme Customizer`
3. Modify:
   - Syntax colors
   - UI elements
   - Contrast ratios
   - Background effects
   - Icon colors

### Theme Export/Import

```json
{
  "name": "My Custom Theme",
  "type": "dark",
  "colors": {
    "editor.background": "#1E1E1E",
    "editor.foreground": "#D4D4D4"
  },
  "tokenColors": [...]
}
```

## 🎯 Icon Libraries

### Available Icon Sets

- **Octicons**: GitHub's icon set
- **Font Awesome**: Comprehensive icon collection
- **Material Design Icons**: Google's material design
- **Feather Icons**: Simple, elegant icons

### Usage in Settings

```json
{
  "tct.icons.pack": "material-design",
  "tct.icons.size": "medium",
  "tct.icons.style": "filled"
}
```

## ⚙️ Advanced Settings

### AI Configuration

```json
{
  "tct.ai.enabled": true,
  "tct.ai.suggestions": true,
  "tct.ai.codeAnalysis": true,
  "tct.ai.updateInterval": 5000
}
```

### Theme Automation

```json
{
  "tct.themes.autoSwitch": true,
  "tct.themes.schedule": {
    "morning": "TCT Light Professional",
    "afternoon": "TCT Sea Wave",
    "evening": "TCT Starry Night"
  }
}
```

### Performance Optimization

```json
{
  "tct.performance.cacheSize": 5,
  "tct.performance.preloadThemes": false,
  "tct.performance.lazyLoadIcons": true
}
```
