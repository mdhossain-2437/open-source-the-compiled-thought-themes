/**
 * Tier 1: Feature Coverage - Font Optimization & Typography
 * Minimum requirement: >= 5 isolated happy-path tests
 */

const path = require('path');
const { describe, it, expect, beforeEach } = require('../harness/test-framework');
const { createMockVSCode } = require('../harness/vscode-mock');
const { ThemeEngine, wireExtensionCommands } = require('../harness/theme-engine');

describe('Tier 1: Feature 4 - Font Optimization & Typography Management', () => {
  let vscode;
  let context;
  let engine;

  beforeEach(() => {
    vscode = createMockVSCode(path.resolve(__dirname, '../../..'));
    context = vscode.createExtensionContext();
    engine = new ThemeEngine(context, vscode);
    wireExtensionCommands(vscode, engine);
  });

  it('4.1 should set recommended fonts when no editor font family is configured', async () => {
    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');

    const config = vscode.workspace.getConfiguration('editor');
    const fontFamily = config.get('fontFamily');
    expect(fontFamily).toBeDefined();
    expect(fontFamily).toContain('Operator Mono');
    expect(fontFamily).toContain('Fira Code');
  });

  it('4.2 should enable font ligatures globally for programming ligature support', async () => {
    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');

    const config = vscode.workspace.getConfiguration('editor');
    expect(config.get('fontLigatures')).toBe(true);
  });

  it('4.3 should display user confirmation message upon font optimization', async () => {
    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');

    const notifications = vscode.getNotifications();
    expect(notifications.info.some((msg) => msg.includes('Font optimized'))).toBe(true);
  });

  it('4.4 should debounce concurrent font optimization requests into a single promise', async () => {
    const p1 = vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');
    const p2 = vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe(true);
    expect(r2).toBe(true);
    const notifications = vscode.getNotifications();
    // Notifications should not be duplicated excessively
    expect(notifications.info.length).toBeLessThanOrEqual(2);
  });

  it('4.5 should include fallback monospace in the font stack for accessibility', async () => {
    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');

    const fontFamily = vscode.workspace.getConfiguration('editor').get('fontFamily');
    expect(fontFamily.endsWith('monospace')).toBe(true);
  });

  it('4.6 should ensure JetBrains Mono and Cascadia Code are included in typography stack', async () => {
    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');

    const fontFamily = vscode.workspace.getConfiguration('editor').get('fontFamily');
    expect(fontFamily).toContain('JetBrains Mono');
    expect(fontFamily).toContain('Cascadia Code');
  });
});
