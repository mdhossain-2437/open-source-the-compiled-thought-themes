import { jest } from '@jest/globals';

const mockEventEmitter = {
  event: jest.fn(),
  fire: jest.fn(),
  dispose: jest.fn(),
};

const mockOutputChannel = (name) => ({
  name,
  append: jest.fn(),
  appendLine: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
  hide: jest.fn(),
  replace: jest.fn(),
  show: jest.fn(),
});

const mockUri = (path) => ({
  fsPath: path,
  path,
  scheme: 'file',
  authority: '',
  query: '',
  fragment: '',
  with: function (change) {
    return { ...this, ...change };
  },
  toJSON: function () {
    return {
      scheme: this.scheme,
      authority: this.authority,
      path: this.path,
      query: this.query,
      fragment: this.fragment,
    };
  },
});

const vscode = {
  EventEmitter: jest.fn(() => mockEventEmitter),
  ExtensionMode: {
    Test: 1,
    Development: 2,
    Production: 3,
  },
  Uri: {
    file: jest.fn(mockUri),
  },
  window: {
    createOutputChannel: jest.fn(mockOutputChannel),
  },
};

export default vscode;
