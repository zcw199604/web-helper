/**
 * fetch 解析工具函数
 *
 * 目标：解析浏览器 DevTools Network 的「Copy as fetch」文本，提取请求方法、URL、Headers 与 Body。
 * 说明：仅做文本解析，不执行任何命令或网络请求。
 */

import type { HttpMethod, NameValuePair, ParsedBody, ParsedCurlRequest } from './curl';

export type ParseFetchResult =
  | { ok: true; request: ParsedCurlRequest }
  | { ok: false; error: string; normalizedCommand?: string };

export function parseFetchCommand(command: string): ParseFetchResult {
  const originalCommand = command.trim();
  if (!originalCommand) {
    return { ok: false, error: '请输入 fetch 代码片段' };
  }

  const normalizedCommand = normalizeFetchCommand(originalCommand);

  const extracted = extractFetchCall(normalizedCommand);
  if (!extracted.ok) {
    return { ok: false, error: extracted.error, normalizedCommand };
  }

  const args = splitTopLevelArgs(extracted.argsText);
  if (!args[0]) {
    return { ok: false, error: '解析失败：未检测到 fetch 的 URL 参数', normalizedCommand };
  }

  const urlResult = parseJsStringLiteral(args[0]);
  if (!urlResult.ok) {
    return { ok: false, error: `解析失败：URL 不是字符串（${urlResult.error}）`, normalizedCommand };
  }

  const url = urlResult.value.trim();
  if (!url) {
    return { ok: false, error: '解析失败：URL 为空', normalizedCommand };
  }

  const initArg = args[1]?.trim();
  const initValue =
    initArg && initArg !== 'undefined'
      ? parseJsonLike(initArg)
      : ({ ok: true, value: undefined } as const);
  if (!initValue.ok) {
    return { ok: false, error: initValue.error, normalizedCommand };
  }

  const init = isPlainObject(initValue.value) ? initValue.value : {};

  const method =
    normalizeMethod(typeof init.method === 'string' ? init.method : undefined) ??
    (init.body === null || init.body === undefined ? 'GET' : 'POST');

  const headers = parseHeaders(init.headers);
  const query = parseUrlQuery(url);
  const body = parseBody(init.body, headers);

  return {
    ok: true,
    request: {
      url,
      method,
      headers,
      query,
      body,
      originalCommand,
      normalizedCommand,
    },
  };
}

function normalizeFetchCommand(input: string): string {
  return input.replace(/\r/g, '').trim();
}

function extractFetchCall(text: string): { ok: true; argsText: string } | { ok: false; error: string } {
  const match = /^\s*(?:await\s+)?fetch\s*\(/.exec(text);
  if (!match) {
    return { ok: false, error: '解析失败：未检测到以 fetch(...) 开头的代码片段（请使用 DevTools「Copy as fetch」）' };
  }

  const openIndex = match[0].length - 1;
  const extracted = extractParenthesized(text, openIndex);
  if (!extracted.ok) return extracted;
  return { ok: true, argsText: extracted.inside };
}

function extractParenthesized(text: string, openIndex: number): { ok: true; inside: string } | { ok: false; error: string } {
  if (text[openIndex] !== '(') {
    return { ok: false, error: '解析失败：fetch 参数括号不完整' };
  }

  let quote: '"' | "'" | null = null;
  let escape = false;
  let depth = 0;

  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];

    if (quote) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (ch === '(') {
      depth++;
      continue;
    }

    if (ch === ')') {
      depth--;
      if (depth === 0) {
        return { ok: true, inside: text.slice(openIndex + 1, i) };
      }
      continue;
    }
  }

  return { ok: false, error: '解析失败：fetch 参数括号不匹配' };
}

function splitTopLevelArgs(text: string): string[] {
  const args: string[] = [];
  let current = '';

  let quote: '"' | "'" | null = null;
  let escape = false;
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quote) {
      current += ch;
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === '(') {
      depthParen++;
      current += ch;
      continue;
    }
    if (ch === ')') {
      if (depthParen > 0) depthParen--;
      current += ch;
      continue;
    }

    if (ch === '{') {
      depthBrace++;
      current += ch;
      continue;
    }
    if (ch === '}') {
      if (depthBrace > 0) depthBrace--;
      current += ch;
      continue;
    }

    if (ch === '[') {
      depthBracket++;
      current += ch;
      continue;
    }
    if (ch === ']') {
      if (depthBracket > 0) depthBracket--;
      current += ch;
      continue;
    }

    if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) args.push(tail);
  return args;
}

function parseJsStringLiteral(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const text = input.trim();
  if (!text) return { ok: false, error: '字符串为空' };

  const quote = text[0];
  if ((quote !== '"' && quote !== "'") || text[text.length - 1] !== quote) {
    return { ok: false, error: '缺少引号包裹' };
  }

  let out = '';
  let escape = false;

  for (let i = 1; i < text.length - 1; i++) {
    const ch = text[i];

    if (!escape) {
      if (ch === '\\') {
        escape = true;
        continue;
      }
      out += ch;
      continue;
    }

    escape = false;

    if (ch === 'n') out += '\n';
    else if (ch === 'r') out += '\r';
    else if (ch === 't') out += '\t';
    else if (ch === 'b') out += '\b';
    else if (ch === 'f') out += '\f';
    else if (ch === 'v') out += '\v';
    else if (ch === '0') out += '\0';
    else if (ch === 'u') {
      const hex = text.slice(i + 1, i + 5);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) return { ok: false, error: 'unicode 转义无效' };
      out += String.fromCharCode(parseInt(hex, 16));
      i += 4;
    } else if (ch === 'x') {
      const hex = text.slice(i + 1, i + 3);
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) return { ok: false, error: 'hex 转义无效' };
      out += String.fromCharCode(parseInt(hex, 16));
      i += 2;
    } else {
      out += ch;
    }
  }

  if (escape) {
    return { ok: false, error: '字符串转义不完整' };
  }

  return { ok: true, value: out };
}

function parseJsonLike(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, value: undefined };
  if (trimmed === 'undefined') return { ok: true, value: undefined };

  const normalized = stripTrailingCommas(trimmed);

  try {
    return { ok: true, value: JSON.parse(normalized) as unknown };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `解析失败：fetch 参数对象不是可解析的 JSON（${message}）`,
    };
  }
}

function stripTrailingCommas(text: string): string {
  return text.replace(/,\s*([}\]])/g, '$1');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseHeaders(value: unknown): NameValuePair[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    const pairs: NameValuePair[] = [];
    for (const item of value) {
      if (Array.isArray(item) && typeof item[0] === 'string') {
        pairs.push({ name: item[0], value: item.length >= 2 ? String(item[1] ?? '') : '' });
      }
    }
    return pairs;
  }

  if (!isPlainObject(value)) return [];

  const pairs: NameValuePair[] = [];
  for (const [name, rawValue] of Object.entries(value)) {
    pairs.push({ name, value: rawValue === null || rawValue === undefined ? '' : String(rawValue) });
  }
  return pairs;
}

function normalizeMethod(value: string | undefined): HttpMethod | undefined {
  const upper = value?.toUpperCase();
  if (
    upper === 'GET' ||
    upper === 'POST' ||
    upper === 'PUT' ||
    upper === 'DELETE' ||
    upper === 'PATCH' ||
    upper === 'HEAD' ||
    upper === 'OPTIONS'
  ) {
    return upper;
  }
  return undefined;
}

function getHeaderValue(headers: NameValuePair[], name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const h of headers) {
    if (h.name.toLowerCase() === lower) return h.value;
  }
  return undefined;
}

function parseUrlQuery(url: string): NameValuePair[] {
  try {
    const u = new URL(url);
    const pairs: NameValuePair[] = [];
    for (const [name, value] of u.searchParams) {
      pairs.push({ name, value });
    }
    return pairs;
  } catch {
    return [];
  }
}

function parseQueryString(text: string): NameValuePair[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const qs = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed;
  const params = new URLSearchParams(qs);
  const pairs: NameValuePair[] = [];
  for (const [name, value] of params) {
    pairs.push({ name, value });
  }
  return pairs;
}

function parseBody(value: unknown, headers: NameValuePair[]): ParsedBody {
  if (value === null || value === undefined) return { kind: 'none' };

  const contentType = getHeaderValue(headers, 'content-type');

  if (typeof value === 'string') {
    return buildBodyFromText(value, contentType);
  }

  try {
    return { kind: 'raw', contentType, text: JSON.stringify(value) };
  } catch {
    return { kind: 'raw', contentType, text: String(value) };
  }
}

function buildBodyFromText(text: string, contentType?: string): ParsedBody {
  const trimmed = text.trim();
  if (!trimmed) return { kind: 'none' };

  const ct = contentType?.toLowerCase() ?? '';

  if (ct.includes('application/json') || looksLikeJson(trimmed)) {
    try {
      const json = JSON.parse(trimmed) as unknown;
      return {
        kind: 'json',
        contentType: contentType ?? 'application/json',
        jsonText: JSON.stringify(json, null, 2),
        json,
      };
    } catch {
      return {
        kind: 'json',
        contentType: contentType ?? 'application/json',
        jsonText: trimmed,
      };
    }
  }

  if (ct.includes('application/x-www-form-urlencoded') || looksLikeFormUrlEncoded(trimmed)) {
    const fields = parseQueryString(trimmed);
    return {
      kind: 'form',
      contentType: contentType ?? 'application/x-www-form-urlencoded',
      fields,
    };
  }

  return { kind: 'raw', contentType, text: trimmed };
}

function looksLikeJson(text: string): boolean {
  if (!text) return false;
  const t = text.trimStart();
  return t.startsWith('{') || t.startsWith('[');
}

function looksLikeFormUrlEncoded(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t) return false;
  if (t.startsWith('{') || t.startsWith('[')) return false;
  if (t.includes('\n')) return false;
  return t.includes('=');
}

