/**
 * Tier 2: Boundary & Corner Cases - Theme JSON & Schema Boundaries
 * Minimum requirement: >= 5 boundary test cases
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { describe, it, expect, beforeEach, afterEach } = require('../harness/test-framework');
const { createMockVSCode } = require('../harness/vscode-mock');
const { ThemeEngine } = require('../harness/theme-engine');

describe('Tier 2: Boundary 3 - Theme JSON & Schema Boundaries', () => {
  let tempDir;
  let vscode;
  let context;
  let engine;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tct-json-test-'));
    fs.mkdirSync(path.join(tempDir, 'themes'), { recursive: true });

    // Copy minimal package.json
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'temp-ext', contributes: { themes: [] } })
    );

    vscode = createMockVSCode(tempDir);
    context = vscode.createExtensionContext();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('B3.1 should throw THEME_PARSE_ERROR when a theme JSON contains invalid syntax', async () => {
    const corruptPath = path.join(tempDir, 'themes', 'corrupt.json');
    fs.writeFileSync(corruptPath, '{ "name": "Corrupt", "colors": { unquoted: 123 }'); // Malformed JSON

    engine = new ThemeEngine(context, vscode);
    let error;
    try {
      await engine.getTheme('corrupt.json');
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.code).toBe('THEME_PARSE_ERROR');
    expect(error.message).toContain('Failed to parse theme JSON');
  });

  it('B3.2 should safely handle an empty JSON object theme without crashing', async () => {
    const emptyPath = path.join(tempDir, 'themes', 'empty.json');
    fs.writeFileSync(emptyPath, '{}');

    engine = new ThemeEngine(context, vscode);
    const theme = await engine.getTheme('empty.json');
    expect(theme).toBeDefined();
    expect(typeof theme.colors).toBe('object');
    expect(Array.isArray(theme.tokenColors)).toBe(true);
  });

  it('B3.3 should handle themes with missing colors map by providing empty colors object', async () => {
    const noColorsPath = path.join(tempDir, 'themes', 'noColors.json');
    fs.writeFileSync(
      noColorsPath,
      JSON.stringify({ name: 'No Colors', type: 'dark', tokenColors: [] })
    );

    engine = new ThemeEngine(context, vscode);
    const theme = await engine.getTheme('noColors.json');
    expect(theme.colors).toBeDefined();
    expect(Object.keys(theme.colors).length).toBe(0);
  });

  it('B3.4 should safely handle a theme referencing a non-existent include file', async () => {
    const missingIncludePath = path.join(tempDir, 'themes', 'brokenInclude.json');
    fs.writeFileSync(
      missingIncludePath,
      JSON.stringify({
        name: 'Broken Include',
        include: './does-not-exist.json',
        colors: { 'editor.background': '#112233' },
      })
    );

    engine = new ThemeEngine(context, vscode);
    const theme = await engine.getTheme('brokenInclude.json');
    expect(theme).toBeDefined();
    expect(theme.colors['editor.background']).toBe('#112233');
  });

  it('B3.5 should safely preserve unknown extension-specific custom properties', async () => {
    const customFieldsPath = path.join(tempDir, 'themes', 'customFields.json');
    fs.writeFileSync(
      customFieldsPath,
      JSON.stringify({
        name: 'Custom Theme',
        colors: { 'editor.background': '#000000' },
        customTCTMetadata: { author: 'TCT Team', version: '4.0.0' },
      })
    );

    engine = new ThemeEngine(context, vscode);
    const theme = await engine.getTheme('customFields.json');
    expect(theme.raw.customTCTMetadata).toBeDefined();
    expect(theme.raw.customTCTMetadata.author).toBe('TCT Team');
  });

  it('B3.6 should gracefully handle large theme payloads with hundreds of token rules', async () => {
    const largeTokens = [];
    for (let i = 0; i < 500; i++) {
      largeTokens.push({
        name: `Rule ${i}`,
        scope: `source.lang.token.${i}`,
        settings: { foreground: '#ffffff' },
      });
    }

    const largePath = path.join(tempDir, 'themes', 'largeTheme.json');
    fs.writeFileSync(
      largePath,
      JSON.stringify({ name: 'Large Theme', colors: {}, tokenColors: largeTokens })
    );

    engine = new ThemeEngine(context, vscode);
    const theme = await engine.getTheme('largeTheme.json');
    expect(theme.tokenColors.length).toBe(500);
  });
});
