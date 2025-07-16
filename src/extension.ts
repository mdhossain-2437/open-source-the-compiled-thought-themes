import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { ThemePreviewPanel } from "./webviews/themePreview";
import { ThemeTransitionManager } from "./transitions/themeTransition";
import type { ThemeManager, ThemeContent } from "./themeManager";

// Core interfaces
interface ThemeInfo {
  name: string;
  path: string;
  type: "dark" | "light" | "hc";
}

interface ThemeAnalytics {
  usageCount: number;
  lastUsed: Date;
  averageUsageDuration: number;
  rating: number;
  workspacePreferences: { [key: string]: string };
}

interface ThemeSchedule {
  themeId: string;
  startTime: string;
  endTime: string;
  days: string[];
  timeZone: string;
}

interface IconPack {
  id: string;
  name: string;
  icons: { [key: string]: string };
}

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

class GeminiAIManager {
  private static instance: GeminiAIManager;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  static getInstance(context: vscode.ExtensionContext): GeminiAIManager {
    if (!GeminiAIManager.instance) {
      GeminiAIManager.instance = new GeminiAIManager(context);
    }
    return GeminiAIManager.instance;
  }

  async analyzeCode(document: vscode.TextDocument): Promise<any> {
    // Implement Gemini API integration for code analysis
    // This is a placeholder for the actual implementation
    return {
      suggestions: [],
      warnings: [],
      optimizations: [],
    };
  }

  async suggestTheme(context: any): Promise<string> {
    // AI-powered theme suggestion based on context
    return "TCT Professional";
  }
}

class CustomThemeBuilder {
  static async createCustomTheme(base: ThemeContent): Promise<ThemeContent> {
    const customizations = await vscode.window.showQuickPick([
      "Modify Colors",
      "Adjust Contrast",
      "Change Font Styles",
      "Edit Token Colors",
    ]);

    // Implement theme customization logic
    return base;
  }

  static async exportTheme(theme: ThemeContent): Promise<void> {
    // Implement theme export logic
  }
}

class ThemeAnalyticsManager {
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

class ThemeScheduler {
  private schedules: ThemeSchedule[] = [];
  private timer: NodeJS.Timer | null = null;

  constructor(private themeManager: ThemeManager) {
    this.loadSchedules();
    this.startScheduler();
  }

  private loadSchedules() {
    const config = vscode.workspace.getConfiguration("tct.scheduling");
    // Load schedules from configuration
  }

  private startScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      this.checkAndApplySchedule();
    }, 60000); // Check every minute
  }

  private async checkAndApplySchedule() {
    const now = new Date();
    const currentSchedule = this.schedules.find((schedule) => {
      // Check if current time matches schedule
      return true; // Implement actual time checking logic
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

  console.log("The Compiled Thought Themes extension is now active!");

  const aiManager = GeminiAIManager.getInstance(context);

  // Initialize font optimization
  await FontManager.optimizeFontSettings();

  // Smart theme recommendation on startup
  setTimeout(async () => {
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
  }, 2000);

  // Enhanced theme selector command
  const selectThemeCommand = vscode.commands.registerCommand(
    "DelowarHossain.selectTheme",
    async () => {
      try {
        const themes = await themeManager.getThemes();
        const items = themes.map((theme: ThemeContent) => ({
          id: theme.name, // Using name as ID since it's unique
          label: theme.name,
          description: theme.type,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "Select a theme",
        });

        if (selected) {
          try {
            await themeManager.setTheme(selected.id);
            vscode.window.showInformationMessage(
              `Applied theme: ${selected.label}`
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to apply theme: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to select theme: ${error}`);
      }
    }
  );

  // Intelligent italic toggle
  const toggleItalicCommand = vscode.commands.registerCommand(
    "DelowarHossain.toggleItalic",
    async () => {
      try {
        const currentTheme = vscode.workspace
          .getConfiguration()
          .get<string>("workbench.colorTheme");
        if (!currentTheme) return;

        const themes = await themeManager.getThemes();
        const current = themes.find(
          (t: ThemeContent) => t.name === currentTheme
        );

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

        const targetTheme = themes.find(
          (t: ThemeContent) => t.name === targetName
        );

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
    "DelowarHossain.enableAutoTheme",
    () => {
      const interval = setInterval(async () => {
        const config = vscode.workspace.getConfiguration();
        const autoThemeEnabled = config.get<boolean>(
          "DelowarHossain.autoTheme",
          false
        );

        if (!autoThemeEnabled) {
          clearInterval(interval);
          return;
        }

        const hour = new Date().getHours();
        const isDarkTheme = hour < 6 || hour >= 18;

        // Get all themes and filter by type
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
          // Select a random theme of appropriate type
          const selected =
            availableThemes[Math.floor(Math.random() * availableThemes.length)];

          const currentTheme = config.get<string>("workbench.colorTheme");
          if (currentTheme !== selected.theme.name) {
            await themeManager.setTheme(selected.id);
          }
        }
      }, 60000 * 30); // Check every 30 minutes

      vscode.window.showInformationMessage("Auto theme switching enabled!");
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
      themeTransitionManager.dispose();
      if (ThemePreviewPanel.currentPanel) {
        ThemePreviewPanel.currentPanel.dispose();
      }
    },
  });

  context.subscriptions.push(
    selectThemeCommand,
    toggleItalicCommand,
    autoThemeCommand
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

  // Add workspace change monitoring
  vscode.workspace.onDidChangeTextDocument(async (event) => {
    if (vscode.workspace.getConfiguration().get("tct.ai.enabled")) {
      await aiManager.analyzeCode(event.document);
    }
  });

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
        console.log("First pass - Loading all themes...");
        for (const id of themeIds) {
          const start = performance.now();
          await themeManager.setTheme(id);
          const loadTime = performance.now() - start;
          metrics.push({ themeId: id, loadTime, cacheHit: false });
          await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay between switches
        }

        // Second pass - themes should be cached
        console.log("Second pass - Testing cache...");
        for (const id of themeIds) {
          const start = performance.now();
          await themeManager.setTheme(id);
          const loadTime = performance.now() - start;
          metrics.push({ themeId: id, loadTime, cacheHit: true });
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Random access test
        console.log("Random access test...");
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
          cacheSize: themeManager["themeCache"].size,
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

async function generateThemePreviewHTML(
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
  console.log("The Compiled Thought Themes extension is now deactivated");
}
