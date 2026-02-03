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

type WorkerRequest = ComputeRequest | SuggestRequest;

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

type WorkerResponse = ComputeResponse | SuggestResponse;

let cachedSourceId: number | null = null;
let cachedJson: unknown | undefined = undefined;
let cachedParseError: string | null = null;

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

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  let res: WorkerResponse | null = null;
  if (msg.type === 'compute') res = handleCompute(msg);
  else if (msg.type === 'suggest') res = handleSuggest(msg);

  if (res) self.postMessage(res);
};
