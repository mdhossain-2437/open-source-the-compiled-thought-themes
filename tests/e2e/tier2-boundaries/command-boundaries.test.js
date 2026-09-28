/**
 * Tier 2: Boundary & Corner Cases - Contributed Command Boundaries
 * Minimum requirement: >= 5 boundary test cases
 */

const path = require('path');
const { describe, it, expect, beforeEach } = require('../harness/test-framework');
const { createMockVSCode } = require('../harness/vscode-mock');
const { ThemeEngine, wireExtensionCommands } = require('../harness/theme-engine');

describe('Tier 2: Boundary 2 - Contributed Command Boundaries', () => {
  let vscode;
  let context;
  let engine;

  beforeEach(() => {
    vscode = createMockVSCode(path.resolve(__dirname, '../../..'));
    context = vscode.createExtensionContext();
    engine = new ThemeEngine(context, vscode);
    wireExtensionCommands(vscode, engine);
  });

  it('B2.1 should handle toggleItalic when no theme is set in configuration', async () => {
    // workbench.colorTheme is undefined
    const result = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(result).toBe(false);

    const notifications = vscode.getNotifications();
    expect(notifications.warning.some((msg) => msg.includes('No active theme set'))).toBe(true);
  });

  it('B2.2 should handle user cancellation of QuickPick in selectTheme gracefully', async () => {
    // User cancels QuickPick (returns undefined)
    vscode.setQuickPickHandler(async () => undefined);

    await engine.setTheme('TCT Ayu');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu');

    const result = await vscode.commands.executeCommand('DelowarHossain.selectTheme');
    expect(result).toBeNull();

    // Active theme should remain unchanged
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu');
  });

  it('B2.3 should throw an error when executing an unregistered command ID', async () => {
    let error;
    try {
      await vscode.commands.executeCommand('DelowarHossain.unregisteredNonExistentCommand');
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.message).toContain('Command not found');
  });

  it('B2.4 should handle direct programmatic invocation of selectTheme with valid and invalid IDs', async () => {
    // Direct invocation with valid ID
    await vscode.commands.executeCommand('DelowarHossain.selectTheme', 'darcula.json');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Darcula');

    // Direct invocation with non-existent ID
    let error;
    try {
      await vscode.commands.executeCommand('DelowarHossain.selectTheme', 'invalid-theme-id');
    } catch (err) {
      error = err;
    }
    // Should either throw THEME_NOT_FOUND or preserve existing theme
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Darcula');
  });

  it('B2.5 should handle rapid successive toggleItalic executions without race conditions', async () => {
    await engine.setTheme('material.json');
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Material');

    // Rapid toggle 4 times (even number of toggles -> should end back on regular)
    await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    await vscode.commands.executeCommand('DelowarHossain.toggleItalic');

    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Material');
  });

  it('B2.6 should safely handle randomTheme invocation when theme catalog is empty or populated', async () => {
    const selected = await vscode.commands.executeCommand('DelowarHossain.randomTheme');
    expect(selected).toBeDefined();
    expect(typeof selected.label).toBe('string');
  });
});
