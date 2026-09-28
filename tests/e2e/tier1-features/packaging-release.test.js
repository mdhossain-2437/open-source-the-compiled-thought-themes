/**
 * Tier 1: Feature Coverage - Extension Packaging, Manifest & Release Integrity
 * Minimum requirement: >= 5 isolated happy-path tests
 */

const fs = require('fs');
const path = require('path');
const { describe, it, expect } = require('../harness/test-framework');

describe('Tier 1: Feature 6 - Packaging, Manifest & Release Integrity', () => {
  const projectRoot = path.resolve(__dirname, '../../..');
  const pkgPath = path.join(projectRoot, 'package.json');
  let pkg;

  it('6.1 should validate that package.json contains valid JSON and core extension fields', () => {
    expect(fs.existsSync(pkgPath)).toBe(true);
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    expect(pkg.name).toBe('compiled-thought-themes');
    expect(pkg.publisher).toBe('DelowarHossain');
    expect(pkg.main).toBeDefined();
    expect(pkg.engines && pkg.engines.vscode).toBeDefined();
    expect(Array.isArray(pkg.activationEvents)).toBe(true);
  });

  it('6.2 should verify all themes declared in package.json exist as physical files on disk', () => {
    const contributesThemes = pkg.contributes?.themes || [];
    expect(contributesThemes.length).toBeGreaterThan(0);

    for (const theme of contributesThemes) {
      expect(typeof theme.label).toBe('string');
      expect(typeof theme.path).toBe('string');
      const resolvedPath = path.resolve(projectRoot, theme.path);
      expect(fs.existsSync(resolvedPath)).toBe(true);
    }
  });

  it('6.3 should verify all snippets declared in package.json exist on disk', () => {
    const contributesSnippets = pkg.contributes?.snippets || [];
    expect(contributesSnippets.length).toBeGreaterThan(0);

    for (const snippet of contributesSnippets) {
      expect(typeof snippet.language).toBe('string');
      expect(typeof snippet.path).toBe('string');
      const resolvedPath = path.resolve(projectRoot, snippet.path);
      expect(fs.existsSync(resolvedPath)).toBe(true);
    }
  });

  it('6.4 should verify all core commands are registered in package.json contributes.commands', () => {
    const commands = (pkg.contributes?.commands || []).map((c) => c.command);
    expect(commands).toContain('DelowarHossain.selectTheme');
    expect(commands).toContain('DelowarHossain.toggleItalic');
    expect(commands).toContain('DelowarHossain.previewTheme');
    expect(commands).toContain('DelowarHossain.enableAutoTheme');
  });

  it('6.5 should ensure .vscodeignore exists and contains package leak prevention rules', () => {
    const vscodeIgnorePath = path.join(projectRoot, '.vscodeignore');
    expect(fs.existsSync(vscodeIgnorePath)).toBe(true);

    const ignoreContent = fs.readFileSync(vscodeIgnorePath, 'utf8');
    // Ensure critical exclusion patterns are present
    expect(ignoreContent.length).toBeGreaterThan(0);
    expect(ignoreContent.includes('.agents') || ignoreContent.includes('.vscode')).toBe(true);
  });

  it('6.6 should verify core release documentation files exist and are populated', () => {
    const readmePath = path.join(projectRoot, 'README.md');
    const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
    const releaseNotesPath = path.join(projectRoot, 'RELEASE_NOTES.md');

    expect(fs.existsSync(readmePath)).toBe(true);
    expect(fs.existsSync(changelogPath)).toBe(true);
    expect(fs.existsSync(releaseNotesPath)).toBe(true);

    expect(fs.readFileSync(readmePath, 'utf8').length).toBeGreaterThan(100);
    expect(fs.readFileSync(changelogPath, 'utf8').length).toBeGreaterThan(100);
    expect(fs.readFileSync(releaseNotesPath, 'utf8').length).toBeGreaterThan(100);
  });
});
