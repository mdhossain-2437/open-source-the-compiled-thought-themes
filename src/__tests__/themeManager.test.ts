import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ThemeManager, type ThemeError } from '../themeManager';
import { join, resolve } from 'path';

jest.mock('vscode');
import * as vscode from 'vscode';

// Import types from vscode
import type {
  Uri,
  ExtensionContext,
  Extension,
  LanguageModelAccessInformation,
  Event,
  SecretStorageChangeEvent,
  EnvironmentVariableCollection,
  EnvironmentVariableMutator,
  Disposable,
  LanguageModelChat,
  GlobalEnvironmentVariableCollection,
  Memento,
} from 'vscode';

// Use path relative to the test file location
const extensionPath = resolve(__dirname, '../../');
const fixturesPath = join(extensionPath, 'themes');

type ExtensionMemento = Memento & { setKeysForSync(keys: readonly string[]): void };

const mockUri = {
  fsPath: fixturesPath,
  path: fixturesPath,
  scheme: 'file',
  authority: '',
  query: '',
  fragment: '',
  with: function (change: {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): Uri {
    return { ...this, ...change } as Uri;
  },
  toJSON: function (): {
    scheme: string;
    authority: string;
    path: string;
    query: string;
    fragment: string;
  } {
    return {
      scheme: this.scheme,
      authority: this.authority,
      path: this.path,
      query: this.query,
      fragment: this.fragment,
    };
  },
};

const mockExtension: Extension<unknown> = {
  id: 'test-extension',
  extensionUri: mockUri,
  extensionPath: extensionPath,
  isActive: true,
  packageJSON: {},
  activate: function (): Promise<unknown> {
    return Promise.resolve(undefined);
  },
  exports: undefined,
  extensionKind: 1, // ExtensionKind.Workspace
};

const mockOnDidChange: Event<void> = (_listener: (_e: void) => void): Disposable => {
  return {
    dispose: (): void => {
      /* noop */
    },
  };
};

const mockLangModelAccess: LanguageModelAccessInformation = {
  onDidChange: mockOnDidChange,
  canSendRequest: (_chat: LanguageModelChat): boolean => false,
};

const mockEnvCollection: GlobalEnvironmentVariableCollection = {
  replace: jest.fn(),
  append: jest.fn(),
  prepend: jest.fn(),
  get: (_variable: string): EnvironmentVariableMutator | undefined => undefined,
  forEach: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  persistent: true,
  description: '',
  [Symbol.iterator]: function* () {
    yield* [];
  },
  getScoped: (): EnvironmentVariableCollection => mockEnvCollection,
};

const createMemento = (): ExtensionMemento => ({
  get: (_key: string): unknown => undefined,
  update: (_key: string, _value: unknown): Promise<void> => Promise.resolve(),
  keys: (): readonly string[] => [],
  setKeysForSync: (_keys: readonly string[]): void => {
    /* noop */
  },
});

const mockContext: ExtensionContext = {
  subscriptions: [],
  extensionPath: extensionPath,
  globalState: createMemento(),
  workspaceState: createMemento(),
  environmentVariableCollection: mockEnvCollection,
  storageUri: mockUri,
  globalStorageUri: mockUri,
  logUri: mockUri,
  extensionUri: mockUri,
  asAbsolutePath: (relativePath: string): string => join(extensionPath, relativePath),
  storagePath: join(extensionPath, 'storage'),
  globalStoragePath: join(extensionPath, 'global-storage'),
  logPath: join(extensionPath, 'log'),
  extensionMode: 1, // ExtensionMode.Test
  secrets: {
    get: (_key: string): Promise<string | undefined> => Promise.resolve(undefined),
    store: (_key: string, _value: string): Promise<void> => Promise.resolve(),
    delete: (_key: string): Promise<void> => Promise.resolve(),
    onDidChange: ((_listener: (e: SecretStorageChangeEvent) => void): Disposable => {
      return {
        dispose: (): void => {
          /* noop */
        },
      };
    }) as unknown as Event<SecretStorageChangeEvent>,
  },
  extension: mockExtension,
  languageModelAccessInformation: mockLangModelAccess,
};

interface ThemeManagerInternal extends ThemeManager {
  _instance?: ThemeManager;
  themesPath: string;
  loadingThemes: Set<string>;
}

describe('ThemeManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (ThemeManager as unknown as ThemeManagerInternal)._instance = undefined;
  });

  it('should be a singleton', () => {
    const instance1 = ThemeManager.getInstance(mockContext);
    const instance2 = ThemeManager.getInstance(mockContext);
    expect(instance1).toBe(instance2);
  });

  it('should initialize with themes path', () => {
    const manager = ThemeManager.getInstance(mockContext);
    const themePath = join(extensionPath, 'themes');
    expect(manager.themesPath).toBe(themePath);
  });

  it('should handle theme loading states', () => {
    const manager = ThemeManager.getInstance(mockContext);
    expect(manager.loadingThemes).toBeInstanceOf(Set);
  });

  it('should resolve metadata across all lookup vectors (label, filename, relative path, absolute path, stripped)', () => {
    const manager = ThemeManager.getInstance(mockContext);

    // 1. Label
    const metaByLabel = manager.resolveMetadata('TCT Ayu');
    expect(metaByLabel).not.toBeNull();
    expect(metaByLabel?.label).toBe('TCT Ayu');

    // 2. Filename
    const metaByFile = manager.resolveMetadata('ayu.json');
    expect(metaByFile).not.toBeNull();
    expect(metaByFile?.filename).toBe('ayu.json');

    // 3. Relative path with ./
    const metaByRel = manager.resolveMetadata('./themes/ayu.json');
    expect(metaByRel).not.toBeNull();
    expect(metaByRel?.label).toBe('TCT Ayu');

    // 4. Relative path without ./
    const metaByRelNoDot = manager.resolveMetadata('themes/ayu.json');
    expect(metaByRelNoDot).not.toBeNull();
    expect(metaByRelNoDot?.label).toBe('TCT Ayu');

    // 5. Absolute path
    const absPath = resolve(extensionPath, 'themes/ayu.json');
    const metaByAbs = manager.resolveMetadata(absPath);
    expect(metaByAbs).not.toBeNull();
    expect(metaByAbs?.label).toBe('TCT Ayu');

    // 6. Stripped prefix
    const metaStripped = manager.resolveMetadata('Ayu');
    expect(metaStripped).not.toBeNull();
    expect(metaStripped?.label).toBe('TCT Ayu');

    // 7. Security: Path traversal rejected
    expect(manager.resolveMetadata('../../package.json')).toBeNull();
    expect(manager.resolveMetadata('..\\..\\package.json')).toBeNull();

    // 8. Empty / invalid inputs
    expect(manager.resolveMetadata('')).toBeNull();
    expect(manager.resolveMetadata('   ')).toBeNull();
    expect(manager.resolveMetadata(null as unknown as string)).toBeNull();
  });

  it('should load theme with full inheritance and return valid ThemeContent', async () => {
    const manager = ThemeManager.getInstance(mockContext);
    const theme = await manager.getTheme('TCT Ayu');

    expect(theme).toBeDefined();
    expect(theme.name).toBe('TCT Ayu');
    expect(theme.label).toBe('TCT Ayu');
    expect(theme.type).toBe('dark');
    expect(typeof theme.colors).toBe('object');
    // Ayu inherits from _ui.json, verify workbench tokens resolved
    expect(theme.colors['editor.background']).toBeDefined();
    expect(Array.isArray(theme.tokenColors)).toBe(true);
    expect(theme.tokenColors.length).toBeGreaterThan(0);
  });

  it('should throw THEME_NOT_FOUND error with code for nonexistent theme', async () => {
    const manager = ThemeManager.getInstance(mockContext);
    let thrownError: ThemeError | null = null;
    try {
      await manager.getTheme('completely-invalid-theme-xyz');
    } catch (err) {
      thrownError = err as ThemeError;
    }
    expect(thrownError).not.toBeNull();
    expect(thrownError?.code).toBe('THEME_NOT_FOUND');
    expect(thrownError?.themeId).toBe('completely-invalid-theme-xyz');
  });

  it('should set theme and update workbench.colorTheme in configuration', async () => {
    const manager = ThemeManager.getInstance(mockContext);
    await manager.setTheme('TCT Ayu');
    const config = vscode.workspace.getConfiguration('workbench');
    expect(config.get('colorTheme')).toBe('TCT Ayu');
  });

  it('should retrieve catalog of all 48 themes with complete metadata', async () => {
    const manager = ThemeManager.getInstance(mockContext);
    const themes = await manager.getThemes();
    expect(themes.length).toBe(48);

    for (const t of themes) {
      expect(t.id).toBeDefined();
      expect(t.name).toBeDefined();
      expect(t.label).toBeDefined();
      expect(t.type).toMatch(/^(dark|light|hc)$/);
      expect(t.uiTheme).toMatch(/^(vs|vs-dark|hc-black)$/);
    }
  });

  it('should provide time-of-day recommended theme for day and night', async () => {
    const manager = ThemeManager.getInstance(mockContext);

    // Night hour (hour = 22 -> dark)
    const nightTheme = await manager.getRecommendedTheme(22);
    expect(nightTheme.type).toBe('dark');

    // Day hour (hour = 12 -> light)
    const dayTheme = await manager.getRecommendedTheme(12);
    expect(dayTheme.type).toBe('light');
  });

  it('should implement O(1) LRU bounded caching and eviction at capacity 10', async () => {
    const manager = ThemeManager.getInstance(mockContext);
    manager.clearCache();
    expect(manager.getCacheStats().size).toBe(0);

    const themeIds = manager.getAllThemeIds();
    expect(themeIds.length).toBeGreaterThanOrEqual(15);

    // Load first 10 themes (filling cache to capacity)
    for (let i = 0; i < 10; i++) {
      await manager.getTheme(themeIds[i]);
    }
    expect(manager.getCacheStats().size).toBe(10);
    expect(manager.getCacheStats().evictions).toBe(0);

    // Load 11th theme -> causes eviction of 1st theme
    await manager.getTheme(themeIds[10]);
    expect(manager.getCacheStats().size).toBe(10);
    expect(manager.getCacheStats().evictions).toBe(1);

    // Loading cached theme hits cache
    const initialHits = manager.getCacheStats().hits;
    await manager.getTheme(themeIds[10]);
    expect(manager.getCacheStats().hits).toBe(initialHits + 1);

    // clearCache resets completely
    manager.clearCache();
    expect(manager.getCacheStats().size).toBe(0);
    expect(manager.getCacheStats().hits).toBe(0);
  });

  it('should coalesce concurrent in-flight requests for the same uncached theme', async () => {
    const manager = ThemeManager.getInstance(mockContext);
    manager.clearCache();

    // Fire 5 simultaneous loads for TCT Dracula
    const [t1, t2, t3, t4, t5] = await Promise.all([
      manager.getTheme('dracula-theme.json'),
      manager.getTheme('dracula-theme.json'),
      manager.getTheme('dracula-theme.json'),
      manager.getTheme('dracula-theme.json'),
      manager.getTheme('dracula-theme.json'),
    ]);

    expect(t1).toBeDefined();
    expect(t2).toBe(t1);
    expect(t3).toBe(t1);
    expect(t4).toBe(t1);
    expect(t5).toBe(t1);
    expect(manager.getCacheStats().misses).toBe(1);
  });
});

describe('VS Code Mock Infrastructure', () => {
  it('should mock workspace configuration with get and update', async () => {
    const config = vscode.workspace.getConfiguration('workbench');
    expect(config).toBeDefined();
    await config.update('colorTheme', 'TCT Ayu', vscode.ConfigurationTarget.Global);
    expect(config.get('colorTheme')).toBe('TCT Ayu');
  });

  it('should mock window notification and dialog methods', async () => {
    const info = await vscode.window.showInformationMessage('Theme switched', 'OK');
    expect(info).toBe('OK');
    const err = await vscode.window.showErrorMessage('Error occurred', 'Dismiss');
    expect(err).toBe('Dismiss');
    const channel = vscode.window.createOutputChannel('TCT');
    expect(channel.name).toBe('TCT');
    expect(channel.appendLine).toBeDefined();
  });

  it('should mock commands registration and execution', async () => {
    const handler = jest.fn(async () => 'executed');
    const disposable = vscode.commands.registerCommand('DelowarHossain.selectTheme', handler);
    expect(disposable.dispose).toBeDefined();

    const result = await vscode.commands.executeCommand('DelowarHossain.selectTheme');
    expect(result).toBe('executed');
    expect(handler).toHaveBeenCalledTimes(1);

    disposable.dispose();
  });

  it('should mock Uri file, parse, and joinPath', () => {
    const fileUri = vscode.Uri.file('/path/to/theme.json');
    expect(fileUri.scheme).toBe('file');
    expect(fileUri.fsPath).toContain('theme.json');

    const parsedUri = vscode.Uri.parse('https://github.com/mdhossain-2437');
    expect(parsedUri.scheme).toBe('https');

    const joinedUri = vscode.Uri.joinPath(fileUri, 'subfolder', 'child.json');
    expect(joinedUri.scheme).toBe('file');
    expect(joinedUri.fsPath).toContain('child.json');
  });

  it('should isolate configuration namespaces without cross-pollution and fire change events', async () => {
    let firedEvent: { affectsConfiguration: (section: string) => boolean } | null = null;
    const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
      firedEvent = e;
    });

    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    await workbenchConfig.update('colorTheme', 'TCT Ayu', vscode.ConfigurationTarget.Global);

    expect(workbenchConfig.get('colorTheme')).toBe('TCT Ayu');
    expect(vscode.workspace.getConfiguration().get('workbench.colorTheme')).toBe('TCT Ayu');

    const unrelatedConfig = vscode.workspace.getConfiguration('unrelated');
    expect(unrelatedConfig.get('colorTheme', 'defaultVal')).toBe('defaultVal');

    expect(firedEvent).not.toBeNull();
    expect(firedEvent!.affectsConfiguration('workbench.colorTheme')).toBe(true);
    expect(firedEvent!.affectsConfiguration('unrelated.colorTheme')).toBe(false);

    disposable.dispose();
  });

  it('should handle showQuickPick with Promise items and canPickMany option', async () => {
    const promiseItems = Promise.resolve(['TCT Ayu', 'TCT Dracula']);
    const singleResult = await vscode.window.showQuickPick(promiseItems);
    expect(singleResult).toBe('TCT Ayu');

    const multiPromiseItems = Promise.resolve(['Theme 1', 'Theme 2']);
    const multiResult = await vscode.window.showQuickPick(multiPromiseItems, { canPickMany: true });
    expect(Array.isArray(multiResult)).toBe(true);
    expect(multiResult).toEqual(['Theme 1']);

    const emptyResult = await vscode.window.showQuickPick([], { canPickMany: true });
    expect(emptyResult).toEqual([]);
  });

  it('should ensure Disposable.dispose is idempotent and Disposable.from is resilient', () => {
    let callCount = 0;
    const singleDisposable = new vscode.Disposable(() => {
      callCount++;
    });

    singleDisposable.dispose();
    singleDisposable.dispose();
    expect(callCount).toBe(1);

    let secondDisposed = false;
    const combined = vscode.Disposable.from(
      new vscode.Disposable(() => {
        throw new Error('Disposal failure');
      }),
      new vscode.Disposable(() => {
        secondDisposed = true;
      })
    );

    expect(() => combined.dispose()).not.toThrow();
    expect(secondDisposed).toBe(true);
  });

  it('should mock window.createStatusBarItem with full lifecycle', () => {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    expect(item).toBeDefined();
    expect(item.alignment).toBe(1);
    expect(item.priority).toBe(100);

    item.text = '$(paintcan) TCT';
    item.tooltip = 'Switch Theme';
    item.show();
    expect(item.show).toHaveBeenCalledTimes(1);

    item.hide();
    expect(item.hide).toHaveBeenCalledTimes(1);

    item.dispose();
    expect(item.dispose).toHaveBeenCalledTimes(1);
  });

  it('should provide standard VS Code enums', () => {
    expect(vscode.ConfigurationTarget.Global).toBe(1);
    expect(vscode.ExtensionMode.Test).toBe(1);
    expect(vscode.ColorThemeKind.Dark).toBe(2);
    expect(vscode.ViewColumn.One).toBe(1);
    expect(vscode.StatusBarAlignment.Left).toBe(1);
    expect(vscode.StatusBarAlignment.Right).toBe(2);
  });
});


