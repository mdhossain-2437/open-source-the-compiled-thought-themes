import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// Core theme interfaces
export interface ThemeLoadMetrics {
  loadTime: number;
  cacheHit: boolean;
  size: number;
}

export interface ThemeMetadata {
  id: string;
  filename: string;
  label: string;
  internalName: string;
  uiTheme: "vs" | "vs-dark" | "hc-black";
  type: "light" | "dark" | "hc";
  path: string;
  relativePath: string;
  isItalic: boolean;
  include: string | null;
  lastAccessed: number;
  loadMetrics: ThemeLoadMetrics[];
}

export interface ThemeContent {
  name: string;
  label?: string;
  type: "light" | "dark" | "hc";
  colors: Record<string, string>;
  tokenColors: Array<Record<string, unknown>>;
  semanticTokenColors?: Record<string, string>;
  semanticHighlighting?: boolean;
  include?: string;
  [key: string]: unknown;
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

export interface ThemeCacheEntry {
  content: ThemeContent;
  metadata?: ThemeMetadata;
  lastAccessed: number;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

export class ThemeManager {
  private static instance: ThemeManager | undefined;

  // Support both instance and _instance for test lifecycle reset
  public static get _instance(): ThemeManager | undefined {
    return ThemeManager.instance;
  }
  public static set _instance(val: ThemeManager | undefined) {
    ThemeManager.instance = val;
  }

  public readonly themesPath: string;
  public readonly loadingThemes = new Set<string>();
  public readonly themeCache = new Map<string, ThemeCacheEntry>();

  private readonly maxCacheSize: number = 10;
  private readonly cacheTtlMs: number = 60 * 60 * 1000; // 1 hour
  private readonly inFlightLoads = new Map<string, Promise<ThemeContent>>();
  private readonly metrics = new Map<string, ThemeLoadMetrics[]>();
  private readonly cleanupTimer: NodeJS.Timeout | null = null;
  private readonly cleanupDisposable: vscode.Disposable;

  private lruOrder: string[] = [];
  private cacheStats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
  };

  // Multi-index maps
  private readonly themeMetadata = new Map<string, ThemeMetadata>();
  private readonly themesByLabel = new Map<string, ThemeMetadata>();
  private readonly themesByFilename = new Map<string, ThemeMetadata>();
  private readonly themesByInternalName = new Map<string, ThemeMetadata>();
  private readonly themesByPath = new Map<string, ThemeMetadata>();
  private readonly allMetadata: ThemeMetadata[] = [];

  private constructor(private readonly context: vscode.ExtensionContext) {
    this.themesPath = path.join(context.extensionPath, "themes");
    this.initializeThemesSync();

    // Start background cache cleanup interval
    const timer = setInterval(() => this.cleanupCache(), this.cacheTtlMs);
    if (typeof timer.unref === "function") {
      timer.unref();
    }
    this.cleanupTimer = timer;
    this.cleanupDisposable = new vscode.Disposable(() => {
      clearInterval(timer);
    });
    if (context.subscriptions) {
      context.subscriptions.push(this.cleanupDisposable);
    }
  }

  public static getInstance(context: vscode.ExtensionContext): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager(context);
    }
    return ThemeManager.instance;
  }

  /**
   * Initializes theme metadata catalog synchronously from package.json and themes/
   */
  private initializeThemesSync(): void {
    const pkgPath = path.join(this.context.extensionPath, "package.json");
    let pkgContributesThemes: Array<{ label: string; path?: string; uiTheme?: "vs" | "vs-dark" | "hc-black" }> = [];

    if (fs.existsSync(pkgPath)) {
      try {
        const pkgContent = fs.readFileSync(pkgPath, "utf8");
        const pkg = JSON.parse(pkgContent);
        pkgContributesThemes = pkg.contributes?.themes || [];
      } catch (err) {
        console.error("Failed to parse package.json for theme contributes:", err);
      }
    }

    if (!fs.existsSync(this.themesPath)) {
      return;
    }

    const files = fs
      .readdirSync(this.themesPath)
      .filter((file) => file.endsWith(".json"));

    for (const file of files) {
      const filePath = path.join(this.themesPath, file);
      let rawContent: Record<string, unknown> = {};
      try {
        const contentStr = fs.readFileSync(filePath, "utf8");
        rawContent = JSON.parse(contentStr);
      } catch {
        // Continue with empty rawContent; loadTheme will handle parse errors
      }

      // Find matching manifest entry by path or label
      const manifestEntry = pkgContributesThemes.find((t) => {
        const entryBase = path.basename(t.path || "");
        return entryBase === file || t.label === file.replace(".json", "");
      });

      const rawName = typeof rawContent.name === "string" ? rawContent.name : "";
      const rawType = (rawContent.type === "light" || rawContent.type === "dark" || rawContent.type === "hc") ? rawContent.type : undefined;
      const rawInclude = typeof rawContent.include === "string" ? rawContent.include : null;

      const internalName: string = rawName || file.replace(".json", "");
      const label = manifestEntry?.label
        ? manifestEntry.label
        : `TCT ${internalName}`;
      const uiTheme: "vs" | "vs-dark" | "hc-black" = manifestEntry?.uiTheme
        ? manifestEntry.uiTheme
        : rawType === "light"
        ? "vs"
        : "vs-dark";
      const type: "light" | "dark" | "hc" =
        rawType || (uiTheme === "vs" ? "light" : "dark");
      const relativePath = manifestEntry?.path || `./themes/${file}`;
      const isItalic =
        file.toLowerCase().includes("italic") ||
        internalName.toLowerCase().includes("italic") ||
        label.toLowerCase().includes("italic");

      const meta: ThemeMetadata = {
        id: file,
        filename: file,
        label,
        internalName,
        uiTheme,
        type,
        path: filePath,
        relativePath,
        isItalic,
        include: rawInclude,
        lastAccessed: Date.now(),
        loadMetrics: [],
      };

      this.allMetadata.push(meta);
      this.themeMetadata.set(file, meta);
      this.themeMetadata.set(label, meta);
      this.themesByFilename.set(file.toLowerCase(), meta);
      this.themesByLabel.set(label.toLowerCase(), meta);
      this.themesByInternalName.set(internalName.toLowerCase(), meta);

      // Path indexing for robust path lookup
      const normAbs = filePath.toLowerCase().replace(/\\/g, "/");
      const normRel = relativePath.toLowerCase().replace(/\\/g, "/");
      const cleanRel = normRel.replace(/^\.\//, "");
      this.themesByPath.set(normAbs, meta);
      this.themesByPath.set(normRel, meta);
      this.themesByPath.set(cleanRel, meta);
      if (manifestEntry?.path) {
        const resolvedManifest = path
          .resolve(this.context.extensionPath, manifestEntry.path)
          .toLowerCase()
          .replace(/\\/g, "/");
        this.themesByPath.set(resolvedManifest, meta);
      }
    }
  }

  /**
   * Multi-index metadata resolution supporting lookup by:
   * 1. Direct filename (e.g. "ayu.json" or "ayu")
   * 2. Direct path (e.g. "./themes/ayu.json", "themes/ayu.json", or absolute path)
   * 3. Canonical manifest label (e.g. "TCT Ayu")
   * 4. Internal JSON name (e.g. "ayu" or "TCT Ayu")
   * 5. Stripped prefix search (e.g. "Ayu")
   */
  public resolveMetadata(identifier: string): ThemeMetadata | null {
    if (!identifier || typeof identifier !== "string") {
      return null;
    }
    const trimmed = identifier.trim();
    if (trimmed.length === 0 || trimmed.includes("..")) {
      return null;
    }

    const clean = trimmed.toLowerCase();
    const cleanNormalized = clean.replace(/\\/g, "/");

    // 1. Direct filename match
    if (this.themesByFilename.has(clean)) {
      return this.themesByFilename.get(clean)!;
    }
    if (this.themesByFilename.has(cleanNormalized)) {
      return this.themesByFilename.get(cleanNormalized)!;
    }
    // 1b. Filename with .json
    if (!clean.endsWith(".json") && this.themesByFilename.has(`${clean}.json`)) {
      return this.themesByFilename.get(`${clean}.json`)!;
    }

    // 2. Direct path match
    if (this.themesByPath.has(cleanNormalized)) {
      return this.themesByPath.get(cleanNormalized)!;
    }
    const cleanRel = cleanNormalized.replace(/^\.\//, "");
    if (this.themesByPath.has(cleanRel)) {
      return this.themesByPath.get(cleanRel)!;
    }
    try {
      const resolvedAbs = path
        .resolve(this.context.extensionPath, trimmed)
        .toLowerCase()
        .replace(/\\/g, "/");
      if (this.themesByPath.has(resolvedAbs)) {
        return this.themesByPath.get(resolvedAbs)!;
      }
    } catch {
      // ignore
    }

    // 2b. Basename match for paths
    const baseName = path.basename(cleanNormalized);
    if (this.themesByFilename.has(baseName)) {
      return this.themesByFilename.get(baseName)!;
    }
    if (!baseName.endsWith(".json") && this.themesByFilename.has(`${baseName}.json`)) {
      return this.themesByFilename.get(`${baseName}.json`)!;
    }

    // 3. Manifest label match
    if (this.themesByLabel.has(clean)) {
      return this.themesByLabel.get(clean)!;
    }

    // 4. Internal theme name match
    if (this.themesByInternalName.has(clean)) {
      return this.themesByInternalName.get(clean)!;
    }

    // 5. Prefix-stripped search (strip "tct ")
    const stripped = clean.replace(/^tct\s+/, "");
    for (const [key, meta] of this.themesByLabel) {
      if (key.replace(/^tct\s+/, "") === stripped) {
        return meta;
      }
    }
    for (const [key, meta] of this.themesByInternalName) {
      if (key.replace(/^tct\s+/, "") === stripped) {
        return meta;
      }
    }

    return null;
  }

  /**
   * Loads a theme with full inheritance, LRU caching, and promise coalescing
   */
  public async getTheme(themeIdentifier: string): Promise<ThemeContent> {
    const meta = this.resolveMetadata(themeIdentifier);
    if (!meta) {
      throw this.createThemeError(
        "THEME_NOT_FOUND",
        `Theme '${themeIdentifier}' not found in TCT collection`,
        themeIdentifier || ""
      );
    }

    const startTime = performance.now();
    const cacheKey = meta.filename;

    // Check LRU cache
    if (this.themeCache.has(cacheKey)) {
      const entry = this.themeCache.get(cacheKey)!;
      if (Date.now() - entry.lastAccessed <= this.cacheTtlMs) {
        entry.lastAccessed = Date.now();
        this.updateLruOrder(cacheKey);
        this.cacheStats.hits++;
        this.recordMetrics(cacheKey, startTime, true, entry.size);
        return entry.content;
      } else {
        // Expired
        this.themeCache.delete(cacheKey);
        this.removeFromLruOrder(cacheKey);
        this.cacheStats.evictions++;
      }
    }

    // Coalesce concurrent in-flight loads
    if (this.inFlightLoads.has(cacheKey)) {
      return this.inFlightLoads.get(cacheKey)!;
    }

    this.loadingThemes.add(cacheKey);
    const loadPromise = this.loadAndResolveTheme(meta, startTime);
    this.inFlightLoads.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.inFlightLoads.delete(cacheKey);
      this.loadingThemes.delete(cacheKey);
    }
  }

  private async loadAndResolveTheme(
    meta: ThemeMetadata,
    startTime: number
  ): Promise<ThemeContent> {
    const cacheKey = meta.filename;
    this.cacheStats.misses++;

    let fileContent: string;
    try {
      fileContent = await fs.promises.readFile(meta.path, "utf8");
    } catch (readErr: unknown) {
      const msg = readErr instanceof Error ? readErr.message : String(readErr);
      throw this.createThemeError(
        "THEME_LOAD_ERROR",
        `Failed to read theme file: ${msg}`,
        meta.filename
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(fileContent);
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      throw this.createThemeError(
        "THEME_PARSE_ERROR",
        `Failed to parse theme JSON: ${msg}`,
        meta.filename
      );
    }

    if (!parsed || typeof parsed !== "object") {
      throw this.createThemeError(
        "THEME_VALIDATION_ERROR",
        `Invalid theme structure in ${meta.filename}`,
        meta.filename
      );
    }

    // Resolve inheritance recursively if "include" is present
    const parsedColors = parsed.colors && typeof parsed.colors === "object"
      ? (parsed.colors as Record<string, string>)
      : {};
    let resolvedColors: Record<string, string> = { ...parsedColors };
    let resolvedTokenColors: Array<Record<string, unknown>> = Array.isArray(parsed.tokenColors)
      ? [...(parsed.tokenColors as Array<Record<string, unknown>>)]
      : [];

    let currentInclude = typeof parsed.include === "string" ? parsed.include : null;
    let currentDir = path.dirname(meta.path);
    const visited = new Set<string>([meta.path]);

    while (currentInclude) {
      const includePath = path.resolve(currentDir, currentInclude);
      if (visited.has(includePath) || !fs.existsSync(includePath)) {
        break;
      }
      visited.add(includePath);
      try {
        const parentContent = fs.readFileSync(includePath, "utf8");
        const parentJson = JSON.parse(parentContent);
        resolvedColors = { ...(parentJson.colors || {}), ...resolvedColors };
        if (Array.isArray(parentJson.tokenColors)) {
          resolvedTokenColors = [
            ...parentJson.tokenColors,
            ...resolvedTokenColors,
          ];
        }
        currentInclude = parentJson.include || null;
        currentDir = path.dirname(includePath);
      } catch {
        break;
      }
    }

    const parsedName = typeof parsed.name === "string" ? parsed.name : undefined;
    const parsedType = (parsed.type === "light" || parsed.type === "dark" || parsed.type === "hc")
      ? parsed.type
      : undefined;
    const parsedSemantic = parsed.semanticTokenColors && typeof parsed.semanticTokenColors === "object"
      ? (parsed.semanticTokenColors as Record<string, string>)
      : {};

    const themeContent: ThemeContent = {
      ...parsed,
      name: parsedName || meta.internalName,
      label: meta.label,
      type: parsedType || meta.type,
      colors: resolvedColors,
      tokenColors: resolvedTokenColors,
      semanticTokenColors: parsedSemantic,
      semanticHighlighting: !!parsed.semanticHighlighting,
      include: currentInclude || undefined,
    };

    const size = Buffer.byteLength(fileContent, "utf8");

    // Add to LRU Cache
    this.addToCache(cacheKey, themeContent, size, meta);
    this.recordMetrics(cacheKey, startTime, false, size);

    return themeContent;
  }

  private addToCache(
    key: string,
    content: ThemeContent,
    size: number,
    metadata: ThemeMetadata
  ): void {
    if (!this.themeCache.has(key) && this.themeCache.size >= this.maxCacheSize) {
      const oldestKey = this.lruOrder.shift();
      if (oldestKey) {
        this.themeCache.delete(oldestKey);
        this.cacheStats.evictions++;
      }
    }

    this.themeCache.set(key, {
      content,
      metadata,
      lastAccessed: Date.now(),
      size,
    });
    this.updateLruOrder(key);
    this.cacheStats.size = this.themeCache.size;
  }

  private updateLruOrder(key: string): void {
    const idx = this.lruOrder.indexOf(key);
    if (idx !== -1) {
      this.lruOrder.splice(idx, 1);
    }
    this.lruOrder.push(key);
  }

  private removeFromLruOrder(key: string): void {
    const idx = this.lruOrder.indexOf(key);
    if (idx !== -1) {
      this.lruOrder.splice(idx, 1);
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.themeCache.entries()) {
      if (now - entry.lastAccessed > this.cacheTtlMs) {
        this.themeCache.delete(key);
        this.removeFromLruOrder(key);
        this.cacheStats.evictions++;
      }
    }
    this.cacheStats.size = this.themeCache.size;
  }

  private recordMetrics(
    key: string,
    startTime: number,
    cacheHit: boolean,
    size: number
  ): void {
    const loadTime = performance.now() - startTime;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    const list = this.metrics.get(key)!;
    list.push({ loadTime, cacheHit, size });
    if (list.length > 20) {
      list.shift();
    }

    const meta = this.themeMetadata.get(key);
    if (meta) {
      meta.loadMetrics.push({ loadTime, cacheHit, size });
      if (meta.loadMetrics.length > 20) {
        meta.loadMetrics.shift();
      }
    }
  }

  /**
   * Applies the theme by canonical label into VS Code configuration
   */
  public async setTheme(themeIdentifier: string): Promise<void> {
    const theme = await this.getTheme(themeIdentifier);
    const meta = this.resolveMetadata(themeIdentifier);
    const targetLabel = theme.label || meta?.label || theme.name;

    await vscode.workspace
      .getConfiguration("workbench")
      .update("colorTheme", targetLabel, vscode.ConfigurationTarget.Global);
  }

  /**
   * Returns array of all available themes with complete metadata
   */
  public async getThemes(): Promise<
    Array<{
      id: string;
      name: string;
      label: string;
      internalName: string;
      type: string;
      uiTheme: string;
      path: string;
      isItalic: boolean;
    }>
  > {
    return this.allMetadata.map((m) => ({
      id: m.id,
      name: m.internalName,
      label: m.label,
      internalName: m.internalName,
      type: m.type,
      uiTheme: m.uiTheme,
      path: m.relativePath,
      isItalic: m.isItalic,
    }));
  }

  /**
   * Provides time-of-day recommended theme
   */
  public async getRecommendedTheme(
    simulatedHour?: number
  ): Promise<ThemeContent> {
    const hour =
      simulatedHour !== undefined ? simulatedHour : new Date().getHours();
    const isDark = hour < 6 || hour >= 18;
    const targetType = isDark ? "dark" : "light";

    const candidates = this.allMetadata.filter(
      (m) => m.type === targetType && !m.isItalic
    );

    const chosen = candidates.length > 0 ? candidates[0] : this.allMetadata[0];
    if (chosen) {
      return this.getTheme(chosen.filename);
    }

    throw this.createThemeError(
      "THEME_NOT_FOUND",
      "No themes available in collection",
      ""
    );
  }

  public getAllThemeIds(): string[] {
    return this.allMetadata.map((m) => m.filename);
  }

  public getLoadMetrics(themeIdentifier?: string): ThemeLoadMetrics[] {
    if (!themeIdentifier) {
      return [];
    }
    const meta = this.resolveMetadata(themeIdentifier);
    if (meta && this.metrics.has(meta.filename)) {
      return this.metrics.get(meta.filename) || [];
    }
    return [];
  }

  public clearCache(): void {
    this.themeCache.clear();
    this.lruOrder = [];
    this.cacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  }

  public getCacheStats(): CacheStats {
    return { ...this.cacheStats };
  }

  public dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupDisposable.dispose();
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
