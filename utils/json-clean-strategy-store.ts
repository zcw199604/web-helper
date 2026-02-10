import {
  JSON_CLEAN_STRATEGY_VERSION,
  type JsonCleanStrategy,
  type JsonCleanStrategyDraft,
  validateStrategy,
} from './json-cleaner';

const STORAGE_KEY = 'web-helper:json-clean-strategies';

type StoredPayload = {
  version: number;
  strategies: JsonCleanStrategy[];
};

const memoryStorage = new Map<string, string>();

function readStorageItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }

  return memoryStorage.get(key) ?? null;
}

function writeStorageItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
    return;
  }

  memoryStorage.set(key, value);
}

function removeStorageItem(key: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
    return;
  }

  memoryStorage.delete(key);
}

function isQuotaExceeded(error: unknown): boolean {
  if (typeof DOMException === 'undefined') return false;

  if (!(error instanceof DOMException)) return false;

  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22
  );
}

function generateStrategyId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `strategy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStoredStrategy(value: unknown): JsonCleanStrategy | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Partial<JsonCleanStrategy>;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;

  const expressions = Array.isArray(raw.expressions)
    ? raw.expressions.filter((item): item is string => typeof item === 'string')
    : [];

  const validation = validateStrategy({ expressions });

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : generateStrategyId(),
    name,
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    expressions: validation.normalizedExpressions,
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
        ? raw.updatedAt
        : new Date().toISOString(),
    version:
      typeof raw.version === 'number' && Number.isFinite(raw.version)
        ? raw.version
        : JSON_CLEAN_STRATEGY_VERSION,
  };
}

function parsePayload(raw: string | null): StoredPayload {
  if (!raw) {
    return {
      version: JSON_CLEAN_STRATEGY_VERSION,
      strategies: [],
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      const migrated = parsed
        .map((item) => normalizeStoredStrategy(item))
        .filter((item): item is JsonCleanStrategy => Boolean(item));

      return {
        version: JSON_CLEAN_STRATEGY_VERSION,
        strategies: migrated,
      };
    }

    if (parsed && typeof parsed === 'object') {
      const objectPayload = parsed as Partial<StoredPayload> & { strategies?: unknown };
      const arrayValue = Array.isArray(objectPayload.strategies) ? objectPayload.strategies : [];

      const normalized = arrayValue
        .map((item) => normalizeStoredStrategy(item))
        .filter((item): item is JsonCleanStrategy => Boolean(item));

      return {
        version: JSON_CLEAN_STRATEGY_VERSION,
        strategies: normalized,
      };
    }
  } catch {
    // 解析失败按空数据处理，避免损坏数据阻塞页面。
  }

  return {
    version: JSON_CLEAN_STRATEGY_VERSION,
    strategies: [],
  };
}

function writePayload(payload: StoredPayload): { ok: true } | { ok: false; error: string } {
  try {
    writeStorageItem(STORAGE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    if (isQuotaExceeded(error)) {
      return { ok: false, error: '本地存储空间已满，请清理历史策略后重试' };
    }

    return { ok: false, error: `策略保存失败：${(error as Error).message}` };
  }
}

function readStrategies(): JsonCleanStrategy[] {
  const payload = parsePayload(readStorageItem(STORAGE_KEY));
  return payload.strategies;
}

export function listJsonCleanStrategies(): JsonCleanStrategy[] {
  return readStrategies().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getJsonCleanStrategyById(id: string): JsonCleanStrategy | null {
  if (!id.trim()) return null;
  return listJsonCleanStrategies().find((item) => item.id === id) ?? null;
}

export function upsertJsonCleanStrategy(
  draft: JsonCleanStrategyDraft,
): { ok: true; strategy: JsonCleanStrategy } | { ok: false; error: string } {
  const name = draft.name.trim();
  if (!name) {
    return { ok: false, error: '策略名称不能为空' };
  }

  const validation = validateStrategy({ expressions: draft.expressions });
  if (validation.normalizedExpressions.length === 0) {
    return { ok: false, error: '请至少提供一条有效规则' };
  }

  if (validation.issues.length > 0) {
    return { ok: false, error: validation.issues[0].error };
  }

  const current = readStrategies();
  const targetId = draft.id?.trim() || generateStrategyId();

  const duplicated = current.find(
    (item) => item.id !== targetId && item.name.toLowerCase() === name.toLowerCase(),
  );

  if (duplicated) {
    return { ok: false, error: '策略名称已存在，请使用其他名称' };
  }

  const nextStrategy: JsonCleanStrategy = {
    id: targetId,
    name,
    description: draft.description?.trim() ?? '',
    expressions: validation.normalizedExpressions,
    updatedAt: new Date().toISOString(),
    version: JSON_CLEAN_STRATEGY_VERSION,
  };

  const filtered = current.filter((item) => item.id !== targetId);
  const nextStrategies = [nextStrategy, ...filtered].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );

  const writeResult = writePayload({
    version: JSON_CLEAN_STRATEGY_VERSION,
    strategies: nextStrategies,
  });

  if (!writeResult.ok) {
    return writeResult;
  }

  return {
    ok: true,
    strategy: nextStrategy,
  };
}

export function deleteJsonCleanStrategy(id: string): { ok: true; removed: boolean } | { ok: false; error: string } {
  const strategyId = id.trim();
  if (!strategyId) {
    return { ok: false, error: '请选择要删除的策略' };
  }

  const current = readStrategies();
  const next = current.filter((item) => item.id !== strategyId);

  if (next.length === current.length) {
    return { ok: true, removed: false };
  }

  if (next.length === 0) {
    removeStorageItem(STORAGE_KEY);
    return { ok: true, removed: true };
  }

  const writeResult = writePayload({
    version: JSON_CLEAN_STRATEGY_VERSION,
    strategies: next,
  });

  if (!writeResult.ok) {
    return writeResult;
  }

  return { ok: true, removed: true };
}
