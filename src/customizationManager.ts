import * as vscode from "vscode";

export interface CustomizationOptions {
  italicComments?: boolean;
  italicKeywords?: boolean;
  boldKeywords?: boolean;
  accentStatusBar?: boolean;
  vividMode?: boolean;
}

export class CustomizationManager {
  private static registeredThemes: string[] = [];

  /**
   * Register the canonical labels of all TCT themes so customizations can target them.
   */
  public static setRegisteredThemes(themeLabels: string[]): void {
    this.registeredThemes = [...new Set(themeLabels)];
  }

  /**
   * Read the current customization settings from configuration.
   */
  public static getOptions(): Required<CustomizationOptions> {
    const config = vscode.workspace.getConfiguration("tct.customization");
    return {
      italicComments: config.get<boolean>("italicComments", true),
      italicKeywords: config.get<boolean>("italicKeywords", false),
      boldKeywords: config.get<boolean>("boldKeywords", false),
      accentStatusBar: config.get<boolean>("accentStatusBar", false),
      vividMode: config.get<boolean>("vividMode", false),
    };
  }

  /**
   * Apply dynamic token and color customizations to VS Code configuration.
   * Modifies only entries scoped to registered TCT themes, preserving other theme customizations.
   */
  public static async applyCustomizations(target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
    const options = this.getOptions();
    const editorConfig = vscode.workspace.getConfiguration("editor");
    const workbenchConfig = vscode.workspace.getConfiguration("workbench");

    const tokenCustomizations = (editorConfig.get<Record<string, Record<string, unknown>>>("tokenColorCustomizations") || {});
    const updatedTokens: Record<string, Record<string, unknown>> = { ...tokenCustomizations };

    const colorCustomizations = (workbenchConfig.get<Record<string, Record<string, string>>>("colorCustomizations") || {});
    const updatedColors: Record<string, Record<string, string>> = { ...colorCustomizations };

    // Construct textMate rules for font styles
    const fontStyleKeywords = [
      options.italicKeywords ? "italic" : "",
      options.boldKeywords ? "bold" : "",
    ].filter(Boolean).join(" ");

    const textMateRules: Array<{ scope: string | string[]; settings: { fontStyle?: string; foreground?: string } }> = [];

    textMateRules.push({
      scope: ["comment", "punctuation.definition.comment"],
      settings: { fontStyle: options.italicComments ? "italic" : "" },
    });

    if (fontStyleKeywords) {
      textMateRules.push({
        scope: [
          "keyword",
          "keyword.control",
          "storage",
          "storage.type",
          "keyword.operator.expression",
          "keyword.operator.new",
        ],
        settings: { fontStyle: fontStyleKeywords },
      });
    }

    if (options.vividMode) {
      textMateRules.push(
        {
          scope: ["string", "string.quoted"],
          settings: { foreground: "#A6E22E" },
        },
        {
          scope: ["constant.numeric", "constant.language"],
          settings: { foreground: "#FD971F" },
        },
        {
          scope: ["entity.name.function", "support.function"],
          settings: { foreground: "#66D9EF" },
        }
      );
    }

    const tctTokenOverride: Record<string, unknown> = {
      comments: options.italicComments ? "italic" : "",
      textMateRules,
    };

    // Apply to each registered TCT theme
    for (const themeLabel of this.registeredThemes) {
      const themeKey = `[${themeLabel}]`;
      updatedTokens[themeKey] = tctTokenOverride;

      if (options.accentStatusBar) {
        updatedColors[themeKey] = {
          ...(updatedColors[themeKey] || {}),
          "statusBar.background": "#0B132B",
          "statusBar.foreground": "#6FFFE9",
          "statusBarItem.hoverBackground": "#1C2541",
        };
      } else if (updatedColors[themeKey] && updatedColors[themeKey]["statusBar.background"] === "#0B132B") {
        const cleaned = { ...updatedColors[themeKey] };
        delete cleaned["statusBar.background"];
        delete cleaned["statusBar.foreground"];
        delete cleaned["statusBarItem.hoverBackground"];
        if (Object.keys(cleaned).length > 0) {
          updatedColors[themeKey] = cleaned;
        } else {
          delete updatedColors[themeKey];
        }
      }
    }

    await Promise.all([
      editorConfig.update("tokenColorCustomizations", updatedTokens, target),
      workbenchConfig.update("colorCustomizations", updatedColors, target),
    ]);
  }

  /**
   * Reset all TCT customizations back to default theme definitions.
   */
  public static async resetCustomizations(target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
    const editorConfig = vscode.workspace.getConfiguration("editor");
    const workbenchConfig = vscode.workspace.getConfiguration("workbench");

    const tokenCustomizations = (editorConfig.get<Record<string, Record<string, unknown>>>("tokenColorCustomizations") || {});
    const updatedTokens: Record<string, Record<string, unknown>> = { ...tokenCustomizations };

    const colorCustomizations = (workbenchConfig.get<Record<string, Record<string, string>>>("colorCustomizations") || {});
    const updatedColors: Record<string, Record<string, string>> = { ...colorCustomizations };

    for (const themeLabel of this.registeredThemes) {
      delete updatedTokens[`[${themeLabel}]`];
      delete updatedColors[`[${themeLabel}]`];
    }

    await Promise.all([
      editorConfig.update("tokenColorCustomizations", updatedTokens, target),
      workbenchConfig.update("colorCustomizations", updatedColors, target),
    ]);
  }

  /**
   * Interactive QuickPick menu for toggling customization options.
   */
  public static async promptCustomizationQuickPick(): Promise<void> {
    const options = this.getOptions();
    const config = vscode.workspace.getConfiguration("tct.customization");

    const items = [
      {
        id: "italicComments",
        label: `$(symbol-keyword) Italic Comments: ${options.italicComments ? "ON" : "OFF"}`,
        description: "Toggle cursive/italic font style for all code comments",
        value: !options.italicComments,
      },
      {
        id: "italicKeywords",
        label: `$(symbol-operator) Italic Keywords: ${options.italicKeywords ? "ON" : "OFF"}`,
        description: "Toggle cursive/italic font style for control keywords (if, return, def)",
        value: !options.italicKeywords,
      },
      {
        id: "boldKeywords",
        label: `$(bold) Bold Keywords: ${options.boldKeywords ? "ON" : "OFF"}`,
        description: "Toggle bold emphasis on language keywords",
        value: !options.boldKeywords,
      },
      {
        id: "accentStatusBar",
        label: `$(paintcan) Accent Status Bar: ${options.accentStatusBar ? "ON" : "OFF"}`,
        description: "Apply TCT signature Aurora Navy & Aquamarine to status bar",
        value: !options.accentStatusBar,
      },
      {
        id: "vividMode",
        label: `$(sparkle) Vivid Mode: ${options.vividMode ? "ON" : "OFF"}`,
        description: "Boost color saturation and vibrancy across syntax tokens",
        value: !options.vividMode,
      },
      {
        id: "reset",
        label: "$(clear-all) Reset All Customizations",
        description: "Restore all themes to default untouched styles",
        value: false,
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a TCT Theme Style to toggle (instant zero-reload preview)",
    });

    if (!selected) {
      return;
    }

    if (selected.id === "reset") {
      await Promise.all([
        config.update("italicComments", true, vscode.ConfigurationTarget.Global),
        config.update("italicKeywords", false, vscode.ConfigurationTarget.Global),
        config.update("boldKeywords", false, vscode.ConfigurationTarget.Global),
        config.update("accentStatusBar", false, vscode.ConfigurationTarget.Global),
        config.update("vividMode", false, vscode.ConfigurationTarget.Global),
      ]);
      await this.resetCustomizations();
      vscode.window.showInformationMessage("TCT Theme Styles reset to defaults.");
      return;
    }

    await config.update(selected.id, selected.value, vscode.ConfigurationTarget.Global);
    await this.applyCustomizations();
    vscode.window.showInformationMessage(`TCT Theme Style updated: ${selected.label.split(":")[0]} is now ${selected.value ? "ON" : "OFF"}`);
  }
}
