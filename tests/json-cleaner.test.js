import test from 'node:test';
import assert from 'node:assert/strict';

import { applyJsonCleanStrategy, validateStrategy } from '../utils/json-cleaner.ts';

test('applyJsonCleanStrategy: 能按策略删除嵌套字段', () => {
  const input = {
    user: {
      id: 1,
      name: 'alice',
      password: 'secret',
      profile: {
        phone: '13800000000',
        email: 'alice@example.com',
      },
    },
    items: [
      { id: 1, debug: true },
      { id: 2, debug: true },
      { id: 3, debug: false },
    ],
    meta: {
      trace: 'trace-id',
      requestId: 'req-001',
    },
  };

  const result = applyJsonCleanStrategy(input, {
    expressions: ['$.user.password', '$.user.profile.phone', '$.items[*].debug', '$.meta.trace'],
  });

  assert.equal(result.summary.removedNodes, 6);
  assert.equal(result.summary.matchedRules, 4);
  assert.equal(result.summary.failedRules, 0);

  assert.deepEqual(result.cleaned, {
    user: {
      id: 1,
      name: 'alice',
      profile: {
        email: 'alice@example.com',
      },
    },
    items: [{ id: 1 }, { id: 2 }, { id: 3 }],
    meta: {
      requestId: 'req-001',
    },
  });
});

test('validateStrategy: 去重并拦截根节点规则', () => {
  const result = validateStrategy({
    expressions: [' $.user.password ', '', '$.user.password', '$'],
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.normalizedExpressions, ['$.user.password', '$']);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0].error, /根节点/);
});

test('applyJsonCleanStrategy: 非法 JSON 输入抛出可读错误', () => {
  assert.throws(
    () =>
      applyJsonCleanStrategy('{"a":1,}', {
        expressions: ['$.a'],
      }),
    /JSON 解析失败/,
  );
});

test('applyJsonCleanStrategy: 数组索引删除按降序执行，避免索引偏移', () => {
  const result = applyJsonCleanStrategy(
    {
      items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
    },
    {
      expressions: ['$.items[0,2]'],
    },
  );

  assert.equal(result.summary.removedNodes, 2);
  assert.deepEqual(result.cleaned, {
    items: [{ id: 2 }, { id: 4 }],
  });
});

test('applyJsonCleanStrategy: 重复规则会被去重，仅执行一次删除', () => {
  const result = applyJsonCleanStrategy(
    {
      user: {
        token: 'secret',
      },
    },
    {
      expressions: ['$.user.token', '$.user.token', '   '],
    },
  );

  assert.equal(result.summary.totalRules, 1);
  assert.equal(result.summary.removedNodes, 1);
  assert.equal(result.summary.skippedDuplicates, 0);
  assert.deepEqual(result.cleaned, {
    user: {},
  });
});
