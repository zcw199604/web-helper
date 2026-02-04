import test from 'node:test';
import assert from 'node:assert/strict';

import { TOOL_MODULES, resolveToolModulesByIds } from '../utils/tool-modules.ts';

test('resolveToolModulesByIds: undefined -> all tools', () => {
  const result = resolveToolModulesByIds(undefined, TOOL_MODULES);
  assert.deepEqual(result.map((t) => t.id), TOOL_MODULES.map((t) => t.id));
});

test('resolveToolModulesByIds: preserves order and filters', () => {
  const result = resolveToolModulesByIds(['jwt', 'json'], TOOL_MODULES);
  assert.deepEqual(result.map((t) => t.id), ['jwt', 'json']);
});

test('resolveToolModulesByIds: ignores unknown ids', () => {
  const result = resolveToolModulesByIds(['json', 'unknown', 'jwt'], TOOL_MODULES);
  assert.deepEqual(result.map((t) => t.id), ['json', 'jwt']);
});

test('TOOL_MODULES: includes websocket tool', () => {
  assert.ok(TOOL_MODULES.some((t) => t.id === 'websocket'));
});
