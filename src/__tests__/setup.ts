/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';

// Augment NodeJS.Timer for compatibility across Node versions
declare global {
  namespace NodeJS {
    interface Timer {
      close(): this;
      [Symbol.dispose](): void;
      _onTimeout(...args: any[]): void;
    }
  }
}

// Setup jest globally
(globalThis as unknown as { jest: typeof jest }).jest = jest;

// Mock vscode since we can't load it in test environment
jest.mock('vscode', () => {
  const mockVscode = jest.requireActual('./mocks/vscode.ts') as { default: any };
  return {
    __esModule: true,
    ...mockVscode.default,
    default: mockVscode.default,
  };
});
