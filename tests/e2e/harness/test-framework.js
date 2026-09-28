/**
 * Test Framework Engine for TCT E2E Testing
 * Zero-dependency, native Node.js test runner supporting nested suites, async tests,
 * lifecycle hooks (beforeEach/afterEach), and rich assertions.
 */

const assert = require('assert');

class TestContext {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.failures = [];
  }

  createSuite(name, parent = null) {
    return {
      name,
      parent,
      beforeEachHooks: [],
      afterEachHooks: [],
      tests: [],
      subSuites: [],
    };
  }
}

const context = new TestContext();

function describe(name, fn) {
  const previousSuite = context.currentSuite;
  const suite = context.createSuite(name, previousSuite);

  if (previousSuite) {
    previousSuite.subSuites.push(suite);
  } else {
    context.suites.push(suite);
  }

  context.currentSuite = suite;
  try {
    fn();
  } finally {
    context.currentSuite = previousSuite;
  }
}

function it(name, fn) {
  if (!context.currentSuite) {
    throw new Error(`Test "${name}" must be defined inside a describe block`);
  }
  context.currentSuite.tests.push({ name, fn });
}

function beforeEach(fn) {
  if (!context.currentSuite) {
    throw new Error('beforeEach must be defined inside a describe block');
  }
  context.currentSuite.beforeEachHooks.push(fn);
}

function afterEach(fn) {
  if (!context.currentSuite) {
    throw new Error('afterEach must be defined inside a describe block');
  }
  context.currentSuite.afterEachHooks.push(fn);
}

function expect(actual) {
  const matchers = (isNot = false) => ({
    toBe(expected) {
      const pass = Object.is(actual, expected);
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected ${isNot ? 'NOT ' : ''}${JSON.stringify(expected)}, but received ${JSON.stringify(actual)}`
        );
      }
    },
    toEqual(expected) {
      try {
        assert.deepStrictEqual(actual, expected);
        if (isNot) {
          throw new Error(`Expected values NOT to deeply equal: ${JSON.stringify(expected)}`);
        }
      } catch (err) {
        if (!isNot) {
          throw err;
        }
      }
    },
    toBeTruthy() {
      const pass = !!actual;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT ' : ''}to be truthy`);
      }
    },
    toBeFalsy() {
      const pass = !actual;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT ' : ''}to be falsy`);
      }
    },
    toBeNull() {
      const pass = actual === null;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT ' : ''}to be null`);
      }
    },
    toBeUndefined() {
      const pass = actual === undefined;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT ' : ''}to be undefined`);
      }
    },
    toBeDefined() {
      const pass = actual !== undefined;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected value ${isNot ? 'NOT ' : ''}to be defined`);
      }
    },
    toBeGreaterThan(expected) {
      const pass = actual > expected;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT ' : ''}to be greater than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      const pass = actual >= expected;
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected ${actual} ${isNot ? 'NOT ' : ''}to be greater than or equal to ${expected}`
        );
      }
    },
    toBeLessThan(expected) {
      const pass = actual < expected;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT ' : ''}to be less than ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      const pass = actual <= expected;
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected ${actual} ${isNot ? 'NOT ' : ''}to be less than or equal to ${expected}`
        );
      }
    },
    toContain(expected) {
      let pass = false;
      if (typeof actual === 'string' || Array.isArray(actual)) {
        pass = actual.includes(expected);
      } else if (actual instanceof Set || actual instanceof Map) {
        pass = actual.has(expected);
      } else if (actual && typeof actual === 'object') {
        pass = expected in actual;
      }
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected ${JSON.stringify(actual)} ${isNot ? 'NOT ' : ''}to contain ${JSON.stringify(expected)}`
        );
      }
    },
    toHaveLength(expected) {
      const length = actual ? actual.length : undefined;
      const pass = length === expected;
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected length ${isNot ? 'NOT ' : ''}to be ${expected}, but got ${length}`
        );
      }
    },
    toMatch(regex) {
      const pass = regex.test(String(actual));
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected "${actual}" ${isNot ? 'NOT ' : ''}to match pattern ${regex.toString()}`
        );
      }
    },
    toThrow(expectedPattern) {
      if (typeof actual !== 'function') {
        throw new Error('toThrow requires a function input');
      }
      let threw = false;
      let errorThrown = null;
      try {
        actual();
      } catch (err) {
        threw = true;
        errorThrown = err;
      }
      if (!threw) {
        if (!isNot) {
          throw new Error('Expected function to throw an error, but it returned without throwing');
        }
        return;
      }
      if (isNot) {
        throw new Error(`Expected function NOT to throw, but it threw: ${errorThrown?.message}`);
      }
      if (expectedPattern) {
        const msg = errorThrown ? errorThrown.message || String(errorThrown) : '';
        if (expectedPattern instanceof RegExp) {
          if (!expectedPattern.test(msg)) {
            throw new Error(
              `Expected error message "${msg}" to match pattern ${expectedPattern.toString()}`
            );
          }
        } else if (typeof expectedPattern === 'string') {
          if (!msg.includes(expectedPattern)) {
            throw new Error(`Expected error message "${msg}" to include "${expectedPattern}"`);
          }
        }
      }
    },
  });

  const base = matchers(false);
  base.not = matchers(true);

  base.rejects = {
    async toThrow(expectedPattern) {
      let threw = false;
      let errorThrown = null;
      try {
        await actual;
      } catch (err) {
        threw = true;
        errorThrown = err;
      }
      if (!threw) {
        throw new Error('Expected promise to reject, but it resolved successfully');
      }
      if (expectedPattern) {
        const msg = errorThrown ? errorThrown.message || String(errorThrown) : '';
        if (expectedPattern instanceof RegExp) {
          if (!expectedPattern.test(msg)) {
            throw new Error(
              `Expected rejection message "${msg}" to match pattern ${expectedPattern.toString()}`
            );
          }
        } else if (typeof expectedPattern === 'string') {
          if (!msg.includes(expectedPattern)) {
            throw new Error(
              `Expected rejection message "${msg}" to include "${expectedPattern}"`
            );
          }
        }
      }
    },
  };

  return base;
}

function getAncestryHooks(suite, type) {
  const hooks = [];
  let curr = suite;
  while (curr) {
    if (curr[type]) {
      hooks.unshift(...curr[type]);
    }
    curr = curr.parent;
  }
  return hooks;
}

async function runSuite(suite, suitePrefix = '') {
  const currentPrefix = suitePrefix ? `${suitePrefix} > ${suite.name}` : suite.name;
  const results = {
    suite: currentPrefix,
    tests: [],
    passed: 0,
    failed: 0,
  };

  const beforeEachHooks = getAncestryHooks(suite, 'beforeEachHooks');
  const afterEachHooks = getAncestryHooks(suite, 'afterEachHooks');

  for (const test of suite.tests) {
    const testFullName = `${currentPrefix} > ${test.name}`;
    const startTime = Date.now();
    let error = null;

    try {
      for (const hook of beforeEachHooks) {
        await hook();
      }
      await test.fn();
    } catch (err) {
      error = err;
    } finally {
      for (const hook of afterEachHooks) {
        try {
          await hook();
        } catch (hookErr) {
          if (!error) error = hookErr;
        }
      }
    }

    const duration = Date.now() - startTime;
    if (error) {
      results.failed++;
      context.failedTests++;
      context.failures.push({ name: testFullName, error, duration });
      results.tests.push({ name: test.name, status: 'fail', error, duration });
    } else {
      results.passed++;
      context.passedTests++;
      results.tests.push({ name: test.name, status: 'pass', duration });
    }
    context.totalTests++;
  }

  for (const subSuite of suite.subSuites) {
    const subResults = await runSuite(subSuite, currentPrefix);
    results.tests.push(...subResults.tests);
    results.passed += subResults.passed;
    results.failed += subResults.failed;
  }

  return results;
}

async function runAll() {
  const allResults = [];
  context.totalTests = 0;
  context.passedTests = 0;
  context.failedTests = 0;
  context.failures = [];

  for (const suite of context.suites) {
    const suiteResult = await runSuite(suite);
    allResults.push(suiteResult);
  }

  return {
    total: context.totalTests,
    passed: context.passedTests,
    failed: context.failedTests,
    failures: context.failures,
    suites: allResults,
  };
}

function clearSuites() {
  context.suites = [];
  context.currentSuite = null;
  context.totalTests = 0;
  context.passedTests = 0;
  context.failedTests = 0;
  context.failures = [];
}

module.exports = {
  describe,
  it,
  beforeEach,
  afterEach,
  expect,
  runAll,
  clearSuites,
};
