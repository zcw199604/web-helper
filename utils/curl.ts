/**
 * cURL 解析工具函数
 *
 * 目标：解析浏览器 DevTools Network 的「Copy as cURL」文本，提取请求方法、URL、Headers 与 Body。
 * 说明：仅做文本解析，不执行任何命令。
 */

import { split } from 'shellwords';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface NameValuePair {
  name: string;
  value: string;
}

export type ParsedBody =
  | { kind: 'none' }
  | { kind: 'json'; contentType: string; jsonText: string; json?: unknown }
  | { kind: 'form'; contentType: string; fields: NameValuePair[] }
  | { kind: 'multipart'; contentType: string; fields: NameValuePair[] }
  | { kind: 'raw'; contentType?: string; text: string };

export interface ParsedCurlRequest {
  url: string;
  method: HttpMethod;
  headers: NameValuePair[];
  query: NameValuePair[];
  body: ParsedBody;
  originalCommand: string;
  normalizedCommand: string;
}

type ParsedCurlRequestCore = Omit<ParsedCurlRequest, 'originalCommand' | 'normalizedCommand'>;

export type ParseCurlResult =
  | { ok: true; request: ParsedCurlRequest }
  | { ok: false; error: string; normalizedCommand?: string };

export function parseCurlCommand(command: string): ParseCurlResult {
  const originalCommand = command.trim();
  if (!originalCommand) {
    return { ok: false, error: '请输入 cURL 命令' };
  }

  const normalizedCommand = normalizeCurlCommand(originalCommand);

  let args: string[];
  try {
    args = split(normalizedCommand);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `解析失败：无法分词（${message}）`, normalizedCommand };
  }

  const parsed = parseCurlArgs(args);
  if (!parsed.ok) {
    return { ...parsed, normalizedCommand };
  }

  return {
    ok: true,
    request: {
      ...parsed.request,
      originalCommand,
      normalizedCommand,
    },
  };
}

export function normalizeCurlCommand(input: string): string {
  const text = input.replace(/\r/g, '');
  const lines = text.split('\n');

  let merged = '';
  for (const line of lines) {
    const trimmedEnd = line.trimEnd();
    if (!trimmedEnd) continue;

    if (trimmedEnd.endsWith('^') || trimmedEnd.endsWith('\\')) {
      merged += trimmedEnd.slice(0, -1) + ' ';
      continue;
    }

    merged += trimmedEnd + ' ';
  }

  return merged.trim().replace(/\^(.)/g, '$1');
}

function parseCurlArgs(args: string[]): { ok: true; request: ParsedCurlRequestCore } | { ok: false; error: string } {
  if (!Array.isArray(args) || args.length === 0) {
    return { ok: false, error: '解析失败：未检测到有效的命令内容' };
  }

  let url: string | undefined;
  let explicitMethod: HttpMethod | undefined;
  let headOnly = false;
  let useGet = false;

  const headers: NameValuePair[] = [];
  const dataParts: string[] = [];
  const formParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (i === 0 && (arg === 'curl' || arg === 'curl.exe')) continue;

    if (arg === '-X' || arg === '--request') {
      const next = args[i + 1];
      if (!next) return { ok: false, error: `解析失败：${arg} 缺少方法值` };
      explicitMethod = normalizeMethod(next) ?? explicitMethod;
      i++;
      continue;
    }

    if (arg.startsWith('-X') && arg.length > 2) {
      explicitMethod = normalizeMethod(arg.slice(2)) ?? explicitMethod;
      continue;
    }

    if (arg === '-I' || arg === '--head') {
      headOnly = true;
      continue;
    }

    if (arg === '-G' || arg === '--get') {
      useGet = true;
      continue;
    }

    if (arg === '--url') {
      const next = args[i + 1];
      if (!next) return { ok: false, error: '解析失败：--url 缺少 URL 值' };
      url = next;
      i++;
      continue;
    }

    if (arg.startsWith('--url=')) {
      url = arg.slice('--url='.length);
      continue;
    }

    if (arg === '-H' || arg === '--header') {
      const next = args[i + 1];
      if (!next) return { ok: false, error: `解析失败：${arg} 缺少 header 值` };
      const parsedHeader = parseHeader(next);
      if (parsedHeader) headers.push(parsedHeader);
      i++;
      continue;
    }

    if (arg.startsWith('--header=')) {
      const parsedHeader = parseHeader(arg.slice('--header='.length));
      if (parsedHeader) headers.push(parsedHeader);
      continue;
    }

    if (isDataOption(arg)) {
      const next = args[i + 1];
      if (typeof next !== 'string') return { ok: false, error: `解析失败：${arg} 缺少 body 值` };
      dataParts.push(next);
      i++;
      continue;
    }

    const dataInline = readInlineValue(arg, ['--data', '--data-raw', '--data-binary', '--data-urlencode']);
    if (dataInline !== undefined) {
      dataParts.push(dataInline);
      continue;
    }

    if (isFormOption(arg)) {
      const next = args[i + 1];
      if (typeof next !== 'string') return { ok: false, error: `解析失败：${arg} 缺少 form 值` };
      formParts.push(next);
      i++;
      continue;
    }

    const formInline = readInlineValue(arg, ['--form', '--form-string']);
    if (formInline !== undefined) {
      formParts.push(formInline);
      continue;
    }

    if (!arg.startsWith('-') && !url && isProbablyUrl(arg)) {
      url = arg;
      continue;
    }
  }

  if (!url) {
    return { ok: false, error: '解析失败：未检测到 URL（请确认输入为 DevTools「Copy as cURL」内容）' };
  }

  const contentType = getHeaderValue(headers, 'content-type');
  const urlQuery = parseUrlQuery(url);
  const query: NameValuePair[] = [...urlQuery];

  let body: ParsedBody = { kind: 'none' };

  if (formParts.length > 0) {
    const fields = formParts.map(parseFormField).filter((x): x is NameValuePair => x !== null);
    body = { kind: 'multipart', contentType: contentType ?? 'multipart/form-data', fields };
  } else if (dataParts.length > 0) {
    const dataText = joinDataParts(dataParts, contentType);
    if (useGet) {
      const extra = parseQueryString(dataText);
      query.push(...extra);
      body = { kind: 'none' };
    } else {
      body = buildBodyFromData(dataText, contentType);
    }
  }

  const method: HttpMethod =
    explicitMethod ?? (headOnly ? 'HEAD' : body.kind !== 'none' ? 'POST' : useGet ? 'GET' : 'GET');

  return {
    ok: true,
    request: {
      url,
      method,
      headers,
      query,
      body,
    },
  };
}

function isDataOption(arg: string): boolean {
  return arg === '-d' || arg === '--data' || arg === '--data-raw' || arg === '--data-binary' || arg === '--data-urlencode';
}

function isFormOption(arg: string): boolean {
  return arg === '-F' || arg === '--form' || arg === '--form-string';
}

function readInlineValue(arg: string, opts: string[]): string | undefined {
  for (const opt of opts) {
    const prefix = `${opt}=`;
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return undefined;
}

function normalizeMethod(value: string): HttpMethod | undefined {
  const upper = value.toUpperCase();
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

function isProbablyUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function parseHeader(headerLine: string): NameValuePair | null {
  const idx = headerLine.indexOf(':');
  if (idx === -1) {
    const name = headerLine.trim();
    if (!name) return null;
    return { name, value: '' };
  }

  const name = headerLine.slice(0, idx).trim();
  const value = headerLine.slice(idx + 1).trimStart();
  if (!name) return null;
  return { name, value };
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

function joinDataParts(parts: string[], contentType?: string): string {
  if (parts.length === 1) return parts[0];
  const ct = contentType?.toLowerCase() ?? '';

  const joinedByAmp = parts.join('&');
  if (ct.includes('application/x-www-form-urlencoded')) return joinedByAmp;

  const looksLikeQuery = parts.every((p) => p.includes('=') && !p.includes('\n'));
  if (looksLikeQuery) return joinedByAmp;

  return parts.join('\n');
}

function buildBodyFromData(text: string, contentType?: string): ParsedBody {
  const trimmed = text.trim();
  const ct = contentType?.toLowerCase() ?? '';

  if (ct.includes('application/json') || looksLikeJson(trimmed)) {
    try {
      const json = JSON.parse(trimmed) as unknown;
      return { kind: 'json', contentType: contentType ?? 'application/json', jsonText: JSON.stringify(json, null, 2), json };
    } catch {
      return { kind: 'json', contentType: contentType ?? 'application/json', jsonText: trimmed };
    }
  }

  if (ct.includes('application/x-www-form-urlencoded') || looksLikeFormUrlEncoded(trimmed)) {
    const fields = parseQueryString(trimmed);
    return { kind: 'form', contentType: contentType ?? 'application/x-www-form-urlencoded', fields };
  }

  if (!trimmed) return { kind: 'none' };
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

function parseFormField(text: string): NameValuePair | null {
  const idx = text.indexOf('=');
  if (idx === -1) {
    const name = text.trim();
    if (!name) return null;
    return { name, value: '' };
  }

  const name = text.slice(0, idx).trim();
  const value = text.slice(idx + 1);
  if (!name) return null;
  return { name, value };
}
