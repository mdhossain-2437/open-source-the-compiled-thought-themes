import { jest } from '@jest/globals';
import type { Uri, OutputChannel } from 'vscode';

const mockEventEmitter = {
  event: jest.fn(),
  fire: jest.fn(),
  dispose: jest.fn(),
};

const mockOutputChannel = (name: string): OutputChannel => ({
  name,
  append: jest.fn(),
  appendLine: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
  hide: jest.fn(),
  replace: jest.fn(),
  show: jest.fn(),
});

interface UriComponents {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
}

const mockUri = (path: string): Uri => ({
  fsPath: path,
  path,
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
  toJSON: function (): UriComponents {
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
