/**
 * Tier 1: Feature Coverage - Italic Variant Toggling & Detection
 * Minimum requirement: >= 5 isolated happy-path tests
 */

const path = require('path');
const { describe, it, expect, beforeEach } = require('../harness/test-framework');
const { createMockVSCode } = require('../harness/vscode-mock');
const { ThemeEngine, wireExtensionCommands } = require('../harness/theme-engine');

describe('Tier 1: Feature 5 - Italic Variant Toggling & Detection', () => {
  let vscode;
  let context;
  let engine;

  beforeEach(() => {
    vscode = createMockVSCode(path.resolve(__dirname, '../../..'));
    context = vscode.createExtensionContext();
    engine = new ThemeEngine(context, vscode);
    wireExtensionCommands(vscode, engine);
  });

  it('5.1 should toggle from standard TCT Ayu to TCT Ayu Italic', async () => {
    await engine.setTheme('TCT Ayu');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu');

    const result = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(result).toBe(true);

    const activeTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    expect(activeTheme).toBe('TCT Ayu Italic');
  });

  it('5.2 should toggle from TCT Ayu Italic back to standard TCT Ayu', async () => {
    await engine.setTheme('TCT Ayu Italic');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu Italic');

    const result = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(result).toBe(true);

    const activeTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    expect(activeTheme).toBe('TCT Ayu');
  });

  it('5.3 should toggle TCT Gruvbox <-> TCT Gruvbox Italic seamlessly', async () => {
    await engine.setTheme('gruvbox.json');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Gruvbox');

    await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Gruvbox Italic');

    await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Gruvbox');
  });

  it('5.4 should toggle TCT One Dark <-> TCT One Dark Italic seamlessly', async () => {
    await engine.setTheme('one.json');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT One Dark');

    await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT One Dark Italic');
  });

  it('5.5 should notify user when a theme does not have an italic counterpart', async () => {
    // TCT Candyland has no italic variant
    await engine.setTheme('TCTCandyland.json');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Candyland');

    const result = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(result).toBe(false);

    // Color theme should remain unchanged
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Candyland');

    const notifications = vscode.getNotifications();
    expect(
      notifications.info.some((msg) => msg.includes('No italic variant available'))
    ).toBe(true);
  });

  it('5.6 should preserve italic status metadata accurately across all theme entries', async () => {
    const allThemes = await engine.getThemes();
    const italicThemes = allThemes.filter((t) => t.isItalic);
    expect(italicThemes.length).toBeGreaterThanOrEqual(8);

    for (const t of italicThemes) {
      expect(
        t.id.toLowerCase().includes('italic') ||
          t.label.toLowerCase().includes('italic') ||
          t.internalName.toLowerCase().includes('italic')
      ).toBe(true);
    }
  });
});
