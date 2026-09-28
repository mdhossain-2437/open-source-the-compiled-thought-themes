/**
 * VS Code Mock Runtime Environment for Opaque-Box E2E Testing
 * Provides faithful simulation of VS Code extension host APIs:
 * - workspace (configuration get/update, onDidChangeConfiguration)
 * - commands (registerCommand, executeCommand)
 * - window (showInformationMessage, showWarningMessage, showErrorMessage, showQuickPick, webviews)
 * - Uri & ExtensionContext
 */

const path = require('path');
const { EventEmitter } = require('events');

class MockConfiguration {
  constructor(store, section = '') {
    this._store = store;
    this._section = section;
  }

  get(key, defaultValue) {
    const fullKey = this._section ? `${this._section}.${key}` : key;
    if (this._store.has(fullKey)) {
      return this._store.get(fullKey);
    }
    // Also check partial prefix matches if section omitted
    if (!this._section && this._store.has(key)) {
      return this._store.get(key);
    }
    return defaultValue;
  }

  has(key) {
    const fullKey = this._section ? `${this._section}.${key}` : key;
    return this._store.has(fullKey);
  }

  async update(key, value, configurationTarget = 1) {
    const fullKey = this._section ? `${this._section}.${key}` : key;
    if (value === undefined) {
      this._store.delete(fullKey);
    } else {
      this._store.set(fullKey, value);
    }
    this._store.emitter.emit('change', {
      affectsConfiguration: (section) => fullKey.startsWith(section) || section.startsWith(fullKey),
      key: fullKey,
      value,
      target: configurationTarget,
    });
  }

  inspect(key) {
    const fullKey = this._section ? `${this._section}.${key}` : key;
    return {
      key: fullKey,
      globalValue: this._store.get(fullKey),
      workspaceValue: undefined,
      defaultValue: undefined,
    };
  }
}

class MockConfigurationStore {
  constructor() {
    this.map = new Map();
    this.emitter = new EventEmitter();
  }

  get(key) {
    return this.map.get(key);
  }

  has(key) {
    return this.map.has(key);
  }

  set(key, value) {
    this.map.set(key, value);
  }

  delete(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

function createMockVSCode(projectRoot) {
  const configStore = new MockConfigurationStore();
  const commandRegistry = new Map();
  const notifications = {
    info: [],
    warning: [],
    error: [],
  };

  let quickPickHandler = null; // Customizable handler for interactive QuickPick simulation

  const Uri = {
    file(fsPath) {
      return {
        scheme: 'file',
        authority: '',
        path: fsPath.replace(/\\/g, '/'),
        fsPath: path.resolve(fsPath),
        toString: () => `file://${fsPath.replace(/\\/g, '/')}`,
      };
    },
    parse(uriStr) {
      return {
        scheme: uriStr.split(':')[0] || 'file',
        authority: '',
        path: uriStr,
        fsPath: uriStr,
        toString: () => uriStr,
      };
    },
  };

  const workspace = {
    getConfiguration(section) {
      return new MockConfiguration(configStore, section);
    },
    onDidChangeConfiguration(listener) {
      configStore.emitter.on('change', listener);
      return {
        dispose: () => configStore.emitter.off('change', listener),
      };
    },
    asRelativePath(pathOrUri) {
      const fsPath = typeof pathOrUri === 'string' ? pathOrUri : pathOrUri.fsPath;
      return path.relative(projectRoot, fsPath);
    },
  };

  const commands = {
    registerCommand(commandId, handler) {
      commandRegistry.set(commandId, handler);
      return {
        dispose: () => {
          commandRegistry.delete(commandId);
        },
      };
    },
    async executeCommand(commandId, ...args) {
      const handler = commandRegistry.get(commandId);
      if (!handler) {
        throw new Error(`Command not found: ${commandId}`);
      }
      return handler(...args);
    },
    getCommands: () => Array.from(commandRegistry.keys()),
    hasCommand: (id) => commandRegistry.has(id),
  };

  const window = {
    showInformationMessage: async (msg, ...items) => {
      notifications.info.push(msg);
      return items[0] || undefined;
    },
    showWarningMessage: async (msg, ...items) => {
      notifications.warning.push(msg);
      return items[0] || undefined;
    },
    showErrorMessage: async (msg, ...items) => {
      notifications.error.push(msg);
      return items[0] || undefined;
    },
    showQuickPick: async (items, options) => {
      if (typeof quickPickHandler === 'function') {
        return quickPickHandler(items, options);
      }
      // Default: select the first item if available
      return Array.isArray(items) && items.length > 0 ? items[0] : undefined;
    },
    createWebviewPanel: (viewType, title, showOptions, options) => ({
      viewType,
      title,
      webview: {
        html: '',
        onDidReceiveMessage: new EventEmitter(),
        postMessage: async () => true,
      },
      dispose: () => {},
    }),
    createOutputChannel: (name) => ({
      name,
      append: () => {},
      appendLine: () => {},
      clear: () => {},
      show: () => {},
      hide: () => {},
      dispose: () => {},
    }),
  };

  const env = {
    openExternal: async (uri) => true,
    clipboard: {
      writeText: async (text) => {},
      readText: async () => '',
    },
  };

  const ConfigurationTarget = {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  };

  const ViewColumn = {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3,
  };

  function createExtensionContext() {
    const globalStateStore = new Map();
    const workspaceStateStore = new Map();

    const createMemento = (store) => ({
      get: (key, defaultValue) => (store.has(key) ? store.get(key) : defaultValue),
      update: async (key, val) => {
        if (val === undefined) store.delete(key);
        else store.set(key, val);
      },
      keys: () => Array.from(store.keys()),
    });

    return {
      subscriptions: [],
      extensionPath: projectRoot,
      extensionUri: Uri.file(projectRoot),
      globalState: createMemento(globalStateStore),
      workspaceState: createMemento(workspaceStateStore),
      asAbsolutePath: (rel) => path.join(projectRoot, rel),
      storagePath: path.join(projectRoot, '.mock-storage'),
      globalStoragePath: path.join(projectRoot, '.mock-global-storage'),
      logPath: path.join(projectRoot, '.mock-logs'),
      extensionMode: 1, // Test mode
      dispose() {
        for (const sub of this.subscriptions) {
          if (sub && typeof sub.dispose === 'function') {
            sub.dispose();
          }
        }
        this.subscriptions = [];
      },
    };
  }

  return {
    workspace,
    commands,
    window,
    env,
    Uri,
    ConfigurationTarget,
    ViewColumn,
    createExtensionContext,
    setQuickPickHandler: (fn) => {
      quickPickHandler = fn;
    },
    getNotifications: () => ({ ...notifications }),
    clearNotifications: () => {
      notifications.info = [];
      notifications.warning = [];
      notifications.error = [];
    },
    _configStore: configStore,
    _commandRegistry: commandRegistry,
  };
}

module.exports = {
  createMockVSCode,
};
