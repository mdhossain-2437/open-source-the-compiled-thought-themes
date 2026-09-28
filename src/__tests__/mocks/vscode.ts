/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';
import type { Uri as VSCodeUri, OutputChannel as VSCodeOutputChannel } from 'vscode';

export class Disposable {
  private _callOnDispose?: () => any;
  private _isDisposed = false;

  constructor(callOnDispose?: () => any) {
    this._callOnDispose = callOnDispose;
  }

  dispose(): any {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    if (this._callOnDispose) {
      const fn = this._callOnDispose;
      this._callOnDispose = undefined;
      return fn();
    }
  }

  static from(...disposables: { dispose(): any }[]): Disposable {
    return new Disposable(() => {
      for (const d of disposables) {
        if (d && typeof d.dispose === 'function') {
          try {
            d.dispose();
          } catch {
            // Protect subsequent disposals from failing
          }
        }
      }
    });
  }
}

export class EventEmitter<T = any> {
  private listeners: Array<(e: T) => any> = [];

  event = jest.fn((listener: (e: T) => any): Disposable => {
    this.listeners.push(listener);
    return new Disposable(() => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) {
        this.listeners.splice(idx, 1);
      }
    });
  });

  fire = jest.fn((data: T): void => {
    [...this.listeners].forEach((listener) => {
      try {
        listener(data);
      } catch {
        // Suppress listener error so other listeners execute
      }
    });
  });

  dispose = jest.fn((): void => {
    this.listeners = [];
  });
}

export const ExtensionMode = {
  Test: 1,
  Development: 2,
  Production: 3,
} as const;

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
} as const;

export const ColorThemeKind = {
  Light: 1,
  Dark: 2,
  HighContrast: 3,
  HighContrastLight: 4,
} as const;

export const ViewColumn = {
  Active: -1,
  Beside: -2,
  One: 1,
  Two: 2,
  Three: 3,
  Four: 4,
  Five: 5,
  Six: 6,
  Seven: 7,
  Eight: 8,
  Nine: 9,
} as const;

export const ProgressLocation = {
  SourceControl: 1,
  Window: 10,
  Notification: 15,
} as const;

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
} as const;

interface UriComponents {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
  fsPath: string;
}

const createMockUri = (fsPathOrUri: string, scheme = 'file'): VSCodeUri => {
  const normalized = fsPathOrUri.replace(/\\/g, '/');
  const uri = {
    scheme,
    authority: '',
    path: normalized,
    query: '',
    fragment: '',
    fsPath: fsPathOrUri,
    with: function (change: {
      scheme?: string;
      authority?: string;
      path?: string;
      query?: string;
      fragment?: string;
    }): VSCodeUri {
      return { ...this, ...change } as VSCodeUri;
    },
    toString: function (): string {
      return `${this.scheme}://${this.path}`;
    },
    toJSON: function (): UriComponents {
      return {
        scheme: this.scheme,
        authority: this.authority,
        path: this.path,
        query: this.query,
        fragment: this.fragment,
        fsPath: this.fsPath,
      };
    },
  };
  return uri as VSCodeUri;
};

export const Uri = {
  file: jest.fn((filePath: string) => createMockUri(filePath, 'file')),
  parse: jest.fn((uriStr: string) => {
    const parts = uriStr.split('://');
    const scheme = parts.length > 1 ? parts[0] : 'file';
    const path = parts.length > 1 ? parts.slice(1).join('://') : uriStr;
    return createMockUri(path, scheme);
  }),
  joinPath: jest.fn((base: VSCodeUri, ...pathSegments: string[]) => {
    const basePath = (base.fsPath || base.path).replace(/\\/g, '/').replace(/\/+$/, '');
    const joined = [basePath, ...pathSegments.map((s) => s.replace(/^\/+|\/+$/g, ''))].join('/');
    return createMockUri(joined, base.scheme || 'file');
  }),
};

const mockOutputChannel = (name: string): VSCodeOutputChannel => ({
  name,
  append: jest.fn(),
  appendLine: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
  hide: jest.fn(),
  replace: jest.fn(),
  show: jest.fn(),
});

const mockWebviewPanel = (viewType: string, title: string): any => ({
  viewType,
  title,
  webview: {
    html: '',
    onDidReceiveMessage: jest.fn((_listener: (e: any) => any) => new Disposable(() => {})),
    postMessage: jest.fn((_message: any) => Promise.resolve(true)),
    asWebviewUri: jest.fn((uri: any) => uri),
    cspSource: 'https://*.vscode-cdn.net',
  },
  options: {},
  viewColumn: 1,
  active: true,
  visible: true,
  onDidDispose: jest.fn((_listener: () => any) => new Disposable(() => {})),
  onDidChangeViewState: jest.fn((_listener: (e: any) => any) => new Disposable(() => {})),
  reveal: jest.fn(),
  dispose: jest.fn(),
});

export interface ConfigurationChangeEvent {
  affectsConfiguration(section: string): boolean;
}

const configStore = new Map<string, any>();
const onDidChangeConfigurationEmitter = new EventEmitter<ConfigurationChangeEvent>();

export const createMockConfiguration = (prefix?: string) => {
  return {
    get: jest.fn(<T>(section: string, defaultValue?: T): T => {
      const fullKey = prefix ? `${prefix}.${section}` : section;
      if (configStore.has(fullKey)) {
        return configStore.get(fullKey);
      }
      return defaultValue as T;
    }),
    has: jest.fn((section: string): boolean => {
      const fullKey = prefix ? `${prefix}.${section}` : section;
      return configStore.has(fullKey);
    }),
    update: jest.fn((section: string, value: any, _target?: any): Promise<void> => {
      const fullKey = prefix ? `${prefix}.${section}` : section;
      configStore.set(fullKey, value);
      onDidChangeConfigurationEmitter.fire({
        affectsConfiguration: (sec: string) => fullKey === sec || fullKey.startsWith(`${sec}.`) || sec.startsWith(`${fullKey}.`),
      });
      return Promise.resolve();
    }),
    inspect: jest.fn((section: string) => {
      const fullKey = prefix ? `${prefix}.${section}` : section;
      const val = configStore.get(fullKey);
      return {
        key: fullKey,
        defaultValue: undefined,
        globalValue: val,
        workspaceValue: undefined,
        workspaceFolderValue: undefined,
      };
    }),
  };
};

export const workspace = {
  getConfiguration: jest.fn((section?: string) => createMockConfiguration(section)),
  onDidChangeConfiguration: jest.fn((listener: (e: ConfigurationChangeEvent) => any) => {
    return onDidChangeConfigurationEmitter.event(listener);
  }),
  onDidChangeTextDocument: jest.fn((_listener: (e: any) => any) => {
    return new Disposable(() => {});
  }),
  fs: {
    writeFile: jest.fn((_uri: any, _content: any) => Promise.resolve()),
    readFile: jest.fn((_uri: any) => Promise.resolve(Buffer.from(''))),
    stat: jest.fn((_uri: any) => Promise.resolve({ type: 1, ctime: 0, mtime: 0, size: 0 })),
  },
  findFiles: jest.fn((_include?: any, _exclude?: any) => Promise.resolve([])),
  openTextDocument: jest.fn((_uri?: any) => Promise.resolve({ uri: _uri, getText: () => '' })),
  applyEdit: jest.fn((_edit?: any) => Promise.resolve(true)),
  workspaceFolders: [],
  name: 'test-workspace',
  _configStore: configStore,
  _resetConfig: () => {
    configStore.clear();
  },
  _onDidChangeConfigurationEmitter: onDidChangeConfigurationEmitter,
};

export const createStatusBarItem = jest.fn((alignmentOrId?: any, priorityOrAlignment?: any, priority?: any) => {
  const alignment = typeof alignmentOrId === 'number' ? alignmentOrId : typeof priorityOrAlignment === 'number' ? priorityOrAlignment : 1;
  const prio = typeof priority === 'number' ? priority : typeof priorityOrAlignment === 'number' ? priorityOrAlignment : undefined;
  return {
    id: typeof alignmentOrId === 'string' ? alignmentOrId : undefined,
    alignment,
    priority: prio,
    text: '',
    tooltip: '',
    color: '',
    backgroundColor: undefined,
    command: undefined,
    name: '',
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  };
});

export const window = {
  createOutputChannel: jest.fn(mockOutputChannel),
  createWebviewPanel: jest.fn(mockWebviewPanel),
  createStatusBarItem,
  showQuickPick: jest.fn(async (items: any, options?: any) => {
    const resolvedItems = await Promise.resolve(items);
    if (!Array.isArray(resolvedItems) || resolvedItems.length === 0) {
      return options?.canPickMany ? [] : undefined;
    }
    if (options?.canPickMany) {
      return [resolvedItems[0]];
    }
    return resolvedItems[0];
  }),
  showInformationMessage: jest.fn((_message: string, ...items: string[]) => {
    return Promise.resolve(items[0] || undefined);
  }),
  showWarningMessage: jest.fn((_message: string, ...items: string[]) => {
    return Promise.resolve(items[0] || undefined);
  }),
  showErrorMessage: jest.fn((_message: string, ...items: string[]) => {
    return Promise.resolve(items[0] || undefined);
  }),
  showInputBox: jest.fn((options?: any) => Promise.resolve(options?.value || '')),
  showOpenDialog: jest.fn((options?: any) => Promise.resolve(options?.defaultUri ? [options.defaultUri] : [])),
  showSaveDialog: jest.fn((options?: any) => {
    return Promise.resolve(options?.defaultUri || Uri.file('exported.json'));
  }),
  withProgress: jest.fn((_options: any, task: (progress: any, token: any) => Promise<any>) => {
    return task({ report: jest.fn() }, { isCancellationRequested: false });
  }),
  activeColorTheme: {
    kind: ColorThemeKind.Dark,
  },
  onDidChangeActiveColorTheme: jest.fn((_listener: (e: any) => any) => new Disposable(() => {})),
};

const commandRegistry = new Map<string, (...args: any[]) => any>();

export const commands = {
  registerCommand: jest.fn((command: string, callback: (...args: any[]) => any) => {
    commandRegistry.set(command, callback);
    return new Disposable(() => {
      commandRegistry.delete(command);
    });
  }),
  executeCommand: jest.fn(async (command: string, ...args: any[]) => {
    const handler = commandRegistry.get(command);
    if (handler) {
      return await handler(...args);
    }
    return undefined;
  }),
  getCommands: jest.fn(async () => Array.from(commandRegistry.keys())),
  _commandRegistry: commandRegistry,
  _resetCommands: () => commandRegistry.clear(),
};

export const env = {
  openExternal: jest.fn((_uri: any) => Promise.resolve(true)),
  clipboard: {
    readText: jest.fn(() => Promise.resolve('')),
    writeText: jest.fn((_value: string) => Promise.resolve()),
  },
  language: 'en',
  appName: 'Visual Studio Code',
};

const vscode = {
  Disposable,
  EventEmitter: jest.fn(() => new EventEmitter()),
  ExtensionMode,
  ConfigurationTarget,
  ColorThemeKind,
  ViewColumn,
  ProgressLocation,
  StatusBarAlignment,
  Uri,
  workspace,
  window,
  commands,
  env,
};

export default vscode;

