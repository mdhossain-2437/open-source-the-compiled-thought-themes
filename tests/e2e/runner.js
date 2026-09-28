#!/usr/bin/env node

/**
 * Master E2E Test Runner for The Compiled Thought Themes (TCT)
 * Runs all 4 test tiers and produces clear pass/fail diagnostics.
 * Usage: node tests/e2e/runner.js
 * Exit Code: 0 on success, non-zero on failure.
 */

const path = require('path');
const { runAll, clearSuites } = require('./harness/test-framework');

// ANSI Color Helpers
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const testFiles = [
  // Tier 1: Feature Coverage (>=5 per feature across 6 features = 36 tests)
  { tier: 'Tier 1: Feature Coverage', file: './tier1-features/theme-switching.test.js' },
  { tier: 'Tier 1: Feature Coverage', file: './tier1-features/command-execution.test.js' },
  { tier: 'Tier 1: Feature Coverage', file: './tier1-features/theme-json-schema.test.js' },
  { tier: 'Tier 1: Feature Coverage', file: './tier1-features/font-optimization.test.js' },
  { tier: 'Tier 1: Feature Coverage', file: './tier1-features/italic-toggle.test.js' },
  { tier: 'Tier 1: Feature Coverage', file: './tier1-features/packaging-release.test.js' },

  // Tier 2: Boundary & Corner Cases (>=5 per feature across 6 features = 36 tests)
  { tier: 'Tier 2: Boundary & Corner Cases', file: './tier2-boundaries/theme-boundaries.test.js' },
  { tier: 'Tier 2: Boundary & Corner Cases', file: './tier2-boundaries/command-boundaries.test.js' },
  { tier: 'Tier 2: Boundary & Corner Cases', file: './tier2-boundaries/json-boundaries.test.js' },
  { tier: 'Tier 2: Boundary & Corner Cases', file: './tier2-boundaries/font-boundaries.test.js' },
  { tier: 'Tier 2: Boundary & Corner Cases', file: './tier2-boundaries/italic-boundaries.test.js' },
  { tier: 'Tier 2: Boundary & Corner Cases', file: './tier2-boundaries/cache-stress.test.js' },

  // Tier 3: Cross-Feature Combinations (pairwise interactions = 6 tests)
  { tier: 'Tier 3: Cross-Feature Combinations', file: './tier3-combinations/cross-feature.test.js' },

  // Tier 4: Real-World Application Scenarios (>=5 application scenarios = 5 tests)
  { tier: 'Tier 4: Real-World Scenarios', file: './tier4-scenarios/application-scenarios.test.js' },
];

async function main() {
  console.log(`\n${c.bold}${c.cyan}========================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}   The Compiled Thought Themes (TCT) v4.0.0 - Opaque-Box E2E Test Suite${c.reset}`);
  console.log(`${c.bold}${c.cyan}========================================================================${c.reset}\n`);

  clearSuites();

  // Load all test definitions
  for (const item of testFiles) {
    const fullPath = path.resolve(__dirname, item.file);
    require(fullPath);
  }

  const startTime = Date.now();
  const report = await runAll();
  const totalDuration = Date.now() - startTime;

  // Print results grouped by suite
  for (const suite of report.suites) {
    console.log(`\n${c.bold}${suite.suite}${c.reset}`);
    for (const test of suite.tests) {
      if (test.status === 'pass') {
        console.log(`  ${c.green}✓${c.reset} ${test.name} ${c.gray}(${test.duration}ms)${c.reset}`);
      } else {
        console.log(`  ${c.red}✗${c.reset} ${c.bold}${test.name}${c.reset} ${c.gray}(${test.duration}ms)${c.reset}`);
        console.log(`    ${c.red}Error: ${test.error.message}${c.reset}`);
        if (test.error.stack) {
          const stackLine = test.error.stack.split('\n')[1] || '';
          console.log(`    ${c.gray}${stackLine.trim()}${c.reset}`);
        }
      }
    }
  }

  // Tier breakdown calculation
  const tierCounts = {
    tier1: { total: 0, passed: 0, failed: 0 },
    tier2: { total: 0, passed: 0, failed: 0 },
    tier3: { total: 0, passed: 0, failed: 0 },
    tier4: { total: 0, passed: 0, failed: 0 },
  };

  for (const suite of report.suites) {
    let tierKey = 'tier1';
    if (suite.suite.includes('Tier 2:')) tierKey = 'tier2';
    else if (suite.suite.includes('Tier 3:')) tierKey = 'tier3';
    else if (suite.suite.includes('Tier 4:')) tierKey = 'tier4';

    tierCounts[tierKey].total += suite.tests.length;
    tierCounts[tierKey].passed += suite.passed;
    tierCounts[tierKey].failed += suite.failed;
  }

  // Summary Banner
  console.log(`\n${c.bold}------------------------------------------------------------------------${c.reset}`);
  console.log(`${c.bold}E2E TEST SUMMARY BY TIER${c.reset}`);
  console.log(`${c.bold}------------------------------------------------------------------------${c.reset}`);
  console.log(
    `  Tier 1 - Feature Coverage:            ${c.green}${tierCounts.tier1.passed}${c.reset} / ${tierCounts.tier1.total} passed ${tierCounts.tier1.failed > 0 ? c.red + '(' + tierCounts.tier1.failed + ' failed)' + c.reset : ''}`
  );
  console.log(
    `  Tier 2 - Boundary & Corner Cases:     ${c.green}${tierCounts.tier2.passed}${c.reset} / ${tierCounts.tier2.total} passed ${tierCounts.tier2.failed > 0 ? c.red + '(' + tierCounts.tier2.failed + ' failed)' + c.reset : ''}`
  );
  console.log(
    `  Tier 3 - Cross-Feature Combinations:  ${c.green}${tierCounts.tier3.passed}${c.reset} / ${tierCounts.tier3.total} passed ${tierCounts.tier3.failed > 0 ? c.red + '(' + tierCounts.tier3.failed + ' failed)' + c.reset : ''}`
  );
  console.log(
    `  Tier 4 - Real-World Scenarios:        ${c.green}${tierCounts.tier4.passed}${c.reset} / ${tierCounts.tier4.total} passed ${tierCounts.tier4.failed > 0 ? c.red + '(' + tierCounts.tier4.failed + ' failed)' + c.reset : ''}`
  );
  console.log(`${c.bold}------------------------------------------------------------------------${c.reset}`);
  console.log(
    `Total Tests: ${c.bold}${report.total}${c.reset} | Passed: ${c.green}${c.bold}${report.passed}${c.reset} | Failed: ${report.failed > 0 ? c.red + c.bold + report.failed + c.reset : c.green + '0' + c.reset} | Time: ${totalDuration}ms`
  );

  if (report.failed === 0) {
    console.log(`\n${c.bold}${c.green}✔ ALL E2E TEST TIERS PASSED WITH 100% SUCCESS${c.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${c.bold}${c.red}✖ E2E TEST SUITE FAILED WITH ${report.failed} FAILURES${c.reset}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
