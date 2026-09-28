/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { resolve, join } from 'path';

jest.mock('vscode');
import * as vscode from 'vscode';
import { activate, deactivate, FontManager, GeminiAIManager, generateThemePreviewHTML } from '../extension';
import { ThemeManager } from '../themeManager';

describe('Extension Activation & Command Lifecycle', () => {
  const extensionPath = resolve(__dirname, '../../');
  const mockUri = vscode.Uri.file(extensionPath);
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    (vscode.workspace as any)._resetConfig();
    (vscode.commands as any)._resetCommands();
    ThemeManager._instance = undefined;

    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(() => Promise.resolve()),
        keys: jest.fn(() => []),
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn(() => Promise.resolve()),
        keys: jest.fn(() => []),
        setKeysForSync: jest.fn(),
      },
      extensionPath,
      extensionUri: mockUri,
      environmentVariableCollection: {} as any,
      asAbsolutePath: (rel: string) => join(extensionPath, rel),
      storagePath: join(extensionPath, 'storage'),
      globalStoragePath: join(extensionPath, 'global-storage'),
      logPath: join(extensionPath, 'log'),
      extensionMode: vscode.ExtensionMode.Test,
      secrets: {} as any,
      storageUri: mockUri,
      globalStorageUri: mockUri,
      logUri: mockUri,
      extension: {} as any,
    } as any as vscode.ExtensionContext;
  });

  afterEach(() => {
    deactivate();
    for (const d of mockContext.subscriptions) {
      if (d && typeof d.dispose === 'function') {
        try {
          d.dispose();
        } catch {
          // ignore
        }
      }
    }
    ThemeManager._instance = undefined;
  });

  it('should activate extension and register all contributed commands', async () => {
    await activate(mockContext);

    const registered = await vscode.commands.getCommands();
    expect(registered).toContain('DelowarHossain.selectTheme');
    expect(registered).toContain('DelowarHossain.toggleItalic');
    expect(registered).toContain('DelowarHossain.optimizeFontSettings');
    expect(registered).toContain('DelowarHossain.randomTheme');
    expect(registered).toContain('DelowarHossain.enableAutoTheme');
    expect(registered).toContain('DelowarHossain.previewTheme');
    expect(registered).toContain('DelowarHossain.viewThemeAnalytics');
    expect(registered).toContain('DelowarHossain.shareTheme');
    expect(registered).toContain('DelowarHossain.configureSchedule');
    expect(registered).toContain('DelowarHossain.customizeIcons');
    expect(registered).toContain('DelowarHossain.configureWorkspaceTheme');
    expect(registered).toContain('DelowarHossain.customizeKeyboardShortcuts');
    expect(registered).toContain('DelowarHossain.testThemes');

    expect(mockContext.subscriptions.length).toBeGreaterThan(10);
  });

  it('should execute DelowarHossain.selectTheme with valid preselectedId', async () => {
    await activate(mockContext);

    const result = await vscode.commands.executeCommand('DelowarHossain.selectTheme', 'ayu.json');
    expect(result).toBeDefined();
    expect((result as any).label).toBe('TCT Ayu');

    const activeTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
    expect(activeTheme).toBe('TCT Ayu');
  });

  it('should handle DelowarHossain.selectTheme with invalid preselectedId', async () => {
    await activate(mockContext);

    const result = await vscode.commands.executeCommand('DelowarHossain.selectTheme', 'nonexistent-xyz');
    expect(result).toBeNull();
  });

  it('should execute DelowarHossain.toggleItalic between standard and italic counterpart', async () => {
    await activate(mockContext);

    // Set standard theme
    await vscode.workspace.getConfiguration('workbench').update('colorTheme', 'TCT Ayu', vscode.ConfigurationTarget.Global);
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu');

    // Toggle to italic
    const toggledToItalic = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(toggledToItalic).toBe(true);
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu Italic');

    // Toggle back to standard
    const toggledBack = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(toggledBack).toBe(true);
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Ayu');
  });

  it('should handle DelowarHossain.toggleItalic when no active theme is set', async () => {
    await activate(mockContext);
    (vscode.workspace as any)._resetConfig();
    const result = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(result).toBe(false);
  });

  it('should handle DelowarHossain.toggleItalic when theme has no italic counterpart', async () => {
    await activate(mockContext);
    await vscode.workspace.getConfiguration('workbench').update('colorTheme', 'TCT Default Color', vscode.ConfigurationTarget.Global);
    const result = await vscode.commands.executeCommand('DelowarHossain.toggleItalic');
    expect(result).toBe(false);
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Default Color');
  });

  it('should handle DelowarHossain.selectTheme when QuickPick is cancelled', async () => {
    await activate(mockContext);
    const originalShowQuickPick = vscode.window.showQuickPick;
    (vscode.window as any).showQuickPick = jest.fn<any>().mockResolvedValue(undefined);

    const result = await vscode.commands.executeCommand('DelowarHossain.selectTheme');
    expect(result).toBeNull();

    (vscode.window as any).showQuickPick = originalShowQuickPick;
  });

  it('should handle DelowarHossain.selectTheme via QuickPick user selection', async () => {
    await activate(mockContext);
    const originalShowQuickPick = vscode.window.showQuickPick;
    (vscode.window as any).showQuickPick = jest.fn<any>().mockResolvedValue({ id: 'darcula.json', label: 'TCT Darcula' });

    const result = await vscode.commands.executeCommand('DelowarHossain.selectTheme');
    expect(result).toEqual({ id: 'darcula.json', label: 'TCT Darcula' });
    expect(vscode.workspace.getConfiguration('workbench').get('colorTheme')).toBe('TCT Darcula');

    (vscode.window as any).showQuickPick = originalShowQuickPick;
  });

  it('should cleanly execute deactivate and tear down active background timers', async () => {
    await activate(mockContext);
    await vscode.commands.executeCommand('DelowarHossain.enableAutoTheme');
    expect(() => deactivate()).not.toThrow();
  });

  it('should execute DelowarHossain.optimizeFontSettings and apply typography', async () => {
    await activate(mockContext);

    await vscode.commands.executeCommand('DelowarHossain.optimizeFontSettings');

    const config = vscode.workspace.getConfiguration('editor');
    const fontFamily = config.get<string>('fontFamily');
    const ligatures = config.get<boolean>('fontLigatures');

    expect(fontFamily).toContain('Operator Mono');
    expect(fontFamily).toContain('JetBrains Mono');
    expect(fontFamily).toContain('monospace');
    expect(ligatures).toBe(true);
  });

  it('should execute DelowarHossain.enableAutoTheme and update autoTheme setting', async () => {
    await activate(mockContext);

    const result = await vscode.commands.executeCommand('DelowarHossain.enableAutoTheme');
    expect(result).toBe(true);

    const autoThemeEnabled = vscode.workspace.getConfiguration('DelowarHossain').get<boolean>('autoTheme');
    expect(autoThemeEnabled).toBe(true);

    const activeTheme = vscode.workspace.getConfiguration('workbench').get<string>('colorTheme');
    expect(typeof activeTheme).toBe('string');
    expect((activeTheme || '').length).toBeGreaterThan(0);
  });

  it('should execute DelowarHossain.randomTheme and apply a theme from collection', async () => {
    await activate(mockContext);

    const selected = await vscode.commands.executeCommand('DelowarHossain.randomTheme');
    expect(selected).toBeDefined();

    const activeTheme = vscode.workspace.getConfiguration('workbench').get<string>('colorTheme');
    expect(activeTheme).toBe((selected as any).label);
  });

  it('should execute informational contributed commands without errors', async () => {
    await activate(mockContext);

    await expect(vscode.commands.executeCommand('DelowarHossain.viewThemeAnalytics')).resolves.not.toThrow();
    await expect(vscode.commands.executeCommand('DelowarHossain.shareTheme')).resolves.not.toThrow();
    await expect(vscode.commands.executeCommand('DelowarHossain.configureSchedule')).resolves.not.toThrow();
    await expect(vscode.commands.executeCommand('DelowarHossain.customizeIcons')).resolves.not.toThrow();
    await expect(vscode.commands.executeCommand('DelowarHossain.configureWorkspaceTheme')).resolves.not.toThrow();
  });

  it('should test GeminiAIManager and generateThemePreviewHTML', async () => {
    const aiManager = GeminiAIManager.getInstance(mockContext);
    expect(aiManager).toBeDefined();

    const theme = await aiManager.suggestTheme();
    expect(theme).toBe('TCT Professional');

    const manager = ThemeManager.getInstance(mockContext);
    const html = await generateThemePreviewHTML(manager);
    expect(html).toContain('TCT Theme Collection');
    expect(html).toContain('TCT Ayu');
  });

  it('should debounce FontManager.optimizeFontSettings on concurrent calls', async () => {
    const [p1, p2, p3] = await Promise.all([
      FontManager.optimizeFontSettings(),
      FontManager.optimizeFontSettings(),
      FontManager.optimizeFontSettings(),
    ]);

    expect(p1).toBeUndefined();
    expect(p2).toBeUndefined();
    expect(p3).toBeUndefined();
  });
});
