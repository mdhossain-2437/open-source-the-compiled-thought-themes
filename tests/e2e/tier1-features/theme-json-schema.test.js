/**
 * Tier 1: Feature Coverage - Theme JSON Syntax & Schema Integrity
 * Minimum requirement: >= 5 isolated happy-path tests
 */

const fs = require('fs');
const path = require('path');
const { describe, it, expect, beforeEach } = require('../harness/test-framework');
const { createMockVSCode } = require('../harness/vscode-mock');
const { ThemeEngine } = require('../harness/theme-engine');

describe('Tier 1: Feature 3 - Theme JSON Syntax & Schema Integrity', () => {
  const projectRoot = path.resolve(__dirname, '../../..');
  const themesDir = path.join(projectRoot, 'themes');
  let themeFiles = [];
  let vscode;
  let context;
  let engine;

  beforeEach(() => {
    themeFiles = fs.readdirSync(themesDir).filter((f) => f.endsWith('.json'));
    vscode = createMockVSCode(projectRoot);
    context = vscode.createExtensionContext();
    engine = new ThemeEngine(context, vscode);
  });

  it('3.1 should successfully parse all 48 theme JSON files with zero syntax errors', () => {
    expect(themeFiles.length).toBe(48);
    for (const file of themeFiles) {
      const content = fs.readFileSync(path.join(themesDir, file), 'utf8');
      let parsed;
      expect(() => {
        parsed = JSON.parse(content);
      }).not.toThrow();
      expect(typeof parsed).toBe('object');
      expect(parsed).not.toBeNull();
    }
  });

  it('3.2 should ensure every theme defines a valid name property matching package.json label', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    for (const file of themeFiles) {
      const content = JSON.parse(fs.readFileSync(path.join(themesDir, file), 'utf8'));
      expect(typeof content.name).toBe('string');
      expect(content.name.trim().length).toBeGreaterThan(0);
      const manifestEntry = pkg.contributes.themes.find(
        (t) => path.basename(t.path) === file
      );
      if (manifestEntry) {
        expect(content.name).toBe(manifestEntry.label);
      }
    }
  });

  it('3.3 should ensure theme type conforms to valid VS Code theme categories', () => {
    for (const file of themeFiles) {
      const content = JSON.parse(fs.readFileSync(path.join(themesDir, file), 'utf8'));
      if (content.type) {
        expect(['dark', 'light', 'hc'].includes(content.type)).toBe(true);
      }
    }
  });

  it('3.4 should validate that all defined UI color tokens use valid color notations', () => {
    const hexOrRgbaRegex = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s,.]+\)|transparent)$/;
    let checkedColorCount = 0;

    for (const file of themeFiles) {
      const content = JSON.parse(fs.readFileSync(path.join(themesDir, file), 'utf8'));
      if (content.colors) {
        for (const [key, colorValue] of Object.entries(content.colors)) {
          if (typeof colorValue === 'string') {
            expect(hexOrRgbaRegex.test(colorValue.trim())).toBe(true);
            checkedColorCount++;
          }
        }
      }
    }
    expect(checkedColorCount).toBeGreaterThan(1000);
  });

  it('3.5 should validate tokenColors structure and TextMate rules', () => {
    let themesWithTokens = 0;
    for (const file of themeFiles) {
      const content = JSON.parse(fs.readFileSync(path.join(themesDir, file), 'utf8'));
      if (Array.isArray(content.tokenColors)) {
        themesWithTokens++;
        for (const rule of content.tokenColors) {
          expect(typeof rule).toBe('object');
          expect(typeof rule.settings).toBe('object');
        }
      }
    }
    expect(themesWithTokens).toBeGreaterThanOrEqual(40);
  });

  it('3.6 should resolve key workbench UI tokens for base themes after inheritance', async () => {
    const keyWorkbenchTokens = [
      'editor.background',
      'activityBar.background',
      'statusBar.background',
      'sideBar.background',
    ];

    // Check base themes like TCT Default, Blue Velvet, Official, or Ayu
    const theme = await engine.getTheme('default-color-theme.json');
    for (const token of keyWorkbenchTokens) {
      expect(theme.colors[token]).toBeDefined();
      expect(typeof theme.colors[token]).toBe('string');
    }
  });
});
