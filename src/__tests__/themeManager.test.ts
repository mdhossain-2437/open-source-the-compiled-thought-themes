import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ThemeManager } from '../themeManager';
import { THEME_REGISTRY } from '../themeRegistry';
import * as path from 'path';
import * as fs from 'fs';

jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: () => undefined,
      update: () => Promise.resolve(),
    }),
  },
  window: {
    showInformationMessage: () => Promise.resolve(),
  },
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

jest.mock('../themeRegistry', () => ({
  THEME_REGISTRY: {
    'tct-test-dark': {
      id: 'tct-test-dark',
      label: 'TCT Test Dark',
      path: './themes/TCTTestDark.json',
      uiTheme: 'vs-dark',
      description: 'A test theme.',
    },
    'tct-test-light': {
      id: 'tct-test-light',
      label: 'TCT Test Light',
      path: './themes/TCTTestLight.json',
      uiTheme: 'vs',
      description: 'A light test theme.',
    },
    'tct-recommended': {
      id: 'tct-recommended',
      label: 'TCT Recommended',
      path: './themes/TCTRecommended.json',
      uiTheme: 'vs-dark',
      description: 'A recommended theme.',
      recommendations: ['typescript'],
    },
  },
}));

const mockContext: any = {
  extensionPath: path.resolve(__dirname, '../../'),
  asAbsolutePath: (relativePath: string) => path.resolve(__dirname, '../../', relativePath),
};

describe('ThemeManager', () => {
  let themeManager: ThemeManager;

  beforeEach(() => {
    jest.clearAllMocks();
    (ThemeManager as any).instance = undefined;
    themeManager = ThemeManager.getInstance(mockContext);

    (fs.promises.readFile as jest.Mock).mockImplementation(((async (filePath: string) => {
      const themeId = path.basename(filePath, '.json');
      const theme = Object.values(THEME_REGISTRY).find(t => t.path.includes(themeId));
      if (theme) {
        return JSON.stringify({
          name: theme.label,
          type: theme.uiTheme === 'vs' ? 'light' : 'dark',
          colors: {},
          tokenColors: [],
        });
      }
      throw new Error(`File not found: ${filePath}`);
    }) as any));
  });

  it('should be a singleton', () => {
    const instance1 = ThemeManager.getInstance(mockContext);
    const instance2 = ThemeManager.getInstance(mockContext);
    expect(instance1).toBe(instance2);
  });

  it('should initialize from the theme registry', () => {
    const themeIds = themeManager.getAllThemeIds();
    expect(themeIds).toEqual(['tct-test-dark', 'tct-test-light', 'tct-recommended']);
  });

  it('should get theme metadata', () => {
    const metadata = themeManager.getThemeMetadata('tct-test-dark');
    expect(metadata).toBeDefined();
    expect(metadata?.label).toBe('TCT Test Dark');
  });

  it('should get a theme by ID', async () => {
    const theme = await themeManager.getTheme('tct-test-dark');
    expect(theme).toBeDefined();
    expect(theme.name).toBe('TCT Test Dark');
  });

  it('should recommend a theme based on languageId', async () => {
    const recommended = await themeManager.getRecommendedTheme('typescript');
    expect(recommended).toBeDefined();
    expect(recommended?.theme.name).toBe('TCT Recommended');
  });

  it('should fallback to time-based recommendation when no language match', async () => {
    const recommended = await themeManager.getRecommendedTheme('python');
    expect(recommended).toBeDefined();
    expect(recommended?.theme.name).toBeDefined();
  });
});
