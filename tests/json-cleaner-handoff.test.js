import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearJsonCleanerPrefill,
  consumeJsonCleanerPrefill,
  peekJsonCleanerPrefill,
  setJsonCleanerPrefill,
} from '../utils/json-cleaner-handoff.ts';

test('setJsonCleanerPrefill + consumeJsonCleanerPrefill: 可保存并消费 payload', () => {
  clearJsonCleanerPrefill();

  const saveResult = setJsonCleanerPrefill('{"a":1,"b":2}', {
    autoRun: true,
    ruleExpressions: ['$.meta.trace', ' $.user.token ', '$.meta.trace'],
  });
  assert.equal(saveResult.ok, true);

  const peeked = peekJsonCleanerPrefill();
  assert.ok(peeked);
  assert.equal(peeked.source, 'json-formatter');
  assert.equal(peeked.autoRun, true);
  assert.match(peeked.jsonText, /"a": 1/);
  assert.deepEqual(peeked.ruleExpressions, ['$.meta.trace', '$.user.token', '$.meta.trace']);

  const consumed = consumeJsonCleanerPrefill();
  assert.ok(consumed);
  assert.equal(consumed.autoRun, true);
  assert.deepEqual(consumed.ruleExpressions, ['$.meta.trace', '$.user.token', '$.meta.trace']);
  assert.equal(consumeJsonCleanerPrefill(), null);
});

test('setJsonCleanerPrefill: 非法 JSON 返回错误', () => {
  clearJsonCleanerPrefill();

  const result = setJsonCleanerPrefill('{"a":1,}', { autoRun: true });
  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.match(result.error, /有效 JSON/);
  }
});

test('consumeJsonCleanerPrefill: 空状态返回 null', () => {
  clearJsonCleanerPrefill();
  assert.equal(peekJsonCleanerPrefill(), null);
  assert.equal(consumeJsonCleanerPrefill(), null);
});

test('peekJsonCleanerPrefill: 兼容旧 payload（无规则字段）', () => {
  clearJsonCleanerPrefill();

  const localStorageBackup = globalThis.localStorage;
  const mockStorage = new Map();
  const mockLocalStorage = {
    getItem(key) {
      return mockStorage.has(key) ? mockStorage.get(key) : null;
    },
    setItem(key, value) {
      mockStorage.set(key, String(value));
    },
    removeItem(key) {
      mockStorage.delete(key);
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    configurable: true,
    writable: true,
  });

  const storageKey = 'web-helper:json-cleaner:handoff';
  globalThis.localStorage.setItem(
    storageKey,
    JSON.stringify({
      source: 'json-formatter',
      jsonText: '{\n  "a": 1\n}',
      autoRun: true,
      createdAt: '2026-02-11T00:00:00.000Z',
    }),
  );

  const payload = peekJsonCleanerPrefill();
  assert.ok(payload);
  assert.deepEqual(payload.ruleExpressions, []);

  if (localStorageBackup) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageBackup,
      configurable: true,
      writable: true,
    });
  } else {
    // @ts-expect-error: 测试场景下移除 mock localStorage
    delete globalThis.localStorage;
  }
});
