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

  const saveResult = setJsonCleanerPrefill('{"a":1,"b":2}', { autoRun: true });
  assert.equal(saveResult.ok, true);

  const peeked = peekJsonCleanerPrefill();
  assert.ok(peeked);
  assert.equal(peeked.source, 'json-formatter');
  assert.equal(peeked.autoRun, true);
  assert.match(peeked.jsonText, /"a": 1/);

  const consumed = consumeJsonCleanerPrefill();
  assert.ok(consumed);
  assert.equal(consumed.autoRun, true);
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
