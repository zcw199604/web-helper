import { JSONPath } from 'jsonpath-plus';

export const JSON_CLEAN_STRATEGY_VERSION = 1;

export type JsonCleanStrategy = {
  id: string;
  name: string;
  description?: string;
  expressions: string[];
  updatedAt: string;
  version: number;
};

export type JsonCleanStrategyDraft = {
  id?: string;
  name: string;
  description?: string;
  expressions: string[];
};

export type JsonCleanValidationIssue = {
  index: number;
  expression: string;
  error: string;
};

export type JsonCleanValidationResult = {
  valid: boolean;
  normalizedExpressions: string[];
  issues: JsonCleanValidationIssue[];
};

export type JsonCleanRuleResult = {
  expression: string;
  matched: number;
  removed: number;
  skippedDuplicates: number;
  error?: string;
};

export type JsonCleanSummary = {
  totalRules: number;
  effectiveRules: number;
  matchedRules: number;
  removedNodes: number;
  failedRules: number;
  skippedDuplicates: number;
};

export type JsonCleanResult = {
  cleaned: unknown;
  summary: JsonCleanSummary;
  details: JsonCleanRuleResult[];
};

type JsonPathAllMatch = {
  path?: string;
  parent?: unknown;
  parentProperty?: string | number | null;
  pointer?: string;
};

function cloneJsonValue<T>(value: T): T {
  // 优先使用 structuredClone，避免 JSON 序列化丢失边界信息。
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function parseJsonInput(input: string | unknown): unknown {
  if (typeof input !== 'string') {
    return cloneJsonValue(input);
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('请输入要清理的 JSON 内容');
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch (error) {
    throw new Error(`JSON 解析失败：${(error as Error).message}`);
  }
}

function normalizeExpressions(expressions: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawExpression of expressions) {
    const expression = rawExpression.trim();
    if (!expression) continue;
    if (seen.has(expression)) continue;

    seen.add(expression);
    normalized.push(expression);
  }

  return normalized;
}

export function validateStrategy(strategy: Pick<JsonCleanStrategyDraft, 'expressions'>): JsonCleanValidationResult {
  if (!Array.isArray(strategy.expressions)) {
    return {
      valid: false,
      normalizedExpressions: [],
      issues: [
        {
          index: -1,
          expression: '',
          error: '策略规则必须是数组',
        },
      ],
    };
  }

  const normalizedExpressions = normalizeExpressions(strategy.expressions);
  const issues: JsonCleanValidationIssue[] = [];

  for (let index = 0; index < normalizedExpressions.length; index += 1) {
    const expression = normalizedExpressions[index];

    // 安全边界：禁止删除根节点，避免把结果整体清空。
    if (expression === '$') {
      issues.push({ index, expression, error: '不支持删除根节点（$）' });
      continue;
    }

    try {
      JSONPath({ path: expression, json: {}, wrap: true });
    } catch (error) {
      issues.push({ index, expression, error: `JSONPath 语法错误：${(error as Error).message}` });
    }
  }

  return {
    valid: issues.length === 0,
    normalizedExpressions,
    issues,
  };
}

function addIssueMessage(existing: string | undefined, next: string): string {
  if (!existing) return next;
  return `${existing}；${next}`;
}

function collectArrayOperations(
  bucket: Map<unknown[], Map<number, string>>,
  parent: unknown[],
  index: number,
  pointer: string,
): boolean {
  const existed = bucket.get(parent);
  if (existed) {
    if (existed.has(index)) return false;
    existed.set(index, pointer);
    return true;
  }

  bucket.set(parent, new Map([[index, pointer]]));
  return true;
}

export function applyJsonCleanStrategy(
  input: string | unknown,
  strategy: Pick<JsonCleanStrategyDraft, 'expressions'>,
): JsonCleanResult {
  const working = parseJsonInput(input);
  const validation = validateStrategy(strategy);

  const details: JsonCleanRuleResult[] = validation.issues.map((issue) => ({
    expression: issue.expression,
    matched: 0,
    removed: 0,
    skippedDuplicates: 0,
    error: issue.error,
  }));

  const blockedExpressions = new Set(validation.issues.map((issue) => issue.expression));
  const executableExpressions = validation.normalizedExpressions.filter((expression) => !blockedExpressions.has(expression));

  const deletedPointers = new Set<string>();

  for (const expression of executableExpressions) {
    const detail: JsonCleanRuleResult = {
      expression,
      matched: 0,
      removed: 0,
      skippedDuplicates: 0,
    };

    let matches: JsonPathAllMatch[] = [];
    try {
      const rawMatches = JSONPath({
        path: expression,
        json: working as string | number | boolean | object | any[] | null,
        resultType: 'all',
        wrap: true,
      }) as unknown;

      matches = Array.isArray(rawMatches) ? (rawMatches as JsonPathAllMatch[]) : [];
    } catch (error) {
      detail.error = `规则执行失败：${(error as Error).message}`;
      details.push(detail);
      continue;
    }

    const arrayOperations = new Map<unknown[], Map<number, string>>();
    const objectOperations: Array<{ parent: Record<string, unknown>; key: string; pointer: string }> = [];
    const expressionPointers = new Set<string>();

    for (const match of matches) {
      detail.matched += 1;

      const pointer = typeof match.pointer === 'string' ? match.pointer : String(match.path ?? '');
      if (!pointer || pointer === '') {
        detail.error = addIssueMessage(detail.error, '命中根节点，已跳过删除');
        continue;
      }

      if (deletedPointers.has(pointer) || expressionPointers.has(pointer)) {
        detail.skippedDuplicates += 1;
        continue;
      }

      const parent = match.parent;
      const parentProperty = match.parentProperty;
      if (parent === null || parent === undefined || parentProperty === null || parentProperty === undefined) {
        detail.error = addIssueMessage(detail.error, '命中节点缺少父级信息，已跳过');
        continue;
      }

      if (Array.isArray(parent)) {
        const index = Number(parentProperty);
        if (!Number.isInteger(index) || index < 0) {
          detail.error = addIssueMessage(detail.error, `数组索引无效：${String(parentProperty)}`);
          continue;
        }

        const accepted = collectArrayOperations(arrayOperations, parent, index, pointer);
        if (!accepted) {
          detail.skippedDuplicates += 1;
          continue;
        }

        expressionPointers.add(pointer);
        continue;
      }

      if (typeof parent === 'object') {
        const key = String(parentProperty);
        objectOperations.push({
          parent: parent as Record<string, unknown>,
          key,
          pointer,
        });
        expressionPointers.add(pointer);
        continue;
      }

      detail.error = addIssueMessage(detail.error, '父级节点类型不支持删除操作');
    }

    for (const [parent, indexMap] of arrayOperations.entries()) {
      const indices = Array.from(indexMap.keys()).sort((left, right) => right - left);

      // 关键边界：数组必须倒序删除，避免索引偏移导致误删。
      for (const index of indices) {
        if (index >= parent.length) {
          detail.error = addIssueMessage(detail.error, `数组索引越界：${index}`);
          continue;
        }

        parent.splice(index, 1);
        detail.removed += 1;

        const pointer = indexMap.get(index);
        if (pointer) deletedPointers.add(pointer);
      }
    }

    for (const operation of objectOperations) {
      if (!Object.prototype.hasOwnProperty.call(operation.parent, operation.key)) {
        detail.skippedDuplicates += 1;
        continue;
      }

      delete operation.parent[operation.key];
      detail.removed += 1;
      deletedPointers.add(operation.pointer);
    }

    details.push(detail);
  }

  const summary: JsonCleanSummary = {
    totalRules: normalizeExpressions(strategy.expressions).length,
    effectiveRules: executableExpressions.length,
    matchedRules: details.filter((detail) => detail.removed > 0).length,
    removedNodes: details.reduce((accumulator, detail) => accumulator + detail.removed, 0),
    failedRules: details.filter((detail) => Boolean(detail.error)).length,
    skippedDuplicates: details.reduce((accumulator, detail) => accumulator + detail.skippedDuplicates, 0),
  };

  return {
    cleaned: working,
    summary,
    details,
  };
}
