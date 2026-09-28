import * as vscode from "vscode";
import { ThemePreviewPanel } from "./webviews/themePreview";
import { ThemeTransitionManager } from "./transitions/themeTransition";
import type { ThemeManager, ThemeContent, ThemeMetadata } from "./themeManager";
import { CustomizationManager } from "./customizationManager";

export interface ThemeAnalytics {
  usageCount: number;
  lastUsed: Date;
  averageUsageDuration: number;
  rating: number;
  workspacePreferences: { [key: string]: string };
}

export interface ThemeSchedule {
  themeId: string;
  startTime: string;
  endTime: string;
  days: string[];
  timeZone: string;
}

// Memory-optimized theme manager instance
let themeManager: ThemeManager;
let autoThemeTimer: ReturnType<typeof setInterval> | null = null;

export class FontManager {
  private static readonly RECOMMENDED_FONTS = new Set([
    "Operator Mono",
    "Fira Code",
    "JetBrains Mono",
    "Cascadia Code",
    "Source Code Pro",
    "Consolas",
  ]);

  private static fontCheckPromise: Promise<void> | null = null;

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

export class GeminiAIManager {
  private static instance: GeminiAIManager;
  private _context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  static getInstance(context: vscode.ExtensionContext): GeminiAIManager {
    if (!GeminiAIManager.instance) {
      GeminiAIManager.instance = new GeminiAIManager(context);
    }
    return GeminiAIManager.instance;
  }

  async analyzeCode(_document: vscode.TextDocument): Promise<{
    suggestions: string[];
    warnings: string[];
    optimizations: string[];
  }> {
    // Placeholder for Gemini API integration for code analysis
    return {
      suggestions: [],
      warnings: [],
      optimizations: [],
    };
  }

  async suggestTheme(_context?: unknown): Promise<string> {
    // AI-powered theme suggestion based on context
    return "TCT Professional";
  }
}

export class CustomThemeBuilder {
  static async createCustomTheme(base: ThemeContent): Promise<ThemeContent> {
    await vscode.window.showQuickPick([
      "Modify Colors",
      "Adjust Contrast",
      "Change Font Styles",
      "Edit Token Colors",
    ]);

    return base;
  }

  static async exportTheme(_theme: ThemeContent): Promise<void> {
    // Theme export logic
  }
}

export class ThemeAnalyticsManager {
  private analytics: Map<string, ThemeAnalytics> = new Map();
  private storageKey = "theme-analytics";
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadAnalytics();
  }

  private loadAnalytics() {
    const data =
      this.context.globalState.get<{ [key: string]: ThemeAnalytics }>(
        this.storageKey
      ) || {};
    Object.entries(data).forEach(([key, value]) => {
      this.analytics.set(key, value);
    });
  }

  trackThemeUsage(themeId: string) {
    const analytics = this.analytics.get(themeId) || {
      usageCount: 0,
      lastUsed: new Date(),
      averageUsageDuration: 0,
      rating: 0,
      workspacePreferences: {},
    };

    analytics.usageCount++;
    analytics.lastUsed = new Date();
    this.analytics.set(themeId, analytics);
    this.saveAnalytics();
  }

  private saveAnalytics() {
    const data = Object.fromEntries(this.analytics.entries());
    this.context.globalState.update(this.storageKey, data);
  }
}

export class ThemeScheduler {
  private schedules: ThemeSchedule[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(private themeManager: ThemeManager) {
    this.loadSchedules();
    this.startScheduler();
  }

  private loadSchedules() {
    vscode.workspace.getConfiguration("tct.scheduling");
  }

  private startScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      this.checkAndApplySchedule();
    }, 60000);
  }

  private async checkAndApplySchedule() {
    const currentSchedule = this.schedules.find((_schedule) => {
      return true;
    });

    if (currentSchedule) {
      await this.themeManager.setTheme(currentSchedule.themeId);
    }
  }
}

// Update the activate function
export async function activate(context: vscode.ExtensionContext) {
  // Initialize ThemeManager
  themeManager = await import("./themeManager").then(({ ThemeManager }) =>
    ThemeManager.getInstance(context)
  );

  try {
    const allRegisteredThemes = await themeManager.getThemes();
    CustomizationManager.setRegisteredThemes(
      allRegisteredThemes.map((t) => t.label || t.name)
    );
  } catch {
    // Non-critical
  }

  const aiManager = GeminiAIManager.getInstance(context);

  // Initialize font optimization
  await FontManager.optimizeFontSettings();

  // Smart theme recommendation on startup
  const startupTimer = setTimeout(async () => {
    try {
      const recommended = await themeManager.getRecommendedTheme();
      if (recommended) {
        const selection = await vscode.window.showInformationMessage(
          `💡 Recommended theme for your current context: ${recommended.name}`,
          "Apply Theme",
          "Dismiss"
        );

        if (selection === "Apply Theme") {
          await themeManager.setTheme(recommended.name);
        }
      }
    } catch {
      // non-critical recommendation failure
    }
  }, 2000);
  if (typeof startupTimer.unref === "function") {
    startupTimer.unref();
  }
  context.subscriptions.push(
    new vscode.Disposable(() => clearTimeout(startupTimer))
  );

  // Enhanced theme selector command supporting optional preselectedId
  const selectThemeCommand = vscode.commands.registerCommand(
    "DelowarHossain.selectTheme",
    async (preselectedId?: string) => {
      try {
        const allThemes = await themeManager.getThemes();
        const currentTheme = vscode.workspace
          .getConfiguration("workbench")
          .get<string>("colorTheme");

        const items = allThemes.map((t: { id?: string; filename?: string; label?: string; name?: string; type?: string }) => ({
          id: t.id || t.filename || t.label || "",
          label: t.label || t.name || "",
          description: t.type,
          detail: t.label === currentTheme ? "(Current Active Theme)" : "",
        }));

        let selected: { id: string; label: string } | undefined;
        if (preselectedId) {
          selected = items.find(
            (i: { id: string; label: string }) => i.id === preselectedId || i.label === preselectedId
          );
          if (!selected) {
            const resolvedMeta = themeManager.resolveMetadata(preselectedId);
            if (resolvedMeta) {
              selected = { id: resolvedMeta.filename, label: resolvedMeta.label };
            }
          }
        } else {
          selected = await vscode.window.showQuickPick(items, {
            placeHolder: "Select a Compiled Thought Theme",
          });
        }

        if (selected) {
          try {
            await themeManager.setTheme(selected.id || selected.label);
            vscode.window.showInformationMessage(
              `Applied theme: ${selected.label}`
            );
            return selected;
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to apply theme: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
            return null;
          }
        }
        return null;
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to select theme: ${error}`);
        return null;
      }
    }
  );

  // Intelligent italic toggle with robust counterpart resolution
  const toggleItalicCommand = vscode.commands.registerCommand(
    "DelowarHossain.toggleItalic",
    async () => {
      try {
        const currentTheme = vscode.workspace
          .getConfiguration("workbench")
          .get<string>("colorTheme");
        if (!currentTheme) {
          await vscode.window.showWarningMessage("No active theme set");
          return false;
        }

        const currentMeta = themeManager.resolveMetadata(currentTheme);
        if (!currentMeta) {
          await vscode.window.showWarningMessage(
            "Current theme not found in TCT collection"
          );
          return false;
        }

        const isCurrentlyItalic = currentMeta.isItalic;
        let targetMeta: ThemeMetadata | null = null;

        if (isCurrentlyItalic) {
          // Switch to standard variant
          const baseLabel = currentMeta.label.replace(/\s+Italic$/i, "").trim();
          const baseFilename = currentMeta.filename.replace(
            /Italic\.json$/i,
            ".json"
          );
          targetMeta =
            themeManager.resolveMetadata(baseLabel) ||
            themeManager.resolveMetadata(baseFilename);
        } else {
          // Switch to italic variant
          const italicLabel = `${currentMeta.label} Italic`;
          const italicFilename = currentMeta.filename.replace(
            /\.json$/i,
            "Italic.json"
          );
          targetMeta =
            themeManager.resolveMetadata(italicLabel) ||
            themeManager.resolveMetadata(italicFilename);
        }

        if (targetMeta) {
          await themeManager.setTheme(targetMeta.label || targetMeta.filename);
          await vscode.window.showInformationMessage(
            `Switched to ${targetMeta.label}`
          );
          return true;
        } else {
          await vscode.window.showInformationMessage(
            `No ${
              isCurrentlyItalic ? "regular" : "italic"
            } variant available for this theme`
          );
          return false;
        }
      } catch (error) {
        await vscode.window.showErrorMessage(`Failed to toggle italic: ${error}`);
        return false;
      }
    }
  );

  // Font optimization command
  const optimizeFontSettingsCommand = vscode.commands.registerCommand(
    "DelowarHossain.optimizeFontSettings",
    async () => {
      return FontManager.optimizeFontSettings();
    }
  );

  // Random theme selection command
  const randomThemeCommand = vscode.commands.registerCommand(
    "DelowarHossain.randomTheme",
    async () => {
      try {
        const themes = await themeManager.getThemes();
        if (!themes || themes.length === 0) {
          return null;
        }
        const selected = themes[Math.floor(Math.random() * themes.length)];
        await themeManager.setTheme(selected.id || selected.label);
        vscode.window.showInformationMessage(
          `Random theme applied: ${selected.label}`
        );
        return selected;
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to apply random theme: ${error}`);
        return null;
      }
    }
  );

  // Contributed commands handlers
  const viewThemeAnalyticsCommand = vscode.commands.registerCommand(
    "DelowarHossain.viewThemeAnalytics",
    async () => {
      vscode.window.showInformationMessage("TCT Theme Analytics is active.");
    }
  );

  const shareThemeCommand = vscode.commands.registerCommand(
    "DelowarHossain.shareTheme",
    async () => {
      const current = vscode.workspace
        .getConfiguration("workbench")
        .get<string>("colorTheme");
      vscode.window.showInformationMessage(
        `Share TCT Theme: ${current || "TCT Theme"}`
      );
    }
  );

  const configureScheduleCommand = vscode.commands.registerCommand(
    "DelowarHossain.configureSchedule",
    async () => {
      vscode.window.showInformationMessage(
        "Theme scheduling can be configured in settings under tct.scheduling."
      );
    }
  );

  const customizeIconsCommand = vscode.commands.registerCommand(
    "DelowarHossain.customizeIcons",
    async () => {
      vscode.window.showInformationMessage(
        "Icon packs can be configured under tct.iconPacks in settings."
      );
    }
  );

  const configureWorkspaceThemeCommand = vscode.commands.registerCommand(
    "DelowarHossain.configureWorkspaceTheme",
    async () => {
      vscode.window.showInformationMessage(
        "Workspace theme overrides are configured under tct.workspace."
      );
    }
  );

  const customizeKeyboardShortcutsCommand = vscode.commands.registerCommand(
    "DelowarHossain.customizeKeyboardShortcuts",
    async () => {
      vscode.commands.executeCommand(
        "workbench.action.openGlobalKeybindings",
        "DelowarHossain"
      );
    }
  );

  // Auto theme switching based on time
  const autoThemeCommand = vscode.commands.registerCommand(
    "DelowarHossain.enableAutoTheme",
    async () => {
      const config = vscode.workspace.getConfiguration("DelowarHossain");
      await config.update("autoTheme", true, vscode.ConfigurationTarget.Global);

      try {
        const recommended = await themeManager.getRecommendedTheme();
        if (recommended) {
          await themeManager.setTheme(recommended.label || recommended.name);
        }
      } catch {
        // non-critical recommendation failure
      }

      if (autoThemeTimer) {
        clearInterval(autoThemeTimer);
        autoThemeTimer = null;
      }

      autoThemeTimer = setInterval(async () => {
        const currentConfig = vscode.workspace.getConfiguration();
        const autoThemeEnabled = currentConfig.get<boolean>(
          "DelowarHossain.autoTheme",
          false
        );

        if (!autoThemeEnabled) {
          if (autoThemeTimer) {
            clearInterval(autoThemeTimer);
            autoThemeTimer = null;
          }
          return;
        }

        const hour = new Date().getHours();
        const isDarkTheme = hour < 6 || hour >= 18;

        const themeIds = themeManager.getAllThemeIds();
        const themes = await Promise.all(
          themeIds.map(async (id) => ({
            id,
            theme: await themeManager.getTheme(id),
          }))
        );

        const availableThemes = themes.filter(
          ({ theme }) => theme.type === (isDarkTheme ? "dark" : "light")
        );

        if (availableThemes.length > 0) {
          const selected =
            availableThemes[Math.floor(Math.random() * availableThemes.length)];

          const currentTheme = currentConfig.get<string>("workbench.colorTheme");
          const targetThemeName = selected.theme.label || selected.theme.name;
          if (currentTheme !== targetThemeName) {
            await themeManager.setTheme(selected.id);
          }
        }
      }, 60000 * 30);

      if (typeof autoThemeTimer.unref === "function") {
        autoThemeTimer.unref();
      }

      vscode.window.showInformationMessage("Auto theme switching enabled!");
      return true;
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
    dispose: () => {
      if (autoThemeTimer) {
        clearInterval(autoThemeTimer);
        autoThemeTimer = null;
      }
      themeTransitionManager.dispose();
      if (ThemePreviewPanel.currentPanel) {
        ThemePreviewPanel.currentPanel.dispose();
      }
      if (themeManager) {
        themeManager.dispose();
      }
    },
  });

  const customizeThemeCommand = vscode.commands.registerCommand(
    "DelowarHossain.customizeTheme",
    async () => {
      await CustomizationManager.promptCustomizationQuickPick();
    }
  );

  // Listen for dynamic theme style customizations
  const customizationConfigListener = vscode.workspace.onDidChangeConfiguration(
    async (event) => {
      if (event.affectsConfiguration("tct.customization")) {
        await CustomizationManager.applyCustomizations();
      }
    }
  );
  context.subscriptions.push(customizationConfigListener);

  context.subscriptions.push(
    selectThemeCommand,
    toggleItalicCommand,
    optimizeFontSettingsCommand,
    randomThemeCommand,
    customizeThemeCommand,
    autoThemeCommand,
    viewThemeAnalyticsCommand,
    shareThemeCommand,
    configureScheduleCommand,
    customizeIconsCommand,
    configureWorkspaceThemeCommand,
    customizeKeyboardShortcutsCommand
  );

  // Listen for configuration changes to optimize performance
  const configPerfListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("workbench.colorTheme")) {
      // Clear cache when theme changes to free memory if cache exceeds threshold
      if (themeManager.getCacheStats().size > 3) {
        themeManager.clearCache();
      }
    }
  });
  context.subscriptions.push(configPerfListener);

  // Add workspace change monitoring
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async (event) => {
      if (vscode.workspace.getConfiguration().get("tct.ai.enabled")) {
        await aiManager.analyzeCode(event.document);
      }
    })
  );

  // Test commands for theme performance
  const testThemesCommand = vscode.commands.registerCommand(
    "DelowarHossain.testThemes",
    async () => {
      try {
        const startMemory = process.memoryUsage();
        const metrics: Array<{
          themeId: string;
          loadTime: number;
          cacheHit: boolean;
        }> = [];

        // Get all theme IDs
        const themeIds = themeManager.getAllThemeIds();

        // First pass - load all themes to measure initial load times
        for (const id of themeIds) {
          const start = performance.now();
          await themeManager.setTheme(id);
          const loadTime = performance.now() - start;
          metrics.push({ themeId: id, loadTime, cacheHit: false });
          await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay between switches
        }

        // Second pass - themes should be cached
        for (const id of themeIds) {
          const start = performance.now();
          await themeManager.setTheme(id);
          const loadTime = performance.now() - start;
          metrics.push({ themeId: id, loadTime, cacheHit: true });
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Random access test
        for (let i = 0; i < 10; i++) {
          const randomId =
            themeIds[Math.floor(Math.random() * themeIds.length)];
          const start = performance.now();
          await themeManager.setTheme(randomId);
          const loadTime = performance.now() - start;
          metrics.push({ themeId: randomId, loadTime, cacheHit: true });
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const endMemory = process.memoryUsage();

        // Calculate and display metrics
        const report = {
          totalThemes: themeIds.length,
          averageFirstLoad:
            metrics
              .slice(0, themeIds.length)
              .reduce((sum, m) => sum + m.loadTime, 0) / themeIds.length,
          averageCachedLoad:
            metrics
              .slice(themeIds.length)
              .reduce((sum, m) => sum + m.loadTime, 0) /
            (metrics.length - themeIds.length),
          memoryDelta: {
            heapUsed: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
            external: (endMemory.external - startMemory.external) / 1024 / 1024,
            arrayBuffers:
              (endMemory.arrayBuffers - startMemory.arrayBuffers) / 1024 / 1024,
          },
          cacheSize: themeManager.getCacheStats().size,
        };

        // Show results
        const reportPanel = vscode.window.createWebviewPanel(
          "themeTestReport",
          "Theme Performance Report",
          vscode.ViewColumn.One,
          {}
        );

        reportPanel.webview.html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: system-ui; padding: 20px; }
              .metric { margin: 10px 0; }
              .value { font-weight: bold; color: #0078D4; }
            </style>
          </head>
          <body>
            <h1>Theme Performance Report</h1>
            <div class="metric">Total Themes: <span class="value">${
              report.totalThemes
            }</span></div>
            <div class="metric">Average First Load: <span class="value">${report.averageFirstLoad.toFixed(
              2
            )}ms</span></div>
            <div class="metric">Average Cached Load: <span class="value">${report.averageCachedLoad.toFixed(
              2
            )}ms</span></div>
            <div class="metric">Cache Size: <span class="value">${
              report.cacheSize
            } themes</span></div>
            <h2>Memory Usage Delta (MB)</h2>
            <div class="metric">Heap Used: <span class="value">${report.memoryDelta.heapUsed.toFixed(
              2
            )}</span></div>
            <div class="metric">External: <span class="value">${report.memoryDelta.external.toFixed(
              2
            )}</span></div>
            <div class="metric">Array Buffers: <span class="value">${report.memoryDelta.arrayBuffers.toFixed(
              2
            )}</span></div>
          </body>
          </html>
        `;
      } catch (error) {
        vscode.window.showErrorMessage(
          `Test failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  );

  context.subscriptions.push(testThemesCommand);

  // ...existing code...
}

export async function generateThemePreviewHTML(
  themeManager: ThemeManager
): Promise<string> {
  const themeIds = themeManager.getAllThemeIds();
  const themes = await Promise.all(
    themeIds.map(async (id) => ({
      id,
      theme: await themeManager.getTheme(id),
    }))
  );

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
            .theme-metrics { font-size: 0.8em; color: #888; margin-top: 8px; }
        </style>
    </head>
    <body>
        <h1>TCT Theme Collection</h1>
        <div class="theme-grid">
            ${themes
              .map(({ id, theme }) => {
                const metrics = themeManager.getLoadMetrics(id);
                const avgLoadTime =
                  metrics.length > 0
                    ? metrics.reduce((sum, m) => sum + m.loadTime, 0) /
                      metrics.length
                    : 0;

                return `
                <div class="theme-card">
                    <div class="theme-name">${theme.name}</div>
                    <div class="theme-type">${theme.type} theme</div>
                    <div class="theme-metrics">
                        Avg Load: ${avgLoadTime.toFixed(2)}ms
                        Cache Hits: ${
                          metrics.filter((m) => m.cacheHit).length
                        }/${metrics.length}
                    </div>
                </div>
              `;
              })
              .join("")}
        </div>
    </body>
    </html>`;
}

export function deactivate() {
  if (autoThemeTimer) {
    clearInterval(autoThemeTimer);
    autoThemeTimer = null;
  }
  if (themeManager) {
    themeManager.dispose();
  }
}

export { CustomizationManager };

