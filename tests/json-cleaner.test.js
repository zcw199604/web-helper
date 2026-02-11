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

test('applyJsonCleanStrategy: 属性规则 $..key 可删除所有同名字段', () => {
  const result = applyJsonCleanStrategy(
    {
      user: {
        password: 'secret-1',
        profile: {
          password: 'secret-2',
        },
      },
      items: [
        { id: 1, password: 'secret-3' },
        { id: 2, nested: { password: 'secret-4' } },
      ],
    },
    {
      expressions: ['$..password'],
    },
  );

  assert.equal(result.summary.removedNodes, 4);
  assert.deepEqual(result.cleaned, {
    user: {
      profile: {},
    },
    items: [{ id: 1 }, { id: 2, nested: {} }],
  });
});

test('applyJsonCleanStrategy: 属性规则 bracket 形式可删除特殊 key', () => {
  const result = applyJsonCleanStrategy(
    {
      profile: {
        'user-name': 'alice',
      },
      items: [
        {
          'user-name': 'bob',
        },
      ],
    },
    {
      expressions: ['$..["user-name"]'],
    },
  );

  assert.equal(result.summary.removedNodes, 2);
  assert.deepEqual(result.cleaned, {
    profile: {},
    items: [{}],
  });
});

test('applyJsonCleanStrategy: 单条属性路径规则可删除当前字段', () => {
  const result = applyJsonCleanStrategy(
    {
      user: {
        id: 1,
        token: 'secret',
      },
      meta: {
        token: 'keep-this',
      },
    },
    {
      expressions: ['$.user.token'],
    },
  );

  assert.equal(result.summary.removedNodes, 1);
  assert.deepEqual(result.cleaned, {
    user: {
      id: 1,
    },
    meta: {
      token: 'keep-this',
    },
  });
});
