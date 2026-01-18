/**
 * 请求片段解析：cURL / fetch
 *
 * 将 DevTools 的「Copy as cURL / Copy as fetch」文本解析为统一的结构化请求对象。
 */

import type { ParsedCurlRequest } from './curl';
import { parseCurlCommand } from './curl';
import { parseFetchCommand } from './fetch';

export type RequestSnippetKind = 'curl' | 'fetch';

export type ParseRequestResult =
  | { ok: true; kind: RequestSnippetKind; request: ParsedCurlRequest }
  | { ok: false; error: string };

export function parseRequestSnippet(input: string): ParseRequestResult {
  const text = input.trim();
  if (!text) return { ok: false, error: '请输入 cURL 或 fetch 文本' };

  if (looksLikeFetchSnippet(text)) {
    const result = parseFetchCommand(text);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, kind: 'fetch', request: result.request };
  }

  const result = parseCurlCommand(text);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, kind: 'curl', request: result.request };
}

function looksLikeFetchSnippet(text: string): boolean {
  return /^\s*(?:await\s+)?fetch\s*\(/.test(text);
}

