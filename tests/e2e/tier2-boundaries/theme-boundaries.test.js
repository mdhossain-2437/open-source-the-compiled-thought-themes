/**
 * Tier 2: Boundary & Corner Cases - Theme Resolution & Switching
 * Minimum requirement: >= 5 boundary test cases
 */

const path = require('path');
const { describe, it, expect, beforeEach } = require('../harness/test-framework');
const { createMockVSCode } = require('../harness/vscode-mock');
const { ThemeEngine } = require('../harness/theme-engine');

describe('Tier 2: Boundary 1 - Theme Resolution & Switching Boundaries', () => {
  let vscode;
  let context;
  let engine;

  beforeEach(() => {
    vscode = createMockVSCode(path.resolve(__dirname, '../../..'));
    context = vscode.createExtensionContext();
    engine = new ThemeEngine(context, vscode);
  });

  it('B1.1 should throw THEME_NOT_FOUND error when requested theme ID does not exist', async () => {
    let error;
    try {
      await engine.getTheme('non-existent-theme-xyz-123');
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.code).toBe('THEME_NOT_FOUND');
    expect(error.message).toContain('non-existent-theme-xyz-123');
  });

  it('B1.2 should throw THEME_NOT_FOUND when passed an empty string theme identifier', async () => {
    let error;
    try {
      await engine.getTheme('');
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.code).toBe('THEME_NOT_FOUND');
  });

  it('B1.3 should prevent path traversal attempts and throw THEME_NOT_FOUND', async () => {
    const maliciousPaths = [
      '../../package.json',
      '..\\..\\package.json',
      '../../../etc/passwd',
      '../src/extension.ts',
    ];

    for (const malPath of maliciousPaths) {
      let error;
      try {
        await engine.getTheme(malPath);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.code).toBe('THEME_NOT_FOUND');
    }
  });

  it('B1.4 should handle case-insensitive theme resolution seamlessly', async () => {
    const themeLower = await engine.getTheme('tct ayu');
    const themeUpper = await engine.getTheme('TCT AYU');
    const themeMixed = await engine.getTheme('TcT AyU');

    expect(themeLower.label).toBe('TCT Ayu');
    expect(themeUpper.label).toBe('TCT Ayu');
    expect(themeMixed.label).toBe('TCT Ayu');
  });

  it('B1.5 should handle theme identifiers with excess surrounding whitespace', async () => {
    const theme = await engine.getTheme('   TCT Dracula   ');
    expect(theme).toBeDefined();
    expect(theme.label).toBe('TCT Dracula');
  });

  it('B1.6 should throw THEME_NOT_FOUND when passed null or undefined inputs', async () => {
    let nullError;
    try {
      await engine.getTheme(null);
    } catch (err) {
      nullError = err;
    }
    expect(nullError).toBeDefined();
    expect(nullError.code).toBe('THEME_NOT_FOUND');

    let undefinedError;
    try {
      await engine.getTheme(undefined);
    } catch (err) {
      undefinedError = err;
    }
    expect(undefinedError).toBeDefined();
    expect(undefinedError.code).toBe('THEME_NOT_FOUND');
  });

  it('B1.7 should resolve themes by relative path, package.json path, and absolute path', async () => {
    // Relative path with ./
    const themeRel1 = await engine.getTheme('./themes/ayu.json');
    expect(themeRel1.label).toBe('TCT Ayu');

    // Relative path without ./
    const themeRel2 = await engine.getTheme('themes/ayu.json');
    expect(themeRel2.label).toBe('TCT Ayu');

    // Backslash relative path
    const themeRelBackslash = await engine.getTheme('themes\\ayu.json');
    expect(themeRelBackslash.label).toBe('TCT Ayu');

    // Full absolute path
    const absPath = path.resolve(context.extensionPath, 'themes/ayu.json');
    const themeAbs = await engine.getTheme(absPath);
    expect(themeAbs.label).toBe('TCT Ayu');
  });

  it('B1.8 should resolve themes by internal name and prefix-stripped search', async () => {
    const themeInternal = await engine.getTheme('TCT Material');
    expect(themeInternal.label).toBe('TCT Material');

    const themeStripped = await engine.getTheme('Material');
    expect(themeStripped.label).toBe('TCT Material');
  });
});
