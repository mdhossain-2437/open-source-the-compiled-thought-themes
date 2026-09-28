/**
 * Tier 1: Feature Coverage - Contributed Command Execution
 * Minimum requirement: >= 5 isolated happy-path tests
 */

const path = require('path');
const { describe, it, expect, beforeEach } = require('../harness/test-framework');
const { createMockVSCode } = require('../harness/vscode-mock');
const { ThemeEngine, wireExtensionCommands } = require('../harness/theme-engine');

describe('Tier 1: Feature 2 - Contributed Command Execution', () => {
  let vscode;
  let context;
  let engine;

  beforeEach(() => {
    vscode = createMockVSCode(path.resolve(__dirname, '../../..'));
    context = vscode.createExtensionContext();
    engine = new ThemeEngine(context, vscode);
    wireExtensionCommands(vscode, engine);
  });

  it('2.1 should execute DelowarHossain.selectTheme and apply user selection', async () => {
    vscode.setQuickPickHandler(async (items) => {
      return items.find((i) => i.id === 'monokai.json') || items[0];
    });

    await vscode.commands.executeCommand('DelowarHossain.selectTheme');
    const activeTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    expect(activeTheme).toBe('TCT Monokai');

    const notifications = vscode.getNotifications();
    expect(notifications.info.some((msg) => msg.includes('TCT Monokai'))).toBe(true);
  });

  it('2.2 should execute DelowarHossain.toggleItalic and switch to italic counterpart', async () => {
    // Set initial theme to TCT Material
    await engine.setTheme('material.json');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Material');

    // Execute toggleItalic
    const toggled = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(toggled).toBe(true);

    const activeTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    expect(activeTheme).toBe('TCT Material Italic');
  });

  it('2.3 should execute DelowarHossain.previewTheme and create webview panel', async () => {
    const panel = await vscode.commands.executeCommand('DelowarHossain.previewTheme');
    expect(panel).toBeDefined();
    expect(panel.viewType).toBe('tctThemePreview');
    expect(panel.title).toBe('TCT Theme Previewer');
    expect(panel.webview.html).toContain('TCT Themes Preview');
  });

  it('2.4 should execute DelowarHossain.optimizeFontSettings and persist typography', async () => {
    const success = await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');
    expect(success).toBe(true);

    const editorConfig = vscode.workspace.getConfiguration('editor');
    const fontFamily = editorConfig.get('fontFamily');
    const fontLigatures = editorConfig.get('fontLigatures');

    expect(fontFamily).toContain('Operator Mono');
    expect(fontFamily).toContain('Fira Code');
    expect(fontFamily).toContain('JetBrains Mono');
    expect(fontLigatures).toBe(true);
  });

  it('2.5 should execute DelowarHossain.enableAutoTheme and update configuration', async () => {
    const result = await vscode.commands.executeCommand('DelowarHossain.enableAutoTheme');
    expect(result).toBe(true);

    const autoTheme = vscode.workspace.getConfiguration('DelowarHossain').get('autoTheme');
    expect(autoTheme).toBe(true);

    // Active theme should be set to recommended theme
    const activeTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    expect(typeof activeTheme).toBe('string');
    expect(activeTheme.length).toBeGreaterThan(0);
  });

  it('2.6 should execute DelowarHossain.randomTheme and apply a valid theme', async () => {
    const selected = await vscode.commands.executeCommand('DelowarHossain.randomTheme');
    expect(selected).toBeDefined();

    const activeTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    expect(activeTheme).toBe(selected.label);

    const allThemes = await engine.getThemes();
    expect(allThemes.some((t) => t.label === activeTheme)).toBe(true);
  });
});
