import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRequestHeaderItems,
  filterRequestHeaders,
  isNoiseHeaderName,
} from '../utils/request-headers.ts';

test('isNoiseHeaderName: 命中常见浏览器噪音头', () => {
  assert.equal(isNoiseHeaderName('User-Agent'), true);
  assert.equal(isNoiseHeaderName('sec-fetch-site'), true);
  assert.equal(isNoiseHeaderName('sec-ch-ua'), true);
  assert.equal(isNoiseHeaderName('Authorization'), false);
});

test('isNoiseHeaderName: 空字符串或空白返回 false', () => {
  assert.equal(isNoiseHeaderName(''), false);
  assert.equal(isNoiseHeaderName('   '), false);
});

test('createRequestHeaderItems: 相同 header 名称生成稳定递增 id', () => {
  const items = createRequestHeaderItems([
    { name: 'X-Test', value: 'a' },
    { name: 'x-test', value: 'b' },
    { name: 'Authorization', value: 'Bearer token' },
  ]);

  assert.equal(items[0].id, 'x-test#1');
  assert.equal(items[1].id, 'x-test#2');
  assert.equal(items[2].id, 'authorization#1');
});

test('filterRequestHeaders: 自动过滤 + 手动勾选过滤可叠加', () => {
  const headers = [
    { name: 'User-Agent', value: 'Chrome' },
    { name: 'Authorization', value: 'Bearer token' },
    { name: 'X-Trace-Id', value: 'trace-1' },
    { name: 'sec-fetch-site', value: 'same-origin' },
  ];

  const items = createRequestHeaderItems(headers);
  const authorization = items.find((item) => item.normalizedName === 'authorization');

  assert.ok(authorization);

  const result = filterRequestHeaders(headers, {
    autoRemoveNoiseHeaders: true,
    manualRemovedHeaderIds: [authorization.id],
  });

  assert.deepEqual(result.headers, [{ name: 'X-Trace-Id', value: 'trace-1' }]);
  assert.deepEqual(result.autoRemovedIds, ['user-agent#1', 'sec-fetch-site#1']);
  assert.deepEqual(result.manualRemovedIds, ['authorization#1']);
});

test('filterRequestHeaders: 关闭自动过滤时仅应用手动勾选', () => {
  const headers = [
    { name: 'User-Agent', value: 'Chrome' },
    { name: 'Authorization', value: 'Bearer token' },
  ];

  const result = filterRequestHeaders(headers, {
    autoRemoveNoiseHeaders: false,
    manualRemovedHeaderIds: ['authorization#1'],
  });

  assert.deepEqual(result.headers, [{ name: 'User-Agent', value: 'Chrome' }]);
  assert.deepEqual(result.autoRemovedIds, []);
  assert.deepEqual(result.manualRemovedIds, ['authorization#1']);
});

test('filterRequestHeaders: 空 headers 与未知手动 id 不影响结果', () => {
  const empty = filterRequestHeaders([], {
    autoRemoveNoiseHeaders: true,
    manualRemovedHeaderIds: ['not-exist#1'],
  });

  assert.deepEqual(empty.headers, []);
  assert.deepEqual(empty.items, []);
  assert.deepEqual(empty.autoRemovedIds, []);
  assert.deepEqual(empty.manualRemovedIds, []);

  const normal = filterRequestHeaders(
    [{ name: 'Authorization', value: 'Bearer token' }],
    {
      autoRemoveNoiseHeaders: false,
      manualRemovedHeaderIds: ['unknown#9'],
    },
  );

  assert.deepEqual(normal.headers, [{ name: 'Authorization', value: 'Bearer token' }]);
  assert.deepEqual(normal.manualRemovedIds, []);
});
