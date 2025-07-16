import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

interface ThemeLoadMetrics {
  loadTime: number;
  cacheHit: boolean;
  size: number;
}

interface ThemeMetadata {
  id: string;
  label: string;
  uiTheme: "vs" | "vs-dark" | "hc-black";
  path: string;
  lastAccessed: number;
  loadMetrics: ThemeLoadMetrics[];
}

interface ThemeContent {
  name: string;
  type: "light" | "dark" | "hc";
  colors: Record<string, string>;
  tokenColors: any[];
  semanticTokenColors?: Record<string, string>;
  semanticHighlighting?: boolean;
}

interface ThemeCacheEntry {
  content: ThemeContent;
  metadata: ThemeMetadata;
  lastAccessed: number;
}

interface ThemeInfo {
  id: string;
  label: string;
  type: "light" | "dark" | "hc";
  path: string;
}

interface ThemeError extends Error {
  code:
    | "THEME_NOT_FOUND"
    | "THEME_PARSE_ERROR"
    | "THEME_LOAD_ERROR"
    | "THEME_VALIDATION_ERROR"
    | "THEME_CONCURRENT_LOAD";
  themeId: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

export class ThemeManager {
  private static instance: ThemeManager;
  private readonly MAX_CACHE_SIZE = 10;
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour
  private themeCache: Map<string, ThemeCacheEntry> = new Map();
  private loadingThemes: Set<string> = new Set();
  private themeMetadata: Map<string, ThemeMetadata> = new Map();
  private readonly themesPath: string;
  private metrics: Map<string, ThemeLoadMetrics[]> = new Map();
  private cacheStats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
  };
  private lruOrder: string[] = [];

  private constructor(private context: vscode.ExtensionContext) {
    this.themesPath = path.join(context.extensionPath, "themes");
    this.initializeThemeMetadata();
    this.startCacheCleanupInterval();
  }

  public static getInstance(context: vscode.ExtensionContext): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager(context);
    }
    return ThemeManager.instance;
  }

  private async initializeThemeMetadata(): Promise<void> {
    try {
      const packageJsonPath = path.join(
        this.context.extensionPath,
        "package.json"
      );
      const packageContent = await fs.promises.readFile(
        packageJsonPath,
        "utf8"
      );
      const { contributes } = JSON.parse(packageContent);

      if (contributes?.themes) {
        contributes.themes.forEach((theme: any) => {
          this.themeMetadata.set(theme.label, {
            id: theme.label,
            label: theme.label,
            uiTheme: theme.uiTheme,
            path: theme.path,
            lastAccessed: Date.now(),
            loadMetrics: [],
          });
        });
      }
    } catch (error) {
      console.error("Failed to initialize theme metadata:", error);
      throw new Error("Theme metadata initialization failed");
    }
  }

  private startCacheCleanupInterval(): void {
    setInterval(() => this.cleanupCache(), this.CACHE_TTL);
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.themeCache.entries()) {
      if (now - entry.lastAccessed > this.CACHE_TTL) {
        this.themeCache.delete(key);
        this.removeFromLruOrder(key);
        this.cacheStats.evictions++;
      }
    }
    this.cacheStats.size = this.themeCache.size;
  }

  private isThemeContent(content: any): content is ThemeContent {
    return (
      content &&
      typeof content.name === "string" &&
      (content.type === "light" ||
        content.type === "dark" ||
        content.type === "hc") &&
      typeof content.colors === "object" &&
      Array.isArray(content.tokenColors)
    );
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

  private async loadTheme(themeId: string): Promise<ThemeContent> {
    const start = performance.now();
    let cacheHit = false;

    try {
      if (this.themeCache.has(themeId)) {
        const cachedEntry = this.themeCache.get(themeId)!;
        if (Date.now() - cachedEntry.lastAccessed < this.CACHE_TTL) {
          cachedEntry.lastAccessed = Date.now();
          this.cacheStats.hits++;
          this.updateLruOrder(themeId);
          cacheHit = true;
          this.recordMetrics(
            themeId,
            start,
            cacheHit,
            JSON.stringify(cachedEntry.content).length
          );
          return cachedEntry.content;
        } else {
          this.themeCache.delete(themeId);
          this.removeFromLruOrder(themeId);
          this.cacheStats.evictions++;
        }
      }

      if (this.loadingThemes.has(themeId)) {
        throw this.createThemeError(
          "THEME_CONCURRENT_LOAD",
          `Theme ${themeId} is already being loaded.`,
          themeId
        );
      }

      this.loadingThemes.add(themeId);
      this.cacheStats.misses++;

      const themeMetadata = this.themeMetadata.get(themeId);
      if (!themeMetadata) {
        throw this.createThemeError(
          "THEME_NOT_FOUND",
          `Theme metadata not found for ${themeId}`,
          themeId
        );
      }

      const themePath = path.join(this.themesPath, themeMetadata.path);
      let themeContent: ThemeContent;

      try {
        themeContent = JSON.parse(
          await fs.promises.readFile(themePath, "utf8")
        );
      } catch (e: any) {
        throw this.createThemeError(
          "THEME_PARSE_ERROR",
          `Failed to parse theme file: ${e.message}`,
          themeId
        );
      }

      if (!this.isThemeContent(themeContent)) {
        throw this.createThemeError(
          "THEME_VALIDATION_ERROR",
          `Invalid theme content structure for ${themeId}`,
          themeId
        );
      }

      this.addToCache(themeId, themeContent, themeMetadata);
      this.recordMetrics(
        themeId,
        start,
        cacheHit,
        JSON.stringify(themeContent).length
      );
      return themeContent;
    } catch (error) {
      this.recordMetrics(themeId, start, cacheHit, 0);
      if (error instanceof Error && "code" in error) throw error;
      throw this.createThemeError(
        "THEME_LOAD_ERROR",
        error instanceof Error ? error.message : "Unknown error",
        themeId
      );
    } finally {
      this.loadingThemes.delete(themeId);
    }
  }

  private addToCache(
    themeId: string,
    content: ThemeContent,
    metadata: ThemeMetadata
  ): void {
    if (this.themeCache.size >= this.MAX_CACHE_SIZE) {
      const lruId = this.lruOrder.shift();
      if (lruId) {
        this.themeCache.delete(lruId);
        this.cacheStats.evictions++;
      }
    }

    this.themeCache.set(themeId, {
      content,
      metadata,
      lastAccessed: Date.now(),
    });

    this.updateLruOrder(themeId);
    this.cacheStats.size = this.themeCache.size;
  }

  private updateLruOrder(themeId: string): void {
    const idx = this.lruOrder.indexOf(themeId);
    if (idx !== -1) {
      this.lruOrder.splice(idx, 1);
    }
    this.lruOrder.push(themeId);
  }

  private removeFromLruOrder(themeId: string): void {
    const idx = this.lruOrder.indexOf(themeId);
    if (idx !== -1) {
      this.lruOrder.splice(idx, 1);
    }
  }

  private recordMetrics(
    themeId: string,
    start: number,
    cacheHit: boolean,
    size: number
  ): void {
    const loadTime = performance.now() - start;
    const metrics = this.metrics.get(themeId) || [];
    metrics.push({ loadTime, cacheHit, size });
    if (metrics.length > 20) metrics.shift(); // Keep last 20
    this.metrics.set(themeId, metrics);
  }

  public async getTheme(themeId: string): Promise<ThemeContent> {
    return this.loadTheme(themeId);
  }

  public getLoadingState(themeId: string): boolean {
    return this.loadingThemes.has(themeId);
  }

  public getMetrics(themeId: string): ThemeLoadMetrics[] {
    return this.metrics.get(themeId) || [];
  }

  public getCacheStats(): CacheStats {
    return { ...this.cacheStats };
  }

  public getThemeMetrics(themeId: string): ThemeLoadMetrics[] {
    return this.metrics.get(themeId) || [];
  }

  public clearCache(): void {
    this.themeCache.clear();
    this.lruOrder = [];
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
    };
  }

  public async preloadThemes(themeIds: string[]): Promise<void> {
    for (const id of themeIds) {
      try {
        await this.loadTheme(id);
      } catch {
        // Ignore errors for preload
      }
    }
  }

  public async getCurrentTheme(): Promise<ThemeInfo | undefined> {
    const currentThemeId = vscode.workspace
      .getConfiguration("workbench")
      .get<string>("colorTheme");

    if (!currentThemeId) return undefined;

    const themes = await this.getAllThemes();
    return themes.find((theme) => theme.id === currentThemeId);
  }

  public async getAllThemes(): Promise<ThemeInfo[]> {
    return Array.from(this.themeMetadata.values()).map((meta) => ({
      id: meta.id,
      label: meta.label,
      type:
        meta.uiTheme === "vs"
          ? "light"
          : meta.uiTheme === "vs-dark"
          ? "dark"
          : "hc",
      path: meta.path,
    }));
  }

  public async getThemeContent(themeId: string): Promise<ThemeContent> {
    try {
      return await this.loadTheme(themeId);
    } catch (error) {
      const themeError =
        error instanceof Error ? error : new Error("Unknown error");
      throw this.createThemeError(
        "THEME_LOAD_ERROR",
        themeError.message,
        themeId
      );
    }
  }
}
