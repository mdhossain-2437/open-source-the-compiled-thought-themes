import * as vscode from "vscode";
import type { ThemeManager, ThemeContent } from "../themeManager";

export class ThemePreviewPanel {
  public static currentPanel: ThemePreviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _currentTheme: string | undefined;

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly themeManager: ThemeManager
  ) {
    this._panel = panel;
    this._panel.webview.html = this._getLoadingHtml();
    this._updateContent().catch(console.error);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "applyTheme":
            try {
              await this.themeManager.setTheme(message.themeId);
              this._currentTheme = message.themeId;
              await this._updateContent();
            } catch (error) {
              vscode.window.showErrorMessage(
                `Failed to apply theme: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`
              );
            }
            break;

          case "exportTheme":
            await this._exportTheme(message.themeId);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static show(
    extensionUri: vscode.Uri,
    themeManager: ThemeManager
  ): void {
    if (ThemePreviewPanel.currentPanel) {
      ThemePreviewPanel.currentPanel._panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "tctThemePreview",
      "TCT Theme Preview",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
      }
    );

    ThemePreviewPanel.currentPanel = new ThemePreviewPanel(
      panel,
      extensionUri,
      themeManager
    );
  }

  private async _updateContent(): Promise<void> {
    try {
      const themeIds = this.themeManager.getAllThemeIds();
      const themes = await Promise.all(
        themeIds.map(async (id) => ({
          id,
          theme: await this.themeManager.getTheme(id),
        }))
      );

      this._panel.webview.html = this._getPreviewHtml(themes);
    } catch (error) {
      this._panel.webview.html = this._getErrorHtml(error);
    }
  }

  private _getLoadingHtml(): string {
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }
        </style>
      </head>
      <body>
        <div class="loading">
          <h2>Loading Themes...</h2>
          <p>Please wait while we fetch theme information.</p>
        </div>
      </body>
      </html>
    `;
  }

  private _getErrorHtml(error: unknown): string {
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          .error {
            padding: 20px;
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
          }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>Error Loading Themes</h2>
          <p>${
            error instanceof Error ? error.message : "Unknown error occurred"
          }</p>
        </div>
      </body>
      </html>
    `;
  }

  private _getPreviewHtml(
    themes: Array<{ id: string; theme: ThemeContent }>
  ): string {
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          .theme-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
          }
          .theme-card {
            padding: 16px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            background: var(--vscode-editor-background);
          }
          .theme-card.active {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 1px var(--vscode-focusBorder);
          }
          .theme-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .theme-title {
            font-weight: bold;
            font-size: 16px;
          }
          .theme-type {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
          }
          .theme-metrics {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 8px;
          }
          .button {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            cursor: pointer;
            font-family: inherit;
          }
          .button:hover {
            background: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <div class="theme-grid">
          ${themes
            .map(({ id, theme }) => {
              const isActive = id === this._currentTheme;
              const metrics = this.themeManager.getLoadMetrics(id);
              const avgLoadTime =
                metrics.length > 0
                  ? metrics.reduce((sum, m) => sum + m.loadTime, 0) /
                    metrics.length
                  : 0;
              const cacheHits = metrics.filter((m) => m.cacheHit).length;

              return /*html*/ `
                  <div class="theme-card${isActive ? " active" : ""}">
                    <div class="theme-header">
                      <span class="theme-title">${theme.name}</span>
                      <span class="theme-type">${theme.type}</span>
                    </div>
                    <div class="theme-metrics">
                      Avg Load: ${avgLoadTime.toFixed(2)}ms
                      ${
                        cacheHits > 0
                          ? `<span class="cached-badge">Cache Hits: ${cacheHits}</span>`
                          : ""
                      }
                    </div>
                    <div style="margin-top: 16px">
                      <button class="button" onclick="applyTheme('${id}')">
                        ${isActive ? "Current Theme" : "Apply Theme"}
                      </button>
                      <button class="button" onclick="exportTheme('${id}')" style="margin-left: 8px">
                        Export
                      </button>
                    </div>
                  </div>
                `;
            })
            .join("")}
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          
          function applyTheme(themeId) {
            vscode.postMessage({ command: 'applyTheme', themeId });
          }
          
          function exportTheme(themeId) {
            vscode.postMessage({ command: 'exportTheme', themeId });
          }
        </script>
      </body>
      </html>
    `;
  }

  private async _exportTheme(themeId: string): Promise<void> {
    try {
      const theme = await this.themeManager.getTheme(themeId);
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${themeId}.json`),
        filters: {
          "JSON Files": ["json"],
        },
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(
          uri,
          Buffer.from(JSON.stringify(theme, null, 2), "utf-8")
        );
        vscode.window.showInformationMessage(
          `Theme exported successfully to ${uri.fsPath}`
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to export theme: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private formatTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) {
      return `${seconds}s ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)}h ago`;
    }
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  public dispose(): void {
    ThemePreviewPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      disposable?.dispose();
    }
  }
}
