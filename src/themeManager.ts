import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// Theme interfaces
export interface ThemeLoadMetrics {
  loadTime: number;
  cacheHit: boolean;
  size: number;
}

export interface ThemeMetadata {
  id: string;
  label: string;
  uiTheme: "vs" | "vs-dark" | "hc-black";
  path: string;
  lastAccessed: number;
  loadMetrics: ThemeLoadMetrics[];
}

export interface ThemeContent {
  name: string;
  type: "light" | "dark" | "hc";
  colors: Record<string, string>;
  tokenColors: any[];
  semanticTokenColors?: Record<string, string>;
  semanticHighlighting?: boolean;
}

export interface ThemeError extends Error {
  code:
    | "THEME_NOT_FOUND"
    | "THEME_PARSE_ERROR"
    | "THEME_LOAD_ERROR"
    | "THEME_VALIDATION_ERROR"
    | "THEME_CONCURRENT_LOAD";
  themeId: string;
}

interface ThemeCacheEntry {
  content: ThemeContent;
  lastAccessed: number;
  size: number;
}

export class ThemeManager {
  private static instance: ThemeManager;
  private readonly themeMetadata = new Map<string, ThemeMetadata>();
  private readonly themeCache = new Map<string, ThemeCacheEntry>();
  private readonly maxCacheSize = 5; // Maximum number of themes in cache
  private readonly maxCacheMemory = 5 * 1024 * 1024; // 5MB max cache size
  private currentCacheSize = 0;
  private loadPromises = new Map<string, Promise<ThemeContent>>();

  private constructor(private context: vscode.ExtensionContext) {
    this.initializeThemes().catch((error) => {
      console.error("Failed to initialize themes:", error);
    });
  }

  public static getInstance(context: vscode.ExtensionContext): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager(context);
    }
    return ThemeManager.instance;
  }

  public async getRecommendedTheme(): Promise<ThemeContent> {
    const hour = new Date().getHours();
    const isDarkTheme = hour < 6 || hour >= 18;

    // Get all themes and filter by type
    const themeIds = this.getAllThemeIds();
    const themes = await Promise.all(
      themeIds.map(async (id) => ({
        id,
        theme: await this.getTheme(id),
      }))
    );

    const matchingThemes = themes.filter(
      ({ theme }) => theme.type === (isDarkTheme ? "dark" : "light")
    );

    if (matchingThemes.length > 0) {
      return matchingThemes[0].theme;
    }

    // Fallback to first available theme
    if (themes.length > 0) {
      return themes[0].theme;
    }

    throw this.createThemeError("THEME_NOT_FOUND", "No themes available", "");
  }

  public async getThemes(): Promise<ThemeContent[]> {
    const themeIds = this.getAllThemeIds();
    return Promise.all(themeIds.map((id) => this.getTheme(id)));
  }

  public async applyTheme(themeId: string): Promise<void> {
    const theme = await this.getTheme(themeId);
    await vscode.workspace
      .getConfiguration()
      .update("workbench.colorTheme", theme.name, true);
  }

  private async initializeThemes(): Promise<void> {
    const themesPath = path.join(this.context.extensionPath, "themes");
    const files = await fs.promises.readdir(themesPath);

    await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map(async (file) => {
          try {
            const filePath = path.join(themesPath, file);
            const stats = await fs.promises.stat(filePath);

            this.themeMetadata.set(file, {
              id: file,
              label: file.replace(".json", ""),
              uiTheme: "vs-dark", // Default, will be updated when theme is loaded
              path: filePath,
              lastAccessed: Date.now(),
              loadMetrics: [],
            });
          } catch (error) {
            console.warn(`Failed to initialize theme ${file}:`, error);
          }
        })
    );
  }

  private async loadTheme(themeId: string): Promise<ThemeContent> {
    // Check if theme is already being loaded
    const existingPromise = this.loadPromises.get(themeId);
    if (existingPromise) {
      return existingPromise;
    }

    const loadPromise = (async () => {
      const startTime = performance.now();
      const metadata = this.themeMetadata.get(themeId);

      if (!metadata) {
        throw this.createThemeError(
          "THEME_NOT_FOUND",
          `Theme ${themeId} not found`,
          themeId
        );
      }

      // Check cache first
      const cached = this.themeCache.get(themeId);
      if (cached) {
        cached.lastAccessed = Date.now();
        this.recordMetrics(themeId, startTime, true, cached.size);
        return cached.content;
      }

      try {
        const content = await fs.promises.readFile(metadata.path, "utf8");
        const theme = JSON.parse(content);
        const size = Buffer.from(content).length;

        // Manage cache size
        this.manageCache(size);

        const entry: ThemeCacheEntry = {
          content: theme,
          lastAccessed: Date.now(),
          size,
        };

        this.themeCache.set(themeId, entry);
        this.currentCacheSize += size;
        this.recordMetrics(themeId, startTime, false, size);

        return theme;
      } catch (error) {
        throw this.createThemeError(
          "THEME_LOAD_ERROR",
          `Failed to load theme ${themeId}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          themeId
        );
      }
    })();

    this.loadPromises.set(themeId, loadPromise);
    try {
      const result = await loadPromise;
      this.loadPromises.delete(themeId);
      return result;
    } catch (error) {
      this.loadPromises.delete(themeId);
      throw error;
    }
  }

  private manageCache(newSize: number): void {
    while (
      (this.currentCacheSize + newSize > this.maxCacheMemory ||
        this.themeCache.size >= this.maxCacheSize) &&
      this.themeCache.size > 0
    ) {
      // Find least recently used entry
      let oldestTime = Date.now();
      let oldestId: string | undefined;

      for (const [id, entry] of this.themeCache) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestId = id;
        }
      }

      if (oldestId) {
        const entry = this.themeCache.get(oldestId);
        if (entry) {
          this.currentCacheSize -= entry.size;
          this.themeCache.delete(oldestId);
        }
      }
    }
  }

  private recordMetrics(
    themeId: string,
    startTime: number,
    cacheHit: boolean,
    size: number
  ): void {
    const loadTime = performance.now() - startTime;
    const metadata = this.themeMetadata.get(themeId);

    if (metadata) {
      metadata.loadMetrics.push({ loadTime, cacheHit, size });
      if (metadata.loadMetrics.length > 10) {
        metadata.loadMetrics.shift(); // Keep only last 10 metrics
      }
    }
  }

  // Public API methods
  public async getTheme(themeId: string): Promise<ThemeContent> {
    return this.loadTheme(themeId);
  }

  public async setTheme(themeId: string): Promise<void> {
    const theme = await this.loadTheme(themeId);
    await vscode.workspace
      .getConfiguration()
      .update("workbench.colorTheme", theme.name, true);
  }

  public getAllThemeIds(): string[] {
    return Array.from(this.themeMetadata.keys());
  }

  public getLoadMetrics(themeId: string): ThemeLoadMetrics[] {
    return this.themeMetadata.get(themeId)?.loadMetrics || [];
  }

  private createThemeError(
    code: ThemeError["code"],
    message: string,
    themeId: string
  ): ThemeError {
    const error = new Error(message) as ThemeError;
    error.code = code;
    error.themeId = themeId;
    return error;
  }
}
