/**
 * Tier 4: Real-World Application Scenarios
 * Minimum requirement: >= 5 application-level developer workflows
 */

const fs = require('fs');
const path = require('path');
const { describe, it, expect, beforeEach } = require('../harness/test-framework');
const { createMockVSCode } = require('../harness/vscode-mock');
const { ThemeEngine, wireExtensionCommands } = require('../harness/theme-engine');

describe('Tier 4: Real-World Application Scenarios', () => {
  const projectRoot = path.resolve(__dirname, '../../..');
  let vscode;
  let context;
  let engine;

  beforeEach(() => {
    vscode = createMockVSCode(projectRoot);
    context = vscode.createExtensionContext();
    engine = new ThemeEngine(context, vscode);
    wireExtensionCommands(vscode, engine);
  });

  it('Scenario 1: New Developer Onboarding & First-Run Setup', async () => {
    // 1. Extension activates for a new user
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBeUndefined();
    expect(vscode.workspace.getConfiguration('editor').get('fontFamily')).toBeUndefined();

    // 2. Extension triggers font optimization
    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');

    // 3. User selects a starter theme via QuickPick
    vscode.setQuickPickHandler(async (items) => {
      return items.find((i) => i.id === 'default-color-theme.json');
    });
    await vscode.commands.executeCommand('DelowarHossain.selectTheme');

    // 4. Verify complete environment setup
    const activeTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    const fontFamily = vscode.workspace.getConfiguration('editor').get('fontFamily');
    const fontLigatures = vscode.workspace.getConfiguration('editor').get('fontLigatures');

    expect(activeTheme).toBe('TCT Default Color');
    expect(fontFamily).toContain('Operator Mono');
    expect(fontLigatures).toBe(true);

    const notifications = vscode.getNotifications();
    expect(notifications.info.some((msg) => msg.includes('Font optimized'))).toBe(true);
    expect(notifications.info.some((msg) => msg.includes('TCT Default Color'))).toBe(true);
  });

  it('Scenario 2: Day-to-Night Workflow & Theme Transition', async () => {
    // 1. Morning work starts (09:00 AM) -> user requests daytime theme
    const morningTheme = await engine.getRecommendedTheme(9);
    expect(morningTheme.type).toBe('light');

    await engine.setTheme(morningTheme.label);
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe(morningTheme.label);

    // 2. Evening approaches (20:00 PM) -> user requests evening theme
    const eveningTheme = await engine.getRecommendedTheme(20);
    expect(eveningTheme.type).toBe('dark');

    await engine.setTheme(eveningTheme.label);
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe(eveningTheme.label);

    // 3. Late-night code review -> user switches to Ayu and toggles italic
    await engine.setTheme('TCT Ayu');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu');

    const toggled = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(toggled).toBe(true);
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu Italic');
  });

  it('Scenario 3: Theme Explorer & Palette Auditing (All 48 Themes with zero THEME_NOT_FOUND)', async () => {
    // 1. Retrieve all theme identifiers
    const themeIds = engine.getAllThemeIds();
    expect(themeIds.length).toBe(48);

    const auditResults = {
      loadedCount: 0,
      notFoundCount: 0,
      darkThemes: 0,
      lightThemes: 0,
      cachedHits: 0,
    };

    // 2. Iterate and audit every theme file
    for (const id of themeIds) {
      try {
        const theme = await engine.getTheme(id);
        auditResults.loadedCount++;
        if (theme.type === 'dark') auditResults.darkThemes++;
        if (theme.type === 'light') auditResults.lightThemes++;
      } catch (err) {
        if (err.code === 'THEME_NOT_FOUND') {
          auditResults.notFoundCount++;
        }
      }
    }

    // 3. Zero THEME_NOT_FOUND errors allowed across entire 48-theme catalog
    expect(auditResults.notFoundCount).toBe(0);
    expect(auditResults.loadedCount).toBe(48);
    expect(auditResults.darkThemes).toBeGreaterThan(30);
    expect(auditResults.lightThemes).toBeGreaterThan(1);
  });

  it('Scenario 4: Rapid Theme Switching & Stress Under Concurrent User Activity', async () => {
    // Simulate user rapidly cycling through themes in quick pick
    const fastThemeList = [
      'ayu.json',
      'darcula.json',
      'gruvbox.json',
      'material.json',
      'monokai.json',
      'oceanic.json',
      'one.json',
      'slime.json',
    ];

    // Trigger rapid switches concurrently
    const switchPromises = fastThemeList.map((themeId) => engine.setTheme(themeId));
    await Promise.all(switchPromises);

    // Final theme should be a valid registered theme
    const activeTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    expect(typeof activeTheme).toBe('string');
    expect(activeTheme.length).toBeGreaterThan(0);

    // Verify cache remains intact without unhandled exceptions or state corruption
    expect(engine.cache.size).toBeLessThanOrEqual(engine.maxCacheSize);
  });

  it('Scenario 5: Full Release Packaging, Manifest Consistency & Asset Verification', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

    // 1. Manifest structure checks
    expect(pkg.name).toBe('compiled-thought-themes');
    expect(pkg.publisher).toBe('DelowarHossain');
    expect(pkg.contributes).toBeDefined();
    expect(pkg.contributes.themes).toBeDefined();

    // 2. Check all declared theme files exist on disk
    for (const theme of pkg.contributes.themes) {
      const fullPath = path.resolve(projectRoot, theme.path);
      expect(fs.existsSync(fullPath)).toBe(true);
    }

    // 3. Check all declared snippets exist on disk
    for (const snippet of pkg.contributes.snippets || []) {
      const fullPath = path.resolve(projectRoot, snippet.path);
      expect(fs.existsSync(fullPath)).toBe(true);
    }

    // 4. Verify release documentation presence
    expect(fs.existsSync(path.join(projectRoot, 'CHANGELOG.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'RELEASE_NOTES.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'README.md'))).toBe(true);
  });
});
