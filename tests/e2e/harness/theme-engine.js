/**
 * Theme Engine & Contract Harness for TCT E2E Testing
 * Implements the ThemeManager specification from PROJECT.md:
 * - Multi-index resolution (label, filename, internal name)
 * - Full inheritance resolution for "include" directives
 * - Bounded LRU Cache with TTL and metrics
 * - Promise coalescing on concurrent loads
 * - Time-of-day smart theme recommendations
 * - Full wire-up of extension commands
 */

const fs = require('fs');
const path = require('path');

class ThemeEngine {
  constructor(context, vscodeInstance, options = {}) {
    this.context = context;
    this.vscode = vscodeInstance;
    this.projectRoot = context.extensionPath;
    this.themesDir = path.join(this.projectRoot, 'themes');

    this.maxCacheSize = options.maxCacheSize || 10;
    this.cacheTtlMs = options.cacheTtlMs || 60 * 60 * 1000; // 1 hour

    this.cache = new Map(); // themeId -> { content, lastAccessed, size }
    this.lruOrder = []; // ordered list of cached theme keys
    this.inFlightLoads = new Map(); // themeId -> Promise<ThemeContent>
    this.metrics = new Map(); // themeId -> Array<{ loadTime, cacheHit, size }>
    this.cacheStats = { hits: 0, misses: 0, evictions: 0 };

    this.themesByLabel = new Map();
    this.themesByFilename = new Map();
    this.themesByInternalName = new Map();
    this.themesByPath = new Map();
    this.allMetadata = [];

    this._initializeMetadata();
  }

  _initializeMetadata() {
    const pkgPath = path.join(this.projectRoot, 'package.json');
    let pkgContributesThemes = [];
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkgContributesThemes = pkg.contributes?.themes || [];
      } catch (e) {
        // ignore
      }
    }

    // Read all JSON files in themes/
    if (fs.existsSync(this.themesDir)) {
      const files = fs.readdirSync(this.themesDir).filter((f) => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(this.themesDir, file);
        let rawContent = {};
        try {
          rawContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
          // Keep rawContent empty if parse fails
        }

        // Find manifest entry if registered
        const manifestEntry = pkgContributesThemes.find(
          (t) => path.basename(t.path || '') === file || t.label === file.replace('.json', '')
        );

        const internalName = rawContent.name || file.replace('.json', '');
        const label = manifestEntry ? manifestEntry.label : `TCT ${rawContent.name || file.replace('.json', '')}`;
        const uiTheme = manifestEntry ? manifestEntry.uiTheme : rawContent.type === 'light' ? 'vs' : 'vs-dark';

        const meta = {
          id: file,
          filename: file,
          label,
          internalName,
          uiTheme,
          type: rawContent.type || (uiTheme === 'vs' ? 'light' : 'dark'),
          path: filePath,
          relativePath: `./themes/${file}`,
          isItalic: file.toLowerCase().includes('italic') || internalName.toLowerCase().includes('italic') || label.toLowerCase().includes('italic'),
          include: rawContent.include || null,
        };

        this.allMetadata.push(meta);
        this.themesByFilename.set(file.toLowerCase(), meta);
        this.themesByLabel.set(label.toLowerCase(), meta);
        this.themesByInternalName.set(internalName.toLowerCase(), meta);

        // Path indexing
        const normAbs = filePath.toLowerCase().replace(/\\/g, '/');
        const normRel = meta.relativePath.toLowerCase().replace(/\\/g, '/');
        const cleanRel = normRel.replace(/^\.\//, '');
        this.themesByPath.set(normAbs, meta);
        this.themesByPath.set(normRel, meta);
        this.themesByPath.set(cleanRel, meta);
        if (manifestEntry && manifestEntry.path) {
          const resolvedManifest = path
            .resolve(this.projectRoot, manifestEntry.path)
            .toLowerCase()
            .replace(/\\/g, '/');
          this.themesByPath.set(resolvedManifest, meta);
        }
      }
    }
  }

  resolveMetadata(identifier) {
    if (!identifier || typeof identifier !== 'string') {
      return null;
    }
    const trimmed = identifier.trim();
    if (trimmed.length === 0 || trimmed.includes('..')) {
      return null;
    }
    const clean = trimmed.toLowerCase();
    const cleanNormalized = clean.replace(/\\/g, '/');

    // 1. Direct filename match
    if (this.themesByFilename.has(clean)) {
      return this.themesByFilename.get(clean);
    }
    if (this.themesByFilename.has(cleanNormalized)) {
      return this.themesByFilename.get(cleanNormalized);
    }
    // 1b. Filename without .json or with .json
    if (!clean.endsWith('.json') && this.themesByFilename.has(`${clean}.json`)) {
      return this.themesByFilename.get(`${clean}.json`);
    }

    // 2. Direct path match
    if (this.themesByPath.has(cleanNormalized)) {
      return this.themesByPath.get(cleanNormalized);
    }
    const cleanRel = cleanNormalized.replace(/^\.\//, '');
    if (this.themesByPath.has(cleanRel)) {
      return this.themesByPath.get(cleanRel);
    }
    try {
      const resolvedAbs = path
        .resolve(this.projectRoot, trimmed)
        .toLowerCase()
        .replace(/\\/g, '/');
      if (this.themesByPath.has(resolvedAbs)) {
        return this.themesByPath.get(resolvedAbs);
      }
    } catch (e) {
      // ignore
    }

    // 2b. Basename match for paths
    const baseName = path.basename(cleanNormalized);
    if (this.themesByFilename.has(baseName)) {
      return this.themesByFilename.get(baseName);
    }
    if (!baseName.endsWith('.json') && this.themesByFilename.has(`${baseName}.json`)) {
      return this.themesByFilename.get(`${baseName}.json`);
    }

    // 3. Manifest label match
    if (this.themesByLabel.has(clean)) {
      return this.themesByLabel.get(clean);
    }

    // 4. Internal theme name match
    if (this.themesByInternalName.has(clean)) {
      return this.themesByInternalName.get(clean);
    }

    // 5. Fallback search (case-insensitive substring or stripped "tct " prefix)
    const stripped = clean.replace(/^tct\s+/, '');
    for (const [key, meta] of this.themesByLabel) {
      if (key.replace(/^tct\s+/, '') === stripped) {
        return meta;
      }
    }
    for (const [key, meta] of this.themesByInternalName) {
      if (key.replace(/^tct\s+/, '') === stripped) {
        return meta;
      }
    }

    return null;
  }

  async getTheme(themeIdentifier) {
    const meta = this.resolveMetadata(themeIdentifier);
    if (!meta) {
      const err = new Error(`Theme '${themeIdentifier}' not found in TCT collection`);
      err.code = 'THEME_NOT_FOUND';
      err.themeId = themeIdentifier;
      throw err;
    }

    const startTime = Date.now();
    const cacheKey = meta.filename;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey);
      if (Date.now() - entry.lastAccessed <= this.cacheTtlMs) {
        entry.lastAccessed = Date.now();
        this._updateLru(cacheKey);
        this.cacheStats.hits++;
        this._recordMetric(cacheKey, Date.now() - startTime, true, entry.size);
        return entry.content;
      } else {
        // Expired
        this.cache.delete(cacheKey);
        this._removeFromLru(cacheKey);
        this.cacheStats.evictions++;
      }
    }

    // Coalesce concurrent loads
    if (this.inFlightLoads.has(cacheKey)) {
      return this.inFlightLoads.get(cacheKey);
    }

    const loadPromise = this._loadAndResolveTheme(meta, startTime);
    this.inFlightLoads.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.inFlightLoads.delete(cacheKey);
    }
  }

  async _loadAndResolveTheme(meta, startTime) {
    const cacheKey = meta.filename;
    this.cacheStats.misses++;

    let fileContent;
    try {
      fileContent = await fs.promises.readFile(meta.path, 'utf8');
    } catch (readErr) {
      const err = new Error(`Failed to read theme file: ${readErr.message}`);
      err.code = 'THEME_LOAD_ERROR';
      err.themeId = meta.filename;
      throw err;
    }

    let parsed;
    try {
      parsed = JSON.parse(fileContent);
    } catch (parseErr) {
      const err = new Error(`Failed to parse theme JSON: ${parseErr.message}`);
      err.code = 'THEME_PARSE_ERROR';
      err.themeId = meta.filename;
      throw err;
    }

    // Resolve inheritance recursively if "include" is present
    let resolvedColors = { ...(parsed.colors || {}) };
    let resolvedTokenColors = Array.isArray(parsed.tokenColors) ? [...parsed.tokenColors] : [];

    let currentInclude = parsed.include;
    let currentDir = path.dirname(meta.path);
    const visited = new Set([meta.path]);

    while (currentInclude) {
      const includePath = path.resolve(currentDir, currentInclude);
      if (visited.has(includePath) || !fs.existsSync(includePath)) {
        break;
      }
      visited.add(includePath);
      try {
        const parentJson = JSON.parse(fs.readFileSync(includePath, 'utf8'));
        resolvedColors = { ...(parentJson.colors || {}), ...resolvedColors };
        if (Array.isArray(parentJson.tokenColors)) {
          resolvedTokenColors = [...parentJson.tokenColors, ...resolvedTokenColors];
        }
        currentInclude = parentJson.include || null;
        currentDir = path.dirname(includePath);
      } catch (e) {
        break;
      }
    }

    const themeContent = {
      name: parsed.name || meta.internalName,
      label: meta.label,
      type: parsed.type || meta.type,
      colors: resolvedColors,
      tokenColors: resolvedTokenColors,
      semanticTokenColors: parsed.semanticTokenColors || {},
      semanticHighlighting: !!parsed.semanticHighlighting,
      raw: parsed,
      meta,
    };

    const size = Buffer.byteLength(fileContent, 'utf8');

    // Add to LRU Cache
    this._addToCache(cacheKey, themeContent, size);
    this._recordMetric(cacheKey, Date.now() - startTime, false, size);

    return themeContent;
  }

  _addToCache(key, content, size) {
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.lruOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.cacheStats.evictions++;
      }
    }

    this.cache.set(key, {
      content,
      lastAccessed: Date.now(),
      size,
    });
    this._updateLru(key);
  }

  _updateLru(key) {
    const idx = this.lruOrder.indexOf(key);
    if (idx !== -1) {
      this.lruOrder.splice(idx, 1);
    }
    this.lruOrder.push(key);
  }

  _removeFromLru(key) {
    const idx = this.lruOrder.indexOf(key);
    if (idx !== -1) {
      this.lruOrder.splice(idx, 1);
    }
  }

  _recordMetric(key, loadTime, cacheHit, size) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    const list = this.metrics.get(key);
    list.push({ loadTime, cacheHit, size });
    if (list.length > 20) {
      list.shift();
    }
  }

  async setTheme(themeIdentifier) {
    const theme = await this.getTheme(themeIdentifier);
    const workbenchConfig = this.vscode.workspace.getConfiguration('workbench');
    // VS Code stores the canonical theme label in workbench.colorTheme
    await workbenchConfig.update('colorTheme', theme.label, this.vscode.ConfigurationTarget.Global);
  }

  async getThemes() {
    return this.allMetadata.map((m) => ({
      id: m.id,
      label: m.label,
      internalName: m.internalName,
      type: m.type,
      uiTheme: m.uiTheme,
      path: m.relativePath,
      isItalic: m.isItalic,
    }));
  }

  async getRecommendedTheme(simulatedHour = null) {
    const hour = simulatedHour !== null ? simulatedHour : new Date().getHours();
    const isDark = hour < 6 || hour >= 18;
    const targetType = isDark ? 'dark' : 'light';

    const candidates = this.allMetadata.filter((m) => m.type === targetType && !m.isItalic);
    if (candidates.length > 0) {
      return candidates[0];
    }
    return this.allMetadata[0] || null;
  }

  getAllThemeIds() {
    return this.allMetadata.map((m) => m.filename);
  }

  getLoadMetrics(themeIdentifier) {
    const meta = this.resolveMetadata(themeIdentifier);
    if (meta && this.metrics.has(meta.filename)) {
      return this.metrics.get(meta.filename);
    }
    return [];
  }

  clearCache() {
    this.cache.clear();
    this.lruOrder = [];
    this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
  }
}

/**
 * Wire up all extension commands into the mock VS Code environment
 */
function wireExtensionCommands(vscodeInstance, themeEngine) {
  // 1. DelowarHossain.selectTheme
  vscodeInstance.commands.registerCommand('DelowarHossain.selectTheme', async (preselectedId) => {
    const allThemes = await themeEngine.getThemes();
    const currentTheme = vscodeInstance.workspace.getConfiguration('workbench').get('colorTheme');

    const items = allThemes.map((t) => ({
      label: t.label,
      description: t.type,
      detail: t.label === currentTheme ? '(Current Active Theme)' : '',
      id: t.id,
    }));

    let selected;
    if (preselectedId) {
      selected = items.find((i) => i.id === preselectedId || i.label === preselectedId);
    } else {
      selected = await vscodeInstance.window.showQuickPick(items, {
        placeHolder: 'Select a Compiled Thought Theme',
      });
    }

    if (selected) {
      await themeEngine.setTheme(selected.id || selected.label);
      await vscodeInstance.window.showInformationMessage(`Applied theme: ${selected.label}`);
      return selected;
    }
    return null;
  });

  // 2. DelowarHossain.toggleItalic
  vscodeInstance.commands.registerCommand('DelowarHossain.toggleItalic', async () => {
    const currentThemeLabel = vscodeInstance.workspace.getConfiguration('workbench').get('colorTheme');
    if (!currentThemeLabel) {
      await vscodeInstance.window.showWarningMessage('No active theme set');
      return false;
    }

    const currentMeta = themeEngine.resolveMetadata(currentThemeLabel);
    if (!currentMeta) {
      await vscodeInstance.window.showWarningMessage('Current theme not found in TCT collection');
      return false;
    }

    // Determine target name
    const isCurrentlyItalic = currentMeta.isItalic;
    let targetMeta = null;

    if (isCurrentlyItalic) {
      // Switch to standard variant
      // e.g. "TCT Ayu Italic" -> "TCT Ayu", "ayuItalic.json" -> "ayu.json"
      const baseLabel = currentMeta.label.replace(/\s+Italic$/i, '').trim();
      const baseFilename = currentMeta.filename.replace(/Italic\.json$/i, '.json');
      targetMeta = themeEngine.resolveMetadata(baseLabel) || themeEngine.resolveMetadata(baseFilename);
    } else {
      // Switch to italic variant
      const italicLabel = `${currentMeta.label} Italic`;
      const italicFilename = currentMeta.filename.replace(/\.json$/i, 'Italic.json');
      targetMeta = themeEngine.resolveMetadata(italicLabel) || themeEngine.resolveMetadata(italicFilename);
    }

    if (targetMeta) {
      await themeEngine.setTheme(targetMeta.label);
      await vscodeInstance.window.showInformationMessage(`Switched to ${targetMeta.label}`);
      return true;
    } else {
      await vscodeInstance.window.showInformationMessage(
        `No ${isCurrentlyItalic ? 'regular' : 'italic'} variant available for this theme`
      );
      return false;
    }
  });

  // 3. DelowarHossain.previewTheme
  vscodeInstance.commands.registerCommand('DelowarHossain.previewTheme', async () => {
    const panel = vscodeInstance.window.createWebviewPanel(
      'tctThemePreview',
      'TCT Theme Previewer',
      vscodeInstance.ViewColumn.One,
      { enableScripts: true }
    );
    const themes = await themeEngine.getThemes();
    panel.webview.html = `<html><body><h1>TCT Themes Preview (${themes.length} themes)</h1></body></html>`;
    return panel;
  });

  // 4. DelowarHossain.optimizeFontSettings
  let fontOptimizePromise = null;
  vscodeInstance.commands.registerCommand('DelowarHossain.optimizeFontSettings', async () => {
    if (fontOptimizePromise) {
      return fontOptimizePromise;
    }

    fontOptimizePromise = (async () => {
      try {
        const config = vscodeInstance.workspace.getConfiguration('editor');
        const recommendedFonts = 'Operator Mono, Fira Code, JetBrains Mono, Cascadia Code, Source Code Pro, Consolas, monospace';

        await config.update('fontFamily', recommendedFonts, vscodeInstance.ConfigurationTarget.Global);
        await config.update('fontLigatures', true, vscodeInstance.ConfigurationTarget.Global);

        await vscodeInstance.window.showInformationMessage(
          'Font optimized for better coding experience!',
          'Learn More'
        );
        return true;
      } finally {
        fontOptimizePromise = null;
      }
    })();

    return fontOptimizePromise;
  });

  // 5. DelowarHossain.enableAutoTheme
  vscodeInstance.commands.registerCommand('DelowarHossain.enableAutoTheme', async () => {
    const config = vscodeInstance.workspace.getConfiguration('DelowarHossain');
    await config.update('autoTheme', true, vscodeInstance.ConfigurationTarget.Global);
    const recommended = await themeEngine.getRecommendedTheme();
    if (recommended) {
      await themeEngine.setTheme(recommended.label);
    }
    await vscodeInstance.window.showInformationMessage('Auto theme switching enabled!');
    return true;
  });

  // 6. DelowarHossain.randomTheme
  vscodeInstance.commands.registerCommand('DelowarHossain.randomTheme', async () => {
    const allThemes = await themeEngine.getThemes();
    if (allThemes.length === 0) return null;
    const randomChoice = allThemes[Math.floor(Math.random() * allThemes.length)];
    await themeEngine.setTheme(randomChoice.label);
    await vscodeInstance.window.showInformationMessage(`Applied random theme: ${randomChoice.label}`);
    return randomChoice;
  });
}

module.exports = {
  ThemeEngine,
  wireExtensionCommands,
};
