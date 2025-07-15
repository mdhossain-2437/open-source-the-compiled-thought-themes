import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

interface ThemeInfo {
  name: string;
  path: string;
  type: "dark" | "light";
  hasItalic?: boolean;
}

class ThemeManager {
  private themes: ThemeInfo[] = [];
  private context: vscode.ExtensionContext;
  private themeCache = new Map<string, any>();

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadThemes();
  }

  private async loadThemes() {
    try {
      const themesDir = path.join(this.context.extensionPath, "themes");
      const files = await fs.promises.readdir(themesDir);

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const filePath = path.join(themesDir, file);
            const content = await fs.promises.readFile(filePath, "utf8");
            const theme = JSON.parse(content);

            this.themes.push({
              name: theme.name || file.replace(".json", ""),
              path: `./themes/${file}`,
              type: theme.type || "dark",
              hasItalic: file.toLowerCase().includes("italic"),
            });
          } catch (error) {
            console.warn(`Failed to load theme ${file}:`, error);
          }
        }
      }

      // Sort themes by name for better UX
      this.themes.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Failed to load themes:", error);
    }
  }

  getThemes(): ThemeInfo[] {
    return this.themes;
  }

  getThemeByName(name: string): ThemeInfo | undefined {
    return this.themes.find((theme) => theme.name === name);
  }

  // Smart theme recommendation based on time and file type
  getRecommendedTheme(): ThemeInfo {
    const hour = new Date().getHours();
    const isDayTime = hour >= 6 && hour < 18;

    // Get active editor file type
    const activeEditor = vscode.window.activeTextEditor;
    const fileExtension = activeEditor?.document.fileName
      .split(".")
      .pop()
      ?.toLowerCase();

    // Theme recommendations based on file type and time
    const recommendations: { [key: string]: string[] } = {
      py: ["TCT Forest", "TCT Zen Garden"],
      js: ["TCT Sea Wave", "TCT Starry Night"],
      jsx: ["TCT Candyland", "TCT Sunset"],
      ts: ["TCT Sea Wave", "TCT Starry Night"],
      tsx: ["TCT Candyland", "TCT Sunset"],
      css: ["TCT Sunset", "TCT Candyland"],
      html: ["TCT Forest", "TCT Sea Wave"],
    };

    let preferredThemes = recommendations[fileExtension || ""] || [];

    // If no specific recommendation, use time-based selection
    if (preferredThemes.length === 0) {
      preferredThemes = isDayTime
        ? ["TCT Simple Light", "TCT Zen Garden"]
        : ["TCT Starry Night", "TCT Sea Wave"];
    }

    // Find the first available recommended theme
    for (const themeName of preferredThemes) {
      const theme = this.getThemeByName(themeName);
      if (theme) return theme;
    }

    // Fallback to first available theme
    return this.themes[0] || { name: "Default", path: "", type: "dark" };
  }

  // Memory-efficient theme caching
  private async getCachedTheme(themePath: string): Promise<any> {
    if (this.themeCache.has(themePath)) {
      return this.themeCache.get(themePath);
    }

    try {
      const fullPath = path.join(this.context.extensionPath, themePath);
      const content = await fs.promises.readFile(fullPath, "utf8");
      const theme = JSON.parse(content);

      // Cache with size limit (keep only 5 most recent themes)
      if (this.themeCache.size >= 5) {
        const firstKey = this.themeCache.keys().next().value;
        this.themeCache.delete(firstKey);
      }

      this.themeCache.set(themePath, theme);
      return theme;
    } catch (error) {
      console.error(`Failed to load theme ${themePath}:`, error);
      return null;
    }
  }
}

class FontManager {
  private static readonly RECOMMENDED_FONTS = [
    "Operator Mono",
    "Fira Code",
    "JetBrains Mono",
    "Cascadia Code",
    "Source Code Pro",
    "Consolas",
  ];

  static async optimizeFontSettings() {
    const config = vscode.workspace.getConfiguration();
    const currentFont = config.get<string>("editor.fontFamily");

    if (
      !currentFont ||
      !this.RECOMMENDED_FONTS.some((font) => currentFont.includes(font))
    ) {
      const fontString = this.RECOMMENDED_FONTS.join(", ") + ", monospace";
      await config.update(
        "editor.fontFamily",
        fontString,
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        "editor.fontLigatures",
        true,
        vscode.ConfigurationTarget.Global
      );

      vscode.window
        .showInformationMessage(
          "Font optimized for better coding experience!",
          "Learn More"
        )
        .then((selection) => {
          if (selection === "Learn More") {
            vscode.env.openExternal(
              vscode.Uri.parse("https://github.com/kiliman/operator-mono-lig")
            );
          }
        });
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("The Compiled Thought Themes extension is now active!");

  const themeManager = new ThemeManager(context);

  // Initialize font optimization
  FontManager.optimizeFontSettings();

  // Smart theme recommendation on startup
  setTimeout(() => {
    const recommended = themeManager.getRecommendedTheme();
    if (recommended) {
      vscode.window
        .showInformationMessage(
          `💡 Recommended theme for your current context: ${recommended.name}`,
          "Apply Theme",
          "Dismiss"
        )
        .then((selection) => {
          if (selection === "Apply Theme") {
            vscode.commands.executeCommand(
              "workbench.colorTheme.selectTheme",
              recommended.name
            );
          }
        });
    }
  }, 2000);

  // Enhanced theme selector command
  const selectThemeCommand = vscode.commands.registerCommand(
    "delowar.selectTheme",
    async () => {
      try {
        const themes = themeManager.getThemes();
        const items = themes.map((theme) => ({
          label: theme.name,
          description: `${theme.type} theme${
            theme.hasItalic ? " • Italic variant" : ""
          }`,
          detail: theme.path,
          theme: theme,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "Select a TCT theme",
          matchOnDescription: true,
          matchOnDetail: true,
        });

        if (selected) {
          await vscode.commands.executeCommand(
            "workbench.colorTheme.selectTheme",
            selected.theme.name
          );
          vscode.window.showInformationMessage(
            `Applied theme: ${selected.theme.name}`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to select theme: ${error}`);
      }
    }
  );

  // Intelligent italic toggle
  const toggleItalicCommand = vscode.commands.registerCommand(
    "delowar.toggleItalic",
    async () => {
      try {
        const currentTheme = vscode.workspace
          .getConfiguration()
          .get<string>("workbench.colorTheme");
        if (!currentTheme) return;

        const themes = themeManager.getThemes();
        const current = themes.find((t) => t.name === currentTheme);

        if (!current) {
          vscode.window.showWarningMessage(
            "Current theme not found in TCT collection"
          );
          return;
        }

        // Find italic variant
        const baseName = current.name.replace(" Italic", "");
        const isCurrentlyItalic = current.name.includes("Italic");
        const targetName = isCurrentlyItalic ? baseName : `${baseName} Italic`;

        const targetTheme = themes.find((t) => t.name === targetName);

        if (targetTheme) {
          await vscode.commands.executeCommand(
            "workbench.colorTheme.selectTheme",
            targetTheme.name
          );
          vscode.window.showInformationMessage(
            `Switched to ${targetTheme.name}`
          );
        } else {
          vscode.window.showInformationMessage(
            `No ${
              isCurrentlyItalic ? "regular" : "italic"
            } variant available for this theme`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to toggle italic: ${error}`);
      }
    }
  );

  // Auto theme switching based on time (optional feature)
  const autoThemeCommand = vscode.commands.registerCommand(
    "delowar.enableAutoTheme",
    () => {
      const interval = setInterval(() => {
        const hour = new Date().getHours();
        const config = vscode.workspace.getConfiguration();
        const autoThemeEnabled = config.get<boolean>(
          "delowar.autoTheme",
          false
        );

        if (!autoThemeEnabled) {
          clearInterval(interval);
          return;
        }

        const recommended = themeManager.getRecommendedTheme();
        const currentTheme = config.get<string>("workbench.colorTheme");

        if (recommended.name !== currentTheme) {
          vscode.commands.executeCommand(
            "workbench.colorTheme.selectTheme",
            recommended.name
          );
        }
      }, 60000 * 30); // Check every 30 minutes

      vscode.window.showInformationMessage("Auto theme switching enabled!");
    }
  );

  // Theme preview command
  const previewThemeCommand = vscode.commands.registerCommand(
    "delowar.previewTheme",
    async () => {
      const themes = themeManager.getThemes();
      const panel = vscode.window.createWebviewPanel(
        "themePreview",
        "TCT Theme Preview",
        vscode.ViewColumn.Two,
        { enableScripts: true }
      );

      panel.webview.html = generateThemePreviewHTML(themes);
    }
  );

  context.subscriptions.push(
    selectThemeCommand,
    toggleItalicCommand,
    autoThemeCommand,
    previewThemeCommand
  );

  // Listen for configuration changes to optimize performance
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("workbench.colorTheme")) {
      // Clear cache when theme changes to free memory
      setTimeout(() => {
        if (themeManager["themeCache"].size > 3) {
          themeManager["themeCache"].clear();
        }
      }, 5000);
    }
  });
}

function generateThemePreviewHTML(themes: ThemeInfo[]): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
            .theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
            .theme-card { border: 1px solid #ccc; border-radius: 8px; padding: 15px; background: #f9f9f9; }
            .theme-name { font-weight: bold; margin-bottom: 10px; }
            .theme-type { color: #666; font-size: 0.9em; }
        </style>
    </head>
    <body>
        <h1>TCT Theme Collection</h1>
        <div class="theme-grid">
            ${themes
              .map(
                (theme) => `
                <div class="theme-card">
                    <div class="theme-name">${theme.name}</div>
                    <div class="theme-type">${theme.type} theme${
                  theme.hasItalic ? " • Italic" : ""
                }</div>
                </div>
            `
              )
              .join("")}
        </div>
    </body>
    </html>`;
}

export function deactivate() {
  console.log("The Compiled Thought Themes extension is now deactivated");
}
