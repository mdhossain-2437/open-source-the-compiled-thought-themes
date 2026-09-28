/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('vscode');
import * as vscode from 'vscode';

const {
  Disposable,
  EventEmitter,
  workspace,
  window,
  StatusBarAlignment,
  ConfigurationTarget,
} = vscode as any;

describe('Challenger 1 Stress Tests: Disposable Idempotency & Fault Isolation', () => {
  it('should guarantee dispose() callback runs at most once across 100 sequential calls', () => {
    let executionCount = 0;
    const disposable = new Disposable(() => {
      executionCount++;
      return 'disposed-val';
    });

    const firstReturn = disposable.dispose();
    expect(firstReturn).toBe('disposed-val');
    expect(executionCount).toBe(1);

    for (let i = 0; i < 99; i++) {
      const subsequentReturn = disposable.dispose();
      expect(subsequentReturn).toBeUndefined();
      expect(executionCount).toBe(1);
    }
  });

  it('should safely handle Disposable created with undefined callback', () => {
    const disposable = new Disposable();
    expect(() => disposable.dispose()).not.toThrow();
    expect(disposable.dispose()).toBeUndefined();
  });

  it('should handle re-entrant dispose() without recursion or multiple executions', () => {
    let executionCount = 0;
    let refDisposable: any;
    refDisposable = new Disposable(() => {
      executionCount++;
      // Re-entrant call while disposing
      refDisposable.dispose();
    });

    refDisposable.dispose();
    expect(executionCount).toBe(1);
  });

  it('should handle Disposable.from() with empty args, nulls, and malformed objects', () => {
    const emptyFrom = Disposable.from();
    expect(() => emptyFrom.dispose()).not.toThrow();

    const mixedFrom = Disposable.from(
      null as any,
      undefined as any,
      {} as any,
      { dispose: 'not-a-function' } as any
    );
    expect(() => mixedFrom.dispose()).not.toThrow();
  });

  it('should isolate errors in Disposable.from so throwing disposables do not block others', () => {
    const disposedLog: number[] = [];

    const composite = Disposable.from(
      new Disposable(() => {
        disposedLog.push(1);
      }),
      new Disposable(() => {
        disposedLog.push(2);
        throw new Error('Fatal disposal failure 2');
      }),
      new Disposable(() => {
        disposedLog.push(3);
      }),
      new Disposable(() => {
        disposedLog.push(4);
        throw new Error('Fatal disposal failure 4');
      }),
      new Disposable(() => {
        disposedLog.push(5);
      })
    );

    expect(() => composite.dispose()).not.toThrow();
    expect(disposedLog).toEqual([1, 2, 3, 4, 5]);

    // Ensure composite is idempotent
    composite.dispose();
    expect(disposedLog).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('Challenger 1 Stress Tests: EventEmitter Resilience', () => {
  it('should safely fire with zero listeners', () => {
    const emitter = new EventEmitter();
    expect(() => emitter.fire('hello')).not.toThrow();
  });

  it('should isolate listener exceptions so subsequent listeners still execute', () => {
    const emitter = new EventEmitter();
    const received: number[] = [];

    emitter.event((val: number) => {
      received.push(val * 1);
    });
    emitter.event(() => {
      throw new Error('Listener crash');
    });
    emitter.event((val: number) => {
      received.push(val * 10);
    });

    emitter.fire(5);
    expect(received).toEqual([5, 50]);
  });

  it('should support unregistering via the returned Disposable', () => {
    const emitter = new EventEmitter();
    const calls: string[] = [];
    const sub = emitter.event((data: string) => calls.push(data));

    emitter.fire('msg1');
    expect(calls).toEqual(['msg1']);

    sub.dispose();
    sub.dispose(); // Idempotent check
    emitter.fire('msg2');
    expect(calls).toEqual(['msg1']);
  });

  it('should clear all listeners on emitter.dispose()', () => {
    const emitter = new EventEmitter();
    let callCount = 0;
    emitter.event(() => callCount++);

    emitter.fire('a');
    expect(callCount).toBe(1);

    emitter.dispose();
    emitter.fire('b');
    expect(callCount).toBe(1);
  });
});

describe('Challenger 1 Stress Tests: window.showQuickPick Async & Edge Cases', () => {
  it('should handle standard synchronous array with and without canPickMany', async () => {
    const items = ['Theme A', 'Theme B', 'Theme C'];

    const single = await window.showQuickPick(items);
    expect(single).toBe('Theme A');

    const multi = await window.showQuickPick(items, { canPickMany: true });
    expect(multi).toEqual(['Theme A']);
  });

  it('should handle empty arrays appropriately', async () => {
    const singleEmpty = await window.showQuickPick([]);
    expect(singleEmpty).toBeUndefined();

    const multiEmpty = await window.showQuickPick([], { canPickMany: true });
    expect(multiEmpty).toEqual([]);
  });

  it('should handle Promises resolving to arrays with items', async () => {
    const promiseItems = Promise.resolve(['Theme X', 'Theme Y']);

    const single = await window.showQuickPick(promiseItems);
    expect(single).toBe('Theme X');

    const multi = await window.showQuickPick(Promise.resolve(['Theme X', 'Theme Y']), {
      canPickMany: true,
    });
    expect(multi).toEqual(['Theme X']);
  });

  it('should handle Promises resolving to empty arrays', async () => {
    const single = await window.showQuickPick(Promise.resolve([]));
    expect(single).toBeUndefined();

    const multi = await window.showQuickPick(Promise.resolve([]), { canPickMany: true });
    expect(multi).toEqual([]);
  });

  it('should handle custom Thenables (Promise-like objects)', async () => {
    const customThenable = {
      then(onFulfilled: (val: any) => any) {
        return Promise.resolve(onFulfilled(['Thenable 1', 'Thenable 2']));
      },
    };

    const single = await window.showQuickPick(customThenable as any);
    expect(single).toBe('Thenable 1');

    const multi = await window.showQuickPick(customThenable as any, { canPickMany: true });
    expect(multi).toEqual(['Thenable 1']);
  });

  it('should reject when the items Promise rejects', async () => {
    const failingPromise = Promise.reject(new Error('Network failure loading themes'));
    await expect(window.showQuickPick(failingPromise)).rejects.toThrow(
      'Network failure loading themes'
    );
  });

  it('should safely handle non-array resolved inputs without throwing', async () => {
    const nullResult = await window.showQuickPick(null as any);
    expect(nullResult).toBeUndefined();

    const nullMultiResult = await window.showQuickPick(null as any, { canPickMany: true });
    expect(nullMultiResult).toEqual([]);

    const promiseNullResult = await window.showQuickPick(Promise.resolve(null as any));
    expect(promiseNullResult).toBeUndefined();

    const numberResult = await window.showQuickPick(12345 as any);
    expect(numberResult).toBeUndefined();
  });
});

describe('Challenger 1 Stress Tests: Configuration Namespace Isolation & Events', () => {
  beforeEach(() => {
    (workspace as any)._resetConfig();
  });

  it('should prevent namespace cross-pollution between workbench, editor, and root', async () => {
    const workbenchConfig = workspace.getConfiguration('workbench');
    const editorConfig = workspace.getConfiguration('editor');
    const rootConfig = workspace.getConfiguration();

    await workbenchConfig.update('colorTheme', 'TCT Dark Plus', ConfigurationTarget.Global);

    // Workbench namespace has it
    expect(workbenchConfig.get('colorTheme')).toBe('TCT Dark Plus');
    expect(workbenchConfig.has('colorTheme')).toBe(true);

    // Root configuration can access via full qualified path
    expect(rootConfig.get('workbench.colorTheme')).toBe('TCT Dark Plus');
    expect(rootConfig.has('workbench.colorTheme')).toBe(true);

    // Root configuration MUST NOT leak unqualified 'colorTheme'
    expect(rootConfig.get('colorTheme')).toBeUndefined();
    expect(rootConfig.has('colorTheme')).toBe(false);

    // Editor namespace MUST NOT leak 'colorTheme'
    expect(editorConfig.get('colorTheme')).toBeUndefined();
    expect(editorConfig.has('colorTheme')).toBe(false);

    // Partial prefix collision: 'work' vs 'workbench'
    const workConfig = workspace.getConfiguration('work');
    expect(workConfig.get('bench.colorTheme')).toBeUndefined();
  });

  it('should correctly inspect configuration keys', async () => {
    const tctConfig = workspace.getConfiguration('tct');
    await tctConfig.update('autoSwitch', true, ConfigurationTarget.Global);

    const inspected = tctConfig.inspect('autoSwitch');
    expect(inspected).toBeDefined();
    expect(inspected?.key).toBe('tct.autoSwitch');
    expect(inspected?.globalValue).toBe(true);
    expect(inspected?.workspaceValue).toBeUndefined();
  });

  it('should verify affectsConfiguration matches exact and prefix boundaries accurately', async () => {
    const events: any[] = [];
    const sub = workspace.onDidChangeConfiguration((e: any) => {
      events.push(e);
    });

    const config = workspace.getConfiguration('tct.transitions');
    await config.update('smoothDuration', 250);

    expect(events.length).toBe(1);
    const event = events[0];

    // Full key match
    expect(event.affectsConfiguration('tct.transitions.smoothDuration')).toBe(true);

    // Parent prefix match
    expect(event.affectsConfiguration('tct.transitions')).toBe(true);
    expect(event.affectsConfiguration('tct')).toBe(true);

    // Sub-key prefix match
    expect(event.affectsConfiguration('tct.transitions.smoothDuration.extra')).toBe(true);

    // False positives / sibling namespaces
    expect(event.affectsConfiguration('tc')).toBe(false);
    expect(event.affectsConfiguration('tct.transition')).toBe(false);
    expect(event.affectsConfiguration('tct.other')).toBe(false);
    expect(event.affectsConfiguration('workbench')).toBe(false);
    expect(event.affectsConfiguration('')).toBe(false);

    sub.dispose();
  });

  it('should handle 50 concurrent configuration updates across distinct namespaces', async () => {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 50; i++) {
      const cfg = workspace.getConfiguration(`namespace_${i % 5}`);
      promises.push(cfg.update(`key_${i}`, `value_${i}`));
    }
    await Promise.all(promises);

    for (let i = 0; i < 50; i++) {
      const cfg = workspace.getConfiguration(`namespace_${i % 5}`);
      expect(cfg.get(`key_${i}`)).toBe(`value_${i}`);
    }
  });
});

describe('Challenger 1 Stress Tests: StatusBarItem Lifecycle', () => {
  it('should handle left and right alignments with priorities', () => {
    const itemLeft = window.createStatusBarItem(StatusBarAlignment.Left, 100);
    expect(itemLeft.alignment).toBe(1);
    expect(itemLeft.priority).toBe(100);

    const itemRight = window.createStatusBarItem(StatusBarAlignment.Right, 50);
    expect(itemRight.alignment).toBe(2);
    expect(itemRight.priority).toBe(50);

    const itemStringId = window.createStatusBarItem('tct.status', StatusBarAlignment.Left, 10);
    expect(itemStringId.id).toBe('tct.status');
    expect(itemStringId.alignment).toBe(1);
    expect(itemStringId.priority).toBe(10);
  });

  it('should allow showing, hiding, and disposing without side effects', () => {
    const item = window.createStatusBarItem();
    item.text = '$(check) Ready';
    item.tooltip = 'TCT Ready';
    item.show();
    item.hide();
    item.dispose();

    expect(item.show).toHaveBeenCalledTimes(1);
    expect(item.hide).toHaveBeenCalledTimes(1);
    expect(item.dispose).toHaveBeenCalledTimes(1);
  });
});
