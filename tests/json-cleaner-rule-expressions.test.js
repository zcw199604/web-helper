import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildJsonCleanPropertyExpression,
  mergeJsonCleanExpressions,
  mergeJsonCleanExpressionsText,
  normalizeJsonCleanPathForExtraction,
  parseJsonCleanExpressionsText,
  upsertJsonCleanExtractedProperty,
  upsertJsonCleanExtractedPath,
} from '../utils/json-cleaner-rule-expressions.ts';

test('parseJsonCleanExpressionsText: 去空白并保留顺序', () => {
  const result = parseJsonCleanExpressionsText(' $.a \n\n$.b\n  $.a  ');
  assert.deepEqual(result, ['$.a', '$.b']);
});

test('mergeJsonCleanExpressions: 合并去重且保留原始顺序', () => {
  const merged = mergeJsonCleanExpressions(['$.a', '$.b'], ['$.b', '  ', '$.c', '$.a']);
  assert.deepEqual(merged, ['$.a', '$.b', '$.c']);
});

test('mergeJsonCleanExpressionsText: 文本合并结果稳定', () => {
  const mergedText = mergeJsonCleanExpressionsText('$.a\n$.b', ['$.b', '$.c']);
  assert.equal(mergedText, '$.a\n$.b\n$.c');
});

test('normalizeJsonCleanPathForExtraction: 数组索引路径泛化为[*]', () => {
  assert.equal(normalizeJsonCleanPathForExtraction('$.items[0].id'), '$.items[*].id');
  assert.equal(normalizeJsonCleanPathForExtraction('$.items[12].children[3].name'), '$.items[*].children[*].name');
});

test('normalizeJsonCleanPathForExtraction: 复杂路径仅泛化纯数字索引', () => {
  assert.equal(
    normalizeJsonCleanPathForExtraction('$.list[0]["fixed"].nodes[2][?(@.id==1)]'),
    '$.list[*]["fixed"].nodes[*][?(@.id==1)]',
  );
});

test('upsertJsonCleanExtractedPath: 默认模式二次点击切换为精确索引', () => {
  const firstClick = upsertJsonCleanExtractedPath([], '$.items[0].id');
  assert.deepEqual(firstClick, ['$.items[*].id']);

  const secondClick = upsertJsonCleanExtractedPath(firstClick, '$.items[0].id');
  assert.deepEqual(secondClick, ['$.items[0].id']);

  const thirdClick = upsertJsonCleanExtractedPath(secondClick, '$.items[0].id');
  assert.deepEqual(thirdClick, ['$.items[*].id']);
});

test('upsertJsonCleanExtractedPath: precise 模式直接写入精确索引', () => {
  const result = upsertJsonCleanExtractedPath(['$.items[*].id'], '$.items[2].id', 'precise');
  assert.deepEqual(result, ['$.items[2].id']);
});

test('upsertJsonCleanExtractedPath: 无数组索引路径保持不变', () => {
  const result = upsertJsonCleanExtractedPath([], '$.user.profile.name');
  assert.deepEqual(result, ['$.user.profile.name']);
});

test('buildJsonCleanPropertyExpression: simple key 使用 $..key', () => {
  assert.equal(buildJsonCleanPropertyExpression('password'), '$..password');
});

test('buildJsonCleanPropertyExpression: 特殊 key 使用 bracket 形式', () => {
  assert.equal(buildJsonCleanPropertyExpression('user-name'), '$..["user-name"]');
  assert.equal(buildJsonCleanPropertyExpression('中文字段'), '$..["中文字段"]');
});

test('upsertJsonCleanExtractedProperty: 可追加属性规则并去重', () => {
  const first = upsertJsonCleanExtractedProperty([], 'password');
  assert.deepEqual(first, ['$..password']);

  const second = upsertJsonCleanExtractedProperty(first, 'password');
  assert.deepEqual(second, ['$..password']);

  const third = upsertJsonCleanExtractedProperty(second, 'user-name');
  assert.deepEqual(third, ['$..password', '$..["user-name"]']);
});
