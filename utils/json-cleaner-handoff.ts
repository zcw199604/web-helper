const JSON_CLEANER_HANDOFF_KEY = 'web-helper:json-cleaner:handoff';

const memoryStorage = new Map<string, string>();

export type JsonCleanerHandoffPayload = {
  source: 'json-formatter';
  jsonText: string;
  autoRun: boolean;
  createdAt: string;
};

type HandoffOptions = {
  autoRun?: boolean;
  source?: 'json-formatter';
};

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

function normalizeJsonText(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('没有可传递到 JSON 清理工具的内容');
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    throw new Error(`仅支持传递有效 JSON：${(error as Error).message}`);
  }
}

export function setJsonCleanerPrefill(
  rawJsonText: string,
  options: HandoffOptions = {},
): { ok: true } | { ok: false; error: string } {
  try {
    const payload: JsonCleanerHandoffPayload = {
      source: options.source ?? 'json-formatter',
      jsonText: normalizeJsonText(rawJsonText),
      autoRun: options.autoRun ?? true,
      createdAt: new Date().toISOString(),
    };

    writeStorageItem(JSON_CLEANER_HANDOFF_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    if (isQuotaExceeded(error)) {
      return { ok: false, error: '本地存储空间已满，请清理后重试' };
    }

    return { ok: false, error: (error as Error).message };
  }
}

export function peekJsonCleanerPrefill(): JsonCleanerHandoffPayload | null {
  const raw = readStorageItem(JSON_CLEANER_HANDOFF_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as JsonCleanerHandoffPayload;

    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.jsonText !== 'string' || !parsed.jsonText.trim()) return null;

    return {
      source: parsed.source === 'json-formatter' ? 'json-formatter' : 'json-formatter',
      jsonText: parsed.jsonText,
      autoRun: Boolean(parsed.autoRun),
      createdAt:
        typeof parsed.createdAt === 'string' && parsed.createdAt.trim()
          ? parsed.createdAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function consumeJsonCleanerPrefill(): JsonCleanerHandoffPayload | null {
  const payload = peekJsonCleanerPrefill();
  removeStorageItem(JSON_CLEANER_HANDOFF_KEY);
  return payload;
}

export function clearJsonCleanerPrefill(): void {
  removeStorageItem(JSON_CLEANER_HANDOFF_KEY);
}
