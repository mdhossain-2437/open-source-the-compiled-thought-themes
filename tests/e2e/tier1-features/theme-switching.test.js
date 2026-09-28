/**
 * Tier 1: Feature Coverage - Dynamic Theme Switching & Resolution
 * Minimum requirement: >= 5 isolated happy-path tests
 */

const path = require('path');
const { describe, it, expect, beforeEach } = require('../harness/test-framework');
const { createMockVSCode } = require('../harness/vscode-mock');
const { ThemeEngine, wireExtensionCommands } = require('../harness/theme-engine');

describe('Tier 1: Feature 1 - Dynamic Theme Switching & Resolution', () => {
  let vscode;
  let context;
  let engine;

  beforeEach(() => {
    vscode = createMockVSCode(path.resolve(__dirname, '../../..'));
    context = vscode.createExtensionContext();
    engine = new ThemeEngine(context, vscode);
    wireExtensionCommands(vscode, engine);
  });

  it('1.1 should resolve and apply a theme by its canonical manifest label', async () => {
    await engine.setTheme('TCT Ayu');
    const activeTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    expect(activeTheme).toBe('TCT Ayu');

    const theme = await engine.getTheme('TCT Ayu');
    expect(theme).toBeDefined();
    expect(theme.label).toBe('TCT Ayu');
    expect(theme.type).toBe('dark');
  });

  it('1.2 should resolve and apply a theme by its disk filename', async () => {
    await engine.setTheme('material.json');
    const activeTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    expect(activeTheme).toBe('TCT Material');

    const theme = await engine.getTheme('material.json');
    expect(theme.name).toBe('TCT Material');
    expect(theme.tokenColors.length).toBeGreaterThan(0);
  });

  it('1.3 should resolve and apply a theme by its internal JSON name', async () => {
    await engine.setTheme('ayu');
    const activeTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    expect(activeTheme).toBe('TCT Ayu');

    const theme = await engine.getTheme('ayu');
    expect(theme).toBeDefined();
    expect(theme.name).toBe('TCT Ayu');
  });

  it('1.4 should retrieve complete metadata catalog for all installed themes', async () => {
    const themes = await engine.getThemes();
    expect(themes.length).toBe(48);

    const darkThemes = themes.filter((t) => t.type === 'dark');
    const lightThemes = themes.filter((t) => t.type === 'light');
    expect(darkThemes.length).toBeGreaterThan(30);
    expect(lightThemes.length).toBeGreaterThan(1);

    // Verify every theme has required metadata fields
    for (const theme of themes) {
      expect(typeof theme.id).toBe('string');
      expect(typeof theme.label).toBe('string');
      expect(typeof theme.path).toBe('string');
      expect(['dark', 'light', 'hc'].includes(theme.type)).toBe(true);
    }
  });

  it('1.5 should accurately provide time-of-day recommended themes for day and night', async () => {
    // Daytime recommendation (10:00 AM)
    const dayTheme = await engine.getRecommendedTheme(10);
    expect(dayTheme).toBeDefined();
    expect(dayTheme.type).toBe('light');

    // Nighttime recommendation (22:00 PM)
    const nightTheme = await engine.getRecommendedTheme(22);
    expect(nightTheme).toBeDefined();
    expect(nightTheme.type).toBe('dark');
    expect(nightTheme.isItalic).toBe(false);
  });

  it('1.6 should resolve theme inheritance when "include" directive is used', async () => {
    // ayu.json includes "./_ui.json"
    const ayuTheme = await engine.getTheme('ayu.json');
    expect(ayuTheme.raw.include).toBe('./_ui.json');
    // Ensure colors were merged from the included file
    expect(Object.keys(ayuTheme.colors).length).toBeGreaterThan(50);
    expect(ayuTheme.colors['editor.background']).toBeDefined();
  });
});
