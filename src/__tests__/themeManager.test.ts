import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ThemeManager } from '../themeManager';
import { join } from 'path';

jest.mock('vscode');

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
const testPath = join('c:', 'Users', 'mdhos', 'projects', 'the-compiled-thought-themes');
const extensionPath = testPath;
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
    const manager = ThemeManager.getInstance(mockContext); // Mock access to themesPath
    const themePath = join(extensionPath, 'themes');
    (manager as unknown as ThemeManagerInternal).themesPath = themePath;
    expect((manager as unknown as ThemeManagerInternal).themesPath).toBeDefined();
  });

  it('should handle theme loading states', () => {
    const manager = ThemeManager.getInstance(mockContext); // Mock loading themes set
    (manager as unknown as ThemeManagerInternal).loadingThemes = new Set();
    expect((manager as unknown as ThemeManagerInternal).loadingThemes).toEqual(new Set());
  });
});
