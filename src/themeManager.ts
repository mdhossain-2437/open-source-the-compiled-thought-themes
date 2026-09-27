import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { THEME_REGISTRY } from "./themeRegistry";
import type { ThemeRegistryEntry } from "./types/themes";
import { LRUCache } from "./lib/lruCache";

// Theme interfaces
export interface ThemeLoadMetrics {
  loadTime: number;
  cacheHit: boolean;
  size: number;
}

export type ThemeMetadata = ThemeRegistryEntry & {
  lastAccessed: number;
  loadMetrics: ThemeLoadMetrics[];
};

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

export class ThemeManager {
  private static instance: ThemeManager;
  private readonly themeMetadata = new Map<string, ThemeMetadata>();
  private readonly lruCache: LRUCache<string, ThemeContent>;
  private loadPromises = new Map<string, Promise<ThemeContent>>();

  private constructor(private context: vscode.ExtensionContext) {
    this.lruCache = new LRUCache<string, ThemeContent>(5);
    this.initializeFromRegistry();
  }

  public static getInstance(context: vscode.ExtensionContext): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager(context);
    }
    return ThemeManager.instance;
  }

  public async getRecommendedTheme(
    languageId?: string
  ): Promise<{ id: string; theme: ThemeContent } | null> {
    // 1. Recommend based on language
    if (languageId) {
      const themeIds = this.getAllThemeIds();
      for (const themeId of themeIds) {
        const metadata = this.getThemeMetadata(themeId);
        if (metadata?.recommendations?.includes(languageId)) {
          return { id: themeId, theme: await this.getTheme(themeId) };
        }
      }
    }

    // 2. Fallback to time-based recommendation
    const hour = new Date().getHours();
    const isDarkTheme = hour < 6 || hour >= 18;
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
      return matchingThemes[0];
    }

    // 3. Fallback to first available theme
    if (themes.length > 0) {
      return themes[0];
    }

    return null;
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

  private initializeFromRegistry(): void {
    for (const themeId in THEME_REGISTRY) {
      const entry = THEME_REGISTRY[themeId];
      this.themeMetadata.set(themeId, {
        ...entry,
        lastAccessed: 0,
        loadMetrics: [],
      });

      if (entry.variants) {
        for (const variantId in entry.variants) {
          const variant = entry.variants[variantId];
          this.themeMetadata.set(variant.id, {
            id: variant.id,
            label: variant.label,
            path: variant.path,
            uiTheme: entry.uiTheme,
            description: entry.description,
            lastAccessed: 0,
            loadMetrics: [],
          });
        }
      }
    }
  }

  private async loadTheme(themeId: string): Promise<ThemeContent> {
    // Check if theme is already being loaded
    const existingPromise = this.loadPromises.get(themeId);
    if (existingPromise) {
      return existingPromise;
    }

    const loadPromise = (async (): Promise<ThemeContent> => {
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
      const cached = this.lruCache.get(themeId);
      if (cached) {
        this.recordMetrics(themeId, startTime, true, 0); // Size is not tracked in the new cache
        return cached;
      }

      try {
        const themePath = path.join(this.context.extensionPath, metadata.path);
        const content = await fs.promises.readFile(themePath, "utf8");
        const theme: ThemeContent = JSON.parse(content);
        const size = Buffer.from(content).length;

        this.lruCache.put(themeId, theme);
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

  public getThemeMetadata(themeId: string): ThemeMetadata | undefined {
    return this.themeMetadata.get(themeId);
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
