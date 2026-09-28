/**
 * Tier 2: Boundary & Corner Cases - LRU Cache & Resource Stress
 * Minimum requirement: >= 5 boundary test cases
 */

const path = require('path');
const { describe, it, expect, beforeEach } = require('../harness/test-framework');
const { createMockVSCode } = require('../harness/vscode-mock');
const { ThemeEngine } = require('../harness/theme-engine');

describe('Tier 2: Boundary 6 - LRU Cache & Resource Stress', () => {
  let vscode;
  let context;
  let engine;

  beforeEach(() => {
    vscode = createMockVSCode(path.resolve(__dirname, '../../..'));
    context = vscode.createExtensionContext();
    // Configure engine with small cache limit (3 items) and short TTL (50ms) for testing
    engine = new ThemeEngine(context, vscode, { maxCacheSize: 3, cacheTtlMs: 50 });
  });

  it('B6.1 should evict least recently used theme when cache capacity is exceeded', async () => {
    // Load theme 1
    await engine.getTheme('ayu.json');
    expect(engine.cache.has('ayu.json')).toBe(true);

    // Load theme 2
    await engine.getTheme('material.json');
    expect(engine.cache.has('material.json')).toBe(true);

    // Load theme 3 (Cache is full with 3 items)
    await engine.getTheme('monokai.json');
    expect(engine.cache.size).toBe(3);

    // Load theme 4 -> ayu.json should be evicted (least recently used)
    await engine.getTheme('gruvbox.json');
    expect(engine.cache.size).toBe(3);
    expect(engine.cache.has('ayu.json')).toBe(false);
    expect(engine.cache.has('gruvbox.json')).toBe(true);
    expect(engine.cacheStats.evictions).toBeGreaterThanOrEqual(1);
  });

  it('B6.2 should promote accessed items to most recently used in LRU order', async () => {
    await engine.getTheme('ayu.json');
    await engine.getTheme('material.json');
    await engine.getTheme('monokai.json');

    // Access ayu.json again -> moves to MRU
    await engine.getTheme('ayu.json');

    // Load a 4th theme -> material.json should be evicted, NOT ayu.json
    await engine.getTheme('gruvbox.json');
    expect(engine.cache.has('ayu.json')).toBe(true);
    expect(engine.cache.has('material.json')).toBe(false);
  });

  it('B6.3 should evict and re-load themes whose cache TTL has expired', async () => {
    // Engine TTL is 50ms
    await engine.getTheme('ayu.json');
    expect(engine.cacheStats.hits).toBe(0);

    // Immediate access -> cache hit
    await engine.getTheme('ayu.json');
    expect(engine.cacheStats.hits).toBe(1);

    // Wait 60ms for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Access after TTL expiration -> cache miss, eviction, re-load
    await engine.getTheme('ayu.json');
    expect(engine.cacheStats.hits).toBe(1); // Hits didn't increment
    expect(engine.cacheStats.evictions).toBeGreaterThanOrEqual(1);
  });

  it('B6.4 should coalesce concurrent parallel loads of the same uncached theme', async () => {
    engine.clearCache();

    // Trigger 10 parallel loads for 'dracula-theme.json'
    const promises = Array.from({ length: 10 }, () => engine.getTheme('dracula-theme.json'));
    const results = await Promise.all(promises);

    expect(results.length).toBe(10);
    for (const res of results) {
      expect(res.label).toBe('TCT Dracula');
    }

    // Since in-flight promise was coalesced, misses should be exactly 1
    expect(engine.cacheStats.misses).toBe(1);
  });

  it('B6.5 should completely clear cache and reset statistics when clearCache() is called', async () => {
    await engine.getTheme('ayu.json');
    await engine.getTheme('material.json');
    expect(engine.cache.size).toBe(2);

    engine.clearCache();
    expect(engine.cache.size).toBe(0);
    expect(engine.lruOrder.length).toBe(0);
    expect(engine.cacheStats.hits).toBe(0);
    expect(engine.cacheStats.misses).toBe(0);
  });

  it('B6.6 should record and retrieve load metrics for cached and uncached loads', async () => {
    engine.clearCache();
    await engine.getTheme('one.json');
    const firstMetrics = engine.getLoadMetrics('one.json');
    expect(firstMetrics.length).toBe(1);
    expect(firstMetrics[0].cacheHit).toBe(false);
    expect(firstMetrics[0].size).toBeGreaterThan(0);

    // Second access (cache hit)
    await engine.getTheme('one.json');
    const secondMetrics = engine.getLoadMetrics('one.json');
    expect(secondMetrics.length).toBe(2);
    expect(secondMetrics[1].cacheHit).toBe(true);
  });
});
