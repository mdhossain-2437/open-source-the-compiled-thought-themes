import * as vscode from "vscode";
import { ThemePreviewPanel } from "./webviews/themePreview";
import { ThemeTransitionManager } from "./transitions/themeTransition";
import type { ThemeManager } from "./themeManager";

// Memory-optimized theme manager instance
let themeManager: ThemeManager;

class FontManager {
  private static readonly RECOMMENDED_FONTS = new Set([
    "Operator Mono",
    "Fira Code",
    "JetBrains Mono",
    "Cascadia Code",
    "Source Code Pro",
    "Consolas",
  ]);

  private static fontCheckPromise: Promise<void> | null = null;

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  static async optimizeFontSettings(): Promise<void> {
    // Debounce font optimization
    if (this.fontCheckPromise) {
      return this.fontCheckPromise;
    }

    this.fontCheckPromise = (async () => {
      try {
        const config = vscode.workspace.getConfiguration();
        const currentFont = config.get<string>("editor.fontFamily", "");

        if (
          !currentFont ||
          !Array.from(this.RECOMMENDED_FONTS).some((font) =>
            currentFont.includes(font)
          )
        ) {
          const fontString =
            Array.from(this.RECOMMENDED_FONTS).join(", ") + ", monospace";

          await Promise.all([
            config.update(
              "editor.fontFamily",
              fontString,
              vscode.ConfigurationTarget.Global
            ),
            config.update(
              "editor.fontLigatures",
              true,
              vscode.ConfigurationTarget.Global
            ),
          ]);

          const response = await vscode.window.showInformationMessage(
            "Font optimized for better coding experience!",
            "Learn More"
          );

          if (response === "Learn More") {
            await vscode.env.openExternal(
              vscode.Uri.parse("https://github.com/kiliman/operator-mono-lig")
            );
          }
        }
      } catch (error) {
        console.error("Failed to optimize fonts:", error);
      } finally {
        this.fontCheckPromise = null;
      }
    })();

    return this.fontCheckPromise;
  }
}

// Update the activate function
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Initialize ThemeManager
  themeManager = await import("./themeManager").then(({ ThemeManager }) =>
    ThemeManager.getInstance(context)
  );

  console.log("The Compiled Thought Themes extension is now active!");

  // Initialize font optimization
  await FontManager.optimizeFontSettings();

  // Smart theme recommendation on startup
  setTimeout(async () => {
    const editor = vscode.window.activeTextEditor;
    const languageId = editor ? editor.document.languageId : undefined;
    const recommended = await themeManager.getRecommendedTheme(languageId);

    if (recommended) {
      const selection = await vscode.window.showInformationMessage(
        `💡 Recommended theme for your current context: ${recommended.theme.name}`,
        "Apply Theme",
        "Dismiss"
      );

      if (selection === "Apply Theme") {
        await themeManager.setTheme(recommended.id);
      }
    }
  }, 2000);

  // Enhanced theme selector command
  const selectThemeCommand = vscode.commands.registerCommand(
    "DelowarHossain.selectTheme",
    async () => {
      const originalTheme =
        vscode.workspace.getConfiguration().get("workbench.colorTheme") || "";

      try {
        const quickPick = vscode.window.createQuickPick();
        quickPick.placeholder = "Select a theme to preview";
        const themeIds = themeManager.getAllThemeIds();
        quickPick.items = themeIds.map((themeId) => {
          const metadata = themeManager.getThemeMetadata(themeId);
          return {
            id: themeId,
            label: metadata?.label || themeId,
            description: metadata?.description,
          };
        });

        quickPick.onDidSelectItem(async (item) => {
          if (item) {
            await themeManager.setTheme((item as any).id);
          }
        });

        let accepted = false;

        quickPick.onDidAccept(async () => {
          accepted = true;
          const selected = quickPick.selectedItems[0];
          if (selected) {
            // Theme is already set by onDidSelectItem, so we just need to confirm it.
            vscode.window.showInformationMessage(
              `Applied theme: ${selected.label}`
            );
          }
          quickPick.hide();
        });

        quickPick.onDidHide(async () => {
          if (!accepted) {
            await themeManager.setTheme(originalTheme);
          }
          quickPick.dispose();
        });

        quickPick.show();
      } catch (error) {
        // Restore original theme on error
        await themeManager.setTheme(originalTheme);
        vscode.window.showErrorMessage(`Failed to select theme: ${error}`);
      }
    }
  );

  // Intelligent italic toggle
  const toggleItalicCommand = vscode.commands.registerCommand(
    "DelowarHossain.toggleItalic",
    async () => {
      try {
        const currentThemeId = vscode.workspace
          .getConfiguration()
          .get<string>("workbench.colorTheme");
        if (!currentThemeId) return;

        const themeMetadata = themeManager.getThemeMetadata(currentThemeId);

        if (!themeMetadata) {
          vscode.window.showWarningMessage(
            "Current theme not found in TCT collection"
          );
          return;
        }

        const isItalic = themeMetadata.label.includes("Italic");
        const baseThemeId = isItalic
          ? themeMetadata.id.replace("-italic", "")
          : themeMetadata.id;
        const baseThemeMetadata = themeManager.getThemeMetadata(baseThemeId);

        if (!baseThemeMetadata) {
          vscode.window.showWarningMessage("Base theme could not be determined.");
          return;
        }

        const targetThemeId =
          isItalic || !baseThemeMetadata.variants?.italic
            ? baseThemeMetadata.id
            : baseThemeMetadata.variants.italic.id;

        if (targetThemeId) {
          await themeManager.setTheme(targetThemeId);
          const targetTheme = await themeManager.getTheme(targetThemeId);
          vscode.window.showInformationMessage(
            `Switched to ${targetTheme.name}`
          );
        } else {
          vscode.window.showInformationMessage(
            `No variant available for this theme.`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to toggle italic: ${error}`);
      }
    }
  );

  // Register theme preview command
  context.subscriptions.push(
    vscode.commands.registerCommand("DelowarHossain.previewTheme", () => {
      ThemePreviewPanel.show(context.extensionUri, themeManager);
    })
  );

  // Set up theme transitions
  const themeTransitionManager = ThemeTransitionManager.getInstance(context);

  // Register theme transition handler
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("workbench.colorTheme")) {
        const config = vscode.workspace.getConfiguration();
        const newTheme = config.get<string>("workbench.colorTheme");
        if (newTheme) {
          await themeTransitionManager.transitionTo(newTheme);
        }
      }
    })
  );

  // Clean up on deactivate
  context.subscriptions.push({
    dispose: (): void => {
      themeTransitionManager.dispose();
      if (ThemePreviewPanel.currentPanel) {
        ThemePreviewPanel.currentPanel.dispose();
      }
    },
  });

  const surpriseMeCommand = vscode.commands.registerCommand(
    "DelowarHossain.surpriseMe",
    async () => {
      const themeIds = themeManager.getAllThemeIds();
      const randomThemeId =
        themeIds[Math.floor(Math.random() * themeIds.length)];
      await themeManager.setTheme(randomThemeId);
      const theme = await themeManager.getTheme(randomThemeId);
      vscode.window.showInformationMessage(`Switched to a surprise theme: ${theme.name}`);
    }
  );

  context.subscriptions.push(
    selectThemeCommand,
    toggleItalicCommand,
    surpriseMeCommand
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

export function deactivate(): void {
  console.log("The Compiled Thought Themes extension is now deactivated");
}
