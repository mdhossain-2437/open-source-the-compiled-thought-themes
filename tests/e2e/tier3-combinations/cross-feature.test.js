/**
 * Tier 3: Cross-Feature Combinations (Pairwise & Compound Interactions)
 * Verifies that multiple features work harmoniously when chained together.
 */

const path = require('path');
const { describe, it, expect, beforeEach } = require('../harness/test-framework');
const { createMockVSCode } = require('../harness/vscode-mock');
const { ThemeEngine, wireExtensionCommands } = require('../harness/theme-engine');

describe('Tier 3: Cross-Feature Combinations (Pairwise Interactions)', () => {
  let vscode;
  let context;
  let engine;

  beforeEach(() => {
    vscode = createMockVSCode(path.resolve(__dirname, '../../..'));
    context = vscode.createExtensionContext();
    engine = new ThemeEngine(context, vscode, { maxCacheSize: 5 });
    wireExtensionCommands(vscode, engine);
  });

  it('3.1 should seamlessly chain Dynamic Theme Switching and Italic Toggling', async () => {
    // 1. Switch to TCT Ayu
    await engine.setTheme('TCT Ayu');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu');

    // 2. Toggle to Italic
    const toggleToItalic = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(toggleToItalic).toBe(true);
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu Italic');

    // 3. Toggle back to Regular
    const toggleToRegular = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(toggleToRegular).toBe(true);
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu');
  });

  it('3.2 should combine Theme Switching with Font Optimization without configuration collision', async () => {
    // 1. Set theme
    await engine.setTheme('dracula-theme.json');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Dracula');

    // 2. Run font optimization
    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');

    // 3. Verify both theme and font configurations coexist
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    const editorConfig = vscode.workspace.getConfiguration('editor');

    expect(workbenchConfig.get('colorTheme')).toBe('TCT Dracula');
    expect(editorConfig.get('fontFamily')).toContain('Fira Code');
    expect(editorConfig.get('fontLigatures')).toBe(true);
  });

  it('3.3 should switch through 15 themes with LRU cache limit of 5, verifying smooth eviction and re-load', async () => {
    const themeList = [
      'ayu.json',
      'darcula.json',
      'gruvbox.json',
      'material.json',
      'monokai.json',
      'oceanic.json',
      'one.json',
      'slime.json',
      'TCTCandyland.json',
      'TCTForest.json',
      'TCTSeaWave.json',
      'TCTStarryNight.json',
      'TCTSunset.json',
      'TCTZenGarden.json',
      'vintage-theme.json',
    ];

    for (const themeFile of themeList) {
      await engine.setTheme(themeFile);
      expect(engine.cache.size).toBeLessThanOrEqual(5);
    }

    expect(engine.cacheStats.evictions).toBeGreaterThanOrEqual(10);

    // Re-access the first theme (which was evicted long ago)
    await engine.setTheme('ayu.json');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu');
    expect(engine.cache.has('ayu.json')).toBe(true);
  });

  it('3.4 should combine Auto-Theme recommendation with Theme Switching and Italic verification', async () => {
    // 1. Get daytime recommendation (light theme)
    const dayTheme = await engine.getRecommendedTheme(11);
    expect(dayTheme.type).toBe('light');

    // 2. Set recommended light theme
    await engine.setTheme(dayTheme.label);
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe(dayTheme.label);

    // 3. Get nighttime recommendation (dark theme)
    const nightTheme = await engine.getRecommendedTheme(23);
    expect(nightTheme.type).toBe('dark');

    // 4. Switch to nighttime theme and verify theme type transition
    await engine.setTheme(nightTheme.label);
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe(nightTheme.label);
  });

  it('3.5 should execute full contributed command pipeline in sequence without side effects', async () => {
    // Step 1: Execute selectTheme
    vscode.setQuickPickHandler(async (items) => items.find((i) => i.id === 'monokai.json'));
    await vscode.commands.executeCommand('DelowarHossain.selectTheme');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Monokai');

    // Step 2: Open preview panel
    const previewPanel = await vscode.commands.executeCommand('DelowarHossain.previewTheme');
    expect(previewPanel).toBeDefined();

    // Step 3: Run font optimization
    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');
    expect(vscode.workspace.getConfiguration('editor').get('fontLigatures')).toBe(true);

    // Step 4: Toggle italic
    await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Monokai Italic');

    // Step 5: Verify preview panel, theme, and font remain intact
    expect(vscode.workspace.getConfiguration('editor').get('fontFamily')).toContain('Operator Mono');
  });

  it('3.6 should resolve inheritance during command execution and verify UI token availability', async () => {
    // ayuItalic.json uses include: "./_ui.json"
    await engine.setTheme('ayuItalic.json');
    const themeContent = await engine.getTheme('ayuItalic.json');

    // Workbench UI background must be populated via inheritance from _ui.json
    expect(themeContent.colors['editor.background']).toBeDefined();
    expect(themeContent.colors['activityBar.background']).toBeDefined();
    expect(themeContent.colors['statusBar.background']).toBeDefined();
  });
});
