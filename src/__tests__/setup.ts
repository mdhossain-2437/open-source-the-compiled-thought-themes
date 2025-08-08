/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';
import type { Mock } from 'jest-mock';

// Import vscode types
import type { Uri, OutputChannel, ExtensionMode } from 'vscode';

// Define expected vscode mock structure
interface VSCodeMock {
  EventEmitter: Mock;
  ExtensionMode: {
    Test: ExtensionMode;
    Development: ExtensionMode;
    Production: ExtensionMode;
  };
  Uri: {
    file: Mock<(path: string) => Uri>;
  };
  window: {
    createOutputChannel: Mock<(name: string) => OutputChannel>;
  };
}

// Setup jest globally
(globalThis as unknown as { jest: typeof jest }).jest = jest;

// Mock vscode since we can't load it in test environment
jest.mock('vscode', () => {
  const mockVscode = jest.requireActual('./mocks/vscode.ts') as { default: VSCodeMock };
  return mockVscode.default;
});
