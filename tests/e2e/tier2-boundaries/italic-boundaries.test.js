/**
 * Tier 2: Boundary & Corner Cases - Italic Toggling Boundaries
 * Minimum requirement: >= 5 boundary test cases
 */

const path = require('path');
const { describe, it, expect, beforeEach } = require('../harness/test-framework');
const { createMockVSCode } = require('../harness/vscode-mock');
const { ThemeEngine, wireExtensionCommands } = require('../harness/theme-engine');

describe('Tier 2: Boundary 5 - Italic Toggling Boundaries', () => {
  let vscode;
  let context;
  let engine;

  beforeEach(() => {
    vscode = createMockVSCode(path.resolve(__dirname, '../../..'));
    context = vscode.createExtensionContext();
    engine = new ThemeEngine(context, vscode);
    wireExtensionCommands(vscode, engine);
  });

  it('B5.1 should handle non-TCT third-party theme gracefully when toggling italic', async () => {
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    await workbenchConfig.update('colorTheme', 'Default Dark+', vscode.ConfigurationTarget.Global);

    const result = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(result).toBe(false);

    // Active theme should remain Default Dark+
    expect(workbenchConfig.get('colorTheme')).toBe('Default Dark+');

    const notifications = vscode.getNotifications();
    expect(
      notifications.warning.some((msg) => msg.includes('Current theme not found'))
    ).toBe(true);
  });

  it('B5.2 should maintain symmetry over 10 alternating toggle iterations', async () => {
    await engine.setTheme('TCT Ayu');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu');

    for (let i = 0; i < 10; i++) {
      await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
      const expected = i % 2 === 0 ? 'TCT Ayu Italic' : 'TCT Ayu';
      expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe(expected);
    }
  });

  it('B5.3 should handle case-insensitive "italic" in theme names', async () => {
    // Both "ayuItalic.json" and "darculaItalic.json"
    const ayuItalicMeta = engine.resolveMetadata('ayuitalic.json');
    expect(ayuItalicMeta).toBeDefined();
    expect(ayuItalicMeta.isItalic).toBe(true);

    const darculaItalicMeta = engine.resolveMetadata('DARCULAITALIC.JSON');
    expect(darculaItalicMeta).toBeDefined();
    expect(darculaItalicMeta.isItalic).toBe(true);
  });

  it('B5.4 should handle theme with no italic variant and not change configuration', async () => {
    await engine.setTheme('TCT Sunset');
    const beforeTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');

    const result = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(result).toBe(false);

    const afterTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    expect(afterTheme).toBe(beforeTheme);
  });

  it('B5.5 should handle empty workbench theme setting safely', async () => {
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    await workbenchConfig.update('colorTheme', '', vscode.ConfigurationTarget.Global);

    const result = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(result).toBe(false);
  });

  it('B5.6 should correctly pair slime and slimeItalic', async () => {
    await engine.setTheme('slime.json');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Slime');

    await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Slime Italic');

    await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Slime');
  });
});
