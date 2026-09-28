/**
 * Tier 2: Boundary & Corner Cases - Font Optimization Boundaries
 * Minimum requirement: >= 5 boundary test cases
 */

const path = require('path');
const { describe, it, expect, beforeEach } = require('../harness/test-framework');
const { createMockVSCode } = require('../harness/vscode-mock');
const { ThemeEngine, wireExtensionCommands } = require('../harness/theme-engine');

describe('Tier 2: Boundary 4 - Font Optimization Boundaries', () => {
  let vscode;
  let context;
  let engine;

  beforeEach(() => {
    vscode = createMockVSCode(path.resolve(__dirname, '../../..'));
    context = vscode.createExtensionContext();
    engine = new ThemeEngine(context, vscode);
    wireExtensionCommands(vscode, engine);
  });

  it('B4.1 should handle font optimization when configuration string is whitespace only', async () => {
    const editorConfig = vscode.workspace.getConfiguration('editor');
    await editorConfig.update('fontFamily', '    ', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');

    const result = editorConfig.get('fontFamily');
    expect(result).toContain('Operator Mono');
    expect(result).toContain('Fira Code');
  });

  it('B4.2 should handle font optimization when configuration string is completely empty', async () => {
    const editorConfig = vscode.workspace.getConfiguration('editor');
    await editorConfig.update('fontFamily', '', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');

    const result = editorConfig.get('fontFamily');
    expect(result.length).toBeGreaterThan(20);
    expect(result).toContain('JetBrains Mono');
  });

  it('B4.3 should keep font ligatures set to true even if already true', async () => {
    const editorConfig = vscode.workspace.getConfiguration('editor');
    await editorConfig.update('fontLigatures', true, vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');
    expect(editorConfig.get('fontLigatures')).toBe(true);
  });

  it('B4.4 should enable font ligatures when previously set to false', async () => {
    const editorConfig = vscode.workspace.getConfiguration('editor');
    await editorConfig.update('fontLigatures', false, vscode.ConfigurationTarget.Global);
    expect(editorConfig.get('fontLigatures')).toBe(false);

    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');
    expect(editorConfig.get('fontLigatures')).toBe(true);
  });

  it('B4.5 should handle rapid sequential calls without conflicting configuration updates', async () => {
    for (let i = 0; i < 5; i++) {
      await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');
    }

    const editorConfig = vscode.workspace.getConfiguration('editor');
    expect(editorConfig.get('fontLigatures')).toBe(true);
    expect(editorConfig.get('fontFamily')).toContain('Operator Mono');
  });

  it('B4.6 should ensure fallback monospace is always present at end of font list', async () => {
    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');

    const fontFamily = vscode.workspace.getConfiguration('editor').get('fontFamily');
    const fonts = fontFamily.split(',').map((f) => f.trim());
    expect(fonts[fonts.length - 1]).toBe('monospace');
  });
});
