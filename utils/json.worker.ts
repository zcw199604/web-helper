/// <reference lib="webworker" />

import { queryJsonPath } from './json';

type OutputMode = 'format' | 'minify';

type ComputeRequest = {
  type: 'compute';
  id: number;
  sourceId: number;
  // Only include on input change to avoid copying large strings repeatedly.
  text?: string;
  indent: number;
  outputMode: OutputMode;
  showQuery: boolean;
  queryForResult: string;
  wantTree: boolean;
};

type SuggestRequest = {
  type: 'suggest';
  id: number;
  sourceId: number;
  queryInput: string;
  limit: number;
};

type SearchRequest = {
  type: 'search';
  id: number;
  sourceId: number;
  // Only include on input change to avoid copying large strings repeatedly.
  text?: string;
  query: string;
  limit: number;
  caseSensitive: boolean;
  mode: 'key' | 'value' | 'both';
};

type WorkerRequest = ComputeRequest | SuggestRequest | SearchRequest;

type ComputeResponse = {
  type: 'computeResult';
  id: number;
  parseError: string | null;
  queryError: string | null;
  outputText: string;
  // Only present when wantTree=true (caller controls to avoid heavy clone).
  displayData?: unknown;
};

type SuggestResponse = {
  type: 'suggestResult';
  id: number;
  suggestions: string[];
};

type SearchMatch = {
  path: string;
  // Short preview for UI; best-effort, may be empty for non-primitive matches.
  preview: string;
  matchIn: 'key' | 'value';
};

type SearchResponse = {
  type: 'searchResult';
  id: number;
  matches: SearchMatch[];
  truncated: boolean;
  error: string | null;
};

type WorkerResponse = ComputeResponse | SuggestResponse | SearchResponse;

let cachedSourceId: number | null = null;
let cachedJson: unknown | undefined = undefined;
let cachedParseError: string | null = null;

const SIMPLE_KEY_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

function stripTrailingCommasOutsideStrings(text: string): string {
  let out = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      out += ch;
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }

    if (ch === ',') {
      // Skip whitespace and see if the next token is a closing bracket/brace.
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      const next = j < text.length ? text[j] : undefined;
      if (next === '}' || next === ']') {
        continue; // drop the trailing comma
      }
    }

    out += ch;
  }

  return out;
}

function repairInvalidEscapesInStrings(text: string): string {
  let out = '';
  let inString = false;

  for (let i = 0; i < text.length; ) {
    const ch = text[i];

    if (!inString) {
      out += ch;
      if (ch === '"') inString = true;
      i += 1;
      continue;
    }

    // In a JSON string
    if (ch === '"') {
      out += ch;
      inString = false;
      i += 1;
      continue;
    }

    if (ch === '\\') {
      const next = i + 1 < text.length ? text[i + 1] : undefined;

      if (next === undefined) {
        // Dangling backslash at end of input: escape it.
        out += '\\\\';
        i += 1;
        continue;
      }

      if (next === '"' || next === '\\' || next === '/' || next === 'b' || next === 'f' || next === 'n' || next === 'r' || next === 't') {
        out += '\\' + next;
        i += 2;
        continue;
      }

      if (next === 'u') {
        const hex = text.slice(i + 2, i + 6);
        if (hex.length === 4 && /^[0-9a-fA-F]{4}$/.test(hex)) {
          out += '\\u' + hex;
          i += 6;
          continue;
        }
        // Invalid \u escape: keep the backslash as a literal.
        out += '\\\\';
        i += 1;
        continue;
      }

      // Invalid escape sequence (e.g. Windows paths: \U, \P, ...): keep the backslash.
      out += '\\\\';
      i += 1;
      continue;
    }

    // Repair raw newlines inside strings (not valid JSON) to reduce surprise.
    if (ch === '\n') {
      out += '\\n';
      i += 1;
      continue;
    }
    if (ch === '\r') {
      out += '\\r';
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

function repairJsonInput(text: string): string {
  // The order matters: first remove trailing commas, then fix invalid string escapes.
  return repairInvalidEscapesInStrings(stripTrailingCommasOutsideStrings(text));
}

function parseAndCache(sourceId: number, text: string): void {
  cachedSourceId = sourceId;

  const trimmed = text.trim();
  if (!trimmed) {
    cachedJson = undefined;
    cachedParseError = null;
    return;
  }

  try {
    cachedJson = JSON.parse(text) as unknown;
    cachedParseError = null;
  } catch (e) {
    // Try to be forgiving for common "JSON-ish" inputs:
    // - Windows paths with unescaped backslashes ("C:\Users\...")
    // - trailing commas
    // - raw newlines inside quoted strings
    try {
      const repaired = repairJsonInput(text);
      cachedJson = JSON.parse(repaired) as unknown;
      cachedParseError = null;
    } catch {
      cachedJson = undefined;
      cachedParseError = (e as Error).message;
    }
  }
}

function getCached(sourceId: number): { json: unknown | undefined; parseError: string | null } {
  if (cachedSourceId !== sourceId) {
    return { json: undefined, parseError: '需要重新解析（缓存缺失）' };
  }
  return { json: cachedJson, parseError: cachedParseError };
}

function shouldRunQuery(showQuery: boolean, query: string): boolean {
  if (!showQuery) return false;
  const trimmed = query.trim();
  return !!trimmed && trimmed !== '$' && trimmed !== '$.';
}

function getJsonPathSuggestionsLimited(json: any, currentPath: string, limit: number): string[] {
  if (!json || !currentPath || limit <= 0) return [];

  // Determine parent path and current prefix by the last '.' segment.
  let parentPath = '$';
  let prefix = '';

  const lastDotIndex = currentPath.lastIndexOf('.');

  if (lastDotIndex === -1) {
    if (currentPath.startsWith('$')) {
      parentPath = '$';
      prefix = currentPath.substring(1);
    } else {
      return [];
    }
  } else {
    parentPath = currentPath.substring(0, lastDotIndex) || '$';
    prefix = currentPath.substring(lastDotIndex + 1);
  }

  // Query parent nodes; invalid/incomplete paths should return empty suggestions.
  let nodes: any[] = [];
  try {
    nodes = queryJsonPath(json, parentPath);
  } catch {
    return [];
  }

  if (!nodes || nodes.length === 0) return [];

  const prefixLower = prefix.toLowerCase();
  const out = new Set<string>();

  for (const node of nodes) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) continue;
    for (const key in node) {
      if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
      if (prefix && !key.toLowerCase().startsWith(prefixLower)) continue;
      out.add(key);
      if (out.size >= limit) break;
    }
    if (out.size >= limit) break;
  }

  return Array.from(out).sort();
}

function handleCompute(req: ComputeRequest): ComputeResponse {
  if (req.text !== undefined) {
    parseAndCache(req.sourceId, req.text);
  }

  const { json, parseError } = getCached(req.sourceId);

  // Empty input: no output, no errors.
  if (req.text !== undefined && !req.text.trim()) {
    return {
      type: 'computeResult',
      id: req.id,
      parseError: null,
      queryError: null,
      outputText: '',
    };
  }

  if (parseError || json === undefined) {
    return {
      type: 'computeResult',
      id: req.id,
      parseError: parseError ?? '无效的 JSON',
      queryError: null,
      outputText: '',
    };
  }

  const runQuery = shouldRunQuery(req.showQuery, req.queryForResult);

  if (runQuery) {
    try {
      const result = queryJsonPath(json as any, req.queryForResult.trim());
      const outputText = JSON.stringify(result, null, req.indent);
      return {
        type: 'computeResult',
        id: req.id,
        parseError: null,
        queryError: null,
        outputText,
        displayData: req.wantTree ? result : undefined,
      };
    } catch {
      return {
        type: 'computeResult',
        id: req.id,
        parseError: null,
        queryError: '无效的 JSONPath 表达式',
        outputText: '[]',
        displayData: req.wantTree ? [] : undefined,
      };
    }
  }

  // Normal mode: format/minify source json.
  try {
    const outputText =
      req.outputMode === 'minify'
        ? JSON.stringify(json)
        : JSON.stringify(json, null, req.indent);

    return {
      type: 'computeResult',
      id: req.id,
      parseError: null,
      queryError: null,
      outputText,
      displayData: req.wantTree ? json : undefined,
    };
  } catch (e) {
    return {
      type: 'computeResult',
      id: req.id,
      parseError: (e as Error).message,
      queryError: null,
      outputText: '',
    };
  }
}

function handleSuggest(req: SuggestRequest): SuggestResponse {
  const { json, parseError } = getCached(req.sourceId);
  if (parseError || json === undefined || typeof json !== 'object' || json === null) {
    return { type: 'suggestResult', id: req.id, suggestions: [] };
  }

  const suggestions = getJsonPathSuggestionsLimited(json as any, req.queryInput, req.limit);
  return { type: 'suggestResult', id: req.id, suggestions };
}

function toSearchableString(value: unknown): string | null {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  return null;
}

function makePreview(value: unknown): string {
  const s = toSearchableString(value);
  if (s === null) {
    if (Array.isArray(value)) return `[Array(${value.length})]`;
    if (value && typeof value === 'object') return '{Object}';
    return '';
  }

  // Keep previews compact for large strings.
  const trimmed = s.length > 160 ? s.slice(0, 160) + '…' : s;
  if (typeof value === 'string') return `"${trimmed}"`;
  return trimmed;
}

function handleSearch(req: SearchRequest): SearchResponse {
  if (req.text !== undefined) {
    parseAndCache(req.sourceId, req.text);
  }

  const { json, parseError } = getCached(req.sourceId);
  if (parseError || json === undefined) {
    return {
      type: 'searchResult',
      id: req.id,
      matches: [],
      truncated: false,
      error: parseError ?? '无效的 JSON',
    };
  }

  const qRaw = req.query ?? '';
  const qTrimmed = qRaw.trim();
  if (!qTrimmed) {
    return { type: 'searchResult', id: req.id, matches: [], truncated: false, error: null };
  }

  const q = req.caseSensitive ? qTrimmed : qTrimmed.toLowerCase();
  const limit = Math.max(1, req.limit | 0);

  const wantKey = req.mode === 'key' || req.mode === 'both';
  const wantValue = req.mode === 'value' || req.mode === 'both';

  const matches: SearchMatch[] = [];
  let truncated = false;

  // Iterative DFS to avoid call stack overflow for deep JSON.
  const stack: Array<{ value: any; path: string }> = [{ value: json, path: '$' }];

  const pushObjectChildren = (obj: Record<string, unknown>, basePath: string) => {
    // Preserve the iteration order (same as the tree view) by matching in-forward
    // and pushing children onto the stack in reverse.
    const keys: string[] = [];
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      keys.push(key);
    }
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const isSimpleKey = SIMPLE_KEY_RE.test(key);
      const childPath = isSimpleKey ? `${basePath}.${key}` : `${basePath}[${JSON.stringify(key)}]`;
      const childValue = obj[key];
      if (wantKey) {
        const hay = req.caseSensitive ? key : key.toLowerCase();
        if (hay.includes(q)) {
          matches.push({ path: childPath, preview: makePreview(childValue), matchIn: 'key' });
          if (matches.length >= limit) return false;
        }
      }

      if (wantValue) {
        const s = toSearchableString(childValue);
        if (s !== null) {
          const hay = req.caseSensitive ? s : s.toLowerCase();
          if (hay.includes(q)) {
            matches.push({ path: childPath, preview: makePreview(childValue), matchIn: 'value' });
            if (matches.length >= limit) return false;
          }
        }
      }
    }

    for (let i = keys.length - 1; i >= 0; i -= 1) {
      const key = keys[i];
      const isSimpleKey = SIMPLE_KEY_RE.test(key);
      const childPath = isSimpleKey ? `${basePath}.${key}` : `${basePath}[${JSON.stringify(key)}]`;
      const childValue = obj[key];
      if (childValue !== null && typeof childValue === 'object') {
        stack.push({ value: childValue, path: childPath });
      }
    }

    return true;
  };

  const pushArrayChildren = (arr: any[], basePath: string) => {
    for (let i = 0; i < arr.length; i += 1) {
      const childPath = `${basePath}[${i}]`;
      if (wantValue) {
        const s = toSearchableString(arr[i]);
        if (s !== null) {
          const hay = req.caseSensitive ? s : s.toLowerCase();
          if (hay.includes(q)) {
            matches.push({ path: childPath, preview: makePreview(arr[i]), matchIn: 'value' });
            if (matches.length >= limit) return false;
          }
        }
      }
    }

    for (let i = arr.length - 1; i >= 0; i -= 1) {
      const childValue = arr[i];
      if (childValue !== null && typeof childValue === 'object') {
        const childPath = `${basePath}[${i}]`;
        stack.push({ value: childValue, path: childPath });
      }
    }

    return true;
  };

  while (stack.length > 0) {
    if (matches.length >= limit) {
      truncated = true;
      break;
    }

    const { value, path } = stack.pop()!;
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      const ok = pushArrayChildren(value, path);
      if (!ok) {
        truncated = true;
        break;
      }
      continue;
    }

    if (typeof value === 'object') {
      const ok = pushObjectChildren(value as Record<string, unknown>, path);
      if (!ok) {
        truncated = true;
        break;
      }
    }
  }

  if (matches.length >= limit) truncated = true;

  return {
    type: 'searchResult',
    id: req.id,
    matches: matches.slice(0, limit),
    truncated,
    error: null,
  };
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  let res: WorkerResponse | null = null;
  if (msg.type === 'compute') res = handleCompute(msg);
  else if (msg.type === 'suggest') res = handleSuggest(msg);
  else if (msg.type === 'search') res = handleSearch(msg);

  if (res) self.postMessage(res);
};
