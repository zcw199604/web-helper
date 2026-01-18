/**
 * Markdown 文档生成工具函数
 *
 * 将结构化请求信息渲染为接口文档 Markdown 文本。
 */

import type { NameValuePair, ParsedBody, ParsedCurlRequest } from './curl';

export type ExampleCodeFormat = 'none' | 'curl' | 'fetch' | 'both';

export interface BuildMarkdownOptions {
  originalRequest?: { kind: 'curl' | 'fetch'; text: string };
  exampleCode?: ExampleCodeFormat;
  responseBody?: string;
}

export function buildRequestMarkdown(request: ParsedCurlRequest, options: BuildMarkdownOptions = {}): string {
  const title = buildTitle(request);
  const exampleCode = options.exampleCode ?? 'none';
  const responseBody = options.responseBody?.trim();

  const lines: string[] = [];

  lines.push(`# 接口文档：${title}`);
  lines.push('');

  lines.push('## 请求');
  lines.push(`- Method: \`${request.method}\``);
  lines.push(`- URL: \`${request.url}\``);
  lines.push('');

  lines.push('### Query 参数');
  lines.push(renderPairsTable(request.query, ['参数', '值']));
  lines.push('');

  lines.push('### Headers');
  lines.push(renderPairsTable(request.headers, ['Header', 'Value']));
  lines.push('');

  lines.push('### Body');
  lines.push(...renderBody(request.body));
  lines.push('');

  if (responseBody) {
    lines.push('## 响应示例');
    lines.push(...renderResponseExample(responseBody));
    lines.push('');
  }

  if (exampleCode !== 'none') {
    lines.push('## 示例代码');

    if (exampleCode === 'curl' || exampleCode === 'both') {
      lines.push('### cURL');
      lines.push('```bash');
      lines.push(renderCurlExample(request));
      lines.push('```');
      lines.push('');
    }

    if (exampleCode === 'fetch' || exampleCode === 'both') {
      lines.push('### fetch');
      lines.push('```js');
      lines.push(renderFetchExample(request));
      lines.push('```');
      lines.push('');
    }

    const original = options.originalRequest;
    if (original?.text) {
      if (original.kind === 'curl' && (exampleCode === 'curl' || exampleCode === 'both')) {
        lines.push('### 原始 cURL（DevTools）');
        lines.push('```bash');
        lines.push(original.text.trim());
        lines.push('```');
        lines.push('');
      }

      if (original.kind === 'fetch' && (exampleCode === 'fetch' || exampleCode === 'both')) {
        lines.push('### 原始 fetch（DevTools）');
        lines.push('```js');
        lines.push(original.text.trim());
        lines.push('```');
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

export function suggestMarkdownFileName(url: string): string {
  const parsed = safeParseUrl(url);
  const host = parsed?.hostname ? safeFileNamePart(parsed.hostname) : 'request';
  const lastPath = parsed?.pathname ? parsed.pathname.split('/').filter(Boolean).pop() : undefined;
  const path = safeFileNamePart(lastPath || 'request');

  const base = `${host}_${path}`.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  const trimmed = base.length > 120 ? base.slice(0, 120) : base;
  return `${trimmed || 'request'}.md`;
}

function buildTitle(request: ParsedCurlRequest): string {
  const parsed = safeParseUrl(request.url);
  if (!parsed) return `${request.method} ${request.url}`;
  const pathname = parsed.pathname || '/';
  return `${request.method} ${pathname}`;
}

function renderPairsTable(pairs: NameValuePair[], header: [string, string]): string {
  if (!pairs || pairs.length === 0) return '（无）';
  const [h1, h2] = header;
  const lines: string[] = [];
  lines.push(`| ${h1} | ${h2} |`);
  lines.push('| --- | --- |');
  for (const p of pairs) {
    lines.push(`| ${escapeTableCell(p.name)} | ${escapeTableCell(p.value)} |`);
  }
  return lines.join('\n');
}

function renderBody(body: ParsedBody): string[] {
  if (body.kind === 'none') return ['（无）'];

  if (body.kind === 'json') {
    return [
      `- 类型: \`${body.contentType}\``,
      '```json',
      body.jsonText || '',
      '```',
    ];
  }

  if (body.kind === 'form') {
    return [`- 类型: \`${body.contentType}\``, renderPairsTable(body.fields, ['参数', '值'])];
  }

  if (body.kind === 'multipart') {
    return [`- 类型: \`${body.contentType}\``, renderPairsTable(body.fields, ['字段', '值'])];
  }

  return [
    `- 类型: \`${body.contentType ?? 'text/plain'}\``,
    '```text',
    body.text || '',
    '```',
  ];
}

function renderResponseExample(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return ['（无）'];

  const json = tryParseJson(trimmed);
  if (json.ok) {
    return ['```json', JSON.stringify(json.value, null, 2), '```'];
  }

  return ['```text', trimmed, '```'];
}

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

function renderCurlExample(request: ParsedCurlRequest): string {
  const segments: string[] = [];

  const includeMethod = request.method !== 'GET' || request.body.kind !== 'none';
  const first = `curl${includeMethod ? ` -X ${request.method}` : ''} ${bashQuote(request.url)}`;
  segments.push(first);

  for (const h of request.headers) {
    segments.push(`  -H ${bashQuote(`${h.name}: ${h.value}`)}`);
  }

  if (request.body.kind === 'json') {
    const bodyText =
      request.body.json !== undefined ? JSON.stringify(request.body.json) : request.body.jsonText;
    segments.push(`  --data-raw ${bashQuote(bodyText)}`);
  } else if (request.body.kind === 'form') {
    const qs = request.body.fields.map((f) => `${f.name}=${f.value}`).join('&');
    segments.push(`  --data-raw ${bashQuote(qs)}`);
  } else if (request.body.kind === 'multipart') {
    for (const f of request.body.fields) {
      segments.push(`  -F ${bashQuote(`${f.name}=${f.value}`)}`);
    }
  } else if (request.body.kind === 'raw') {
    segments.push(`  --data-raw ${bashQuote(request.body.text)}`);
  }

  if (segments.length === 1) return segments[0];
  return segments
    .map((s, idx) => (idx < segments.length - 1 ? `${s} \\` : s))
    .join('\n');
}

function renderFetchExample(request: ParsedCurlRequest): string {
  const headers = headersToObject(request.headers);
  const headerText = Object.keys(headers).length > 0 ? JSON.stringify(headers, null, 2) : undefined;

  const lines: string[] = [];
  lines.push(`const url = ${JSON.stringify(request.url)};`);

  if (request.body.kind === 'multipart') {
    lines.push('const formData = new FormData();');
    for (const f of request.body.fields) {
      lines.push(`formData.append(${JSON.stringify(f.name)}, ${JSON.stringify(f.value)});`);
    }
    lines.push('');
  }

  lines.push('const res = await fetch(url, {');
  lines.push(`  method: ${JSON.stringify(request.method)},`);

  if (headerText) {
    lines.push('  headers: ' + indentBlock(headerText, 2).trimStart() + ',');
  }

  const bodyLines = renderFetchBody(request.body);
  for (const l of bodyLines) {
    lines.push(l);
  }

  lines.push('});');
  lines.push('const text = await res.text();');
  lines.push('console.log(text);');

  return lines.join('\n');
}

function renderFetchBody(body: ParsedBody): string[] {
  if (body.kind === 'none') return [];

  if (body.kind === 'json') {
    if (body.json !== undefined) {
      const jsonObjText = JSON.stringify(body.json, null, 2);
      return ['  body: JSON.stringify(' + indentBlock(jsonObjText, 2).trimStart() + '),'];
    }
    return [`  body: ${JSON.stringify(body.jsonText)},`];
  }

  if (body.kind === 'form') {
    const obj: Record<string, string> = {};
    for (const f of body.fields) obj[f.name] = f.value;
    const objText = JSON.stringify(obj, null, 2);
    return ['  body: new URLSearchParams(' + indentBlock(objText, 2).trimStart() + '),'];
  }

  if (body.kind === 'multipart') {
    return ['  body: formData,'];
  }

  return [`  body: ${JSON.stringify(body.text)},`];
}

function headersToObject(headers: NameValuePair[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const h of headers) obj[h.name] = h.value;
  return obj;
}

function bashQuote(text: string): string {
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function safeFileNamePart(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function escapeTableCell(value: string): string {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br/>');
}

function indentBlock(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((l) => pad + l)
    .join('\n');
}
