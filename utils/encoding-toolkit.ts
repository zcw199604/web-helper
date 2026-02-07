/**
 * 编码转换工具集
 *
 * 说明：
 * - 所有能力均在本地执行，不依赖外部服务。
 * - Gzip 采用“压缩输出 Base64、解压输入 Base64”的约定。
 */

import CryptoJS from 'crypto-js';
import pako from 'pako';
import { decodeBase64, encodeBase64, isValidBase64 } from './base64.ts';
import { decodeUrl, encodeUrl } from './url.ts';

export type EncodingOperationGroup = 'encrypt' | 'decrypt';

export interface EncodingOperationDefinition {
  id: string;
  label: string;
  group: EncodingOperationGroup;
  hint: string;
  run: (input: string) => string;
}

const UTF8_ENCODER = new TextEncoder();
const UTF8_DECODER = new TextDecoder();
const GZIP_SIZE_LIMIT_BYTES = 1024 * 1024;

const BASIC_HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};

/**
 * 将普通文本编码为 Unicode 转义序列（\uXXXX）。
 *
 * Args:
 *   input: 原始文本。
 *
 * Returns:
 *   Unicode 转义后的文本。
 */
export function encodeUnicode(input: string): string {
  let output = '';
  for (let index = 0; index < input.length; index += 1) {
    const codeUnit = input.charCodeAt(index);
    output += `\\u${codeUnit.toString(16).padStart(4, '0')}`;
  }
  return output;
}

/**
 * 将 \uXXXX 序列解码为普通文本。
 *
 * Args:
 *   input: 含有 Unicode 转义的文本。
 *
 * Returns:
 *   解码后的普通文本。
 */
export function decodeUnicode(input: string): string {
  let output = '';

  for (let index = 0; index < input.length; ) {
    if (input[index] === '\\' && input[index + 1] === 'u') {
      const hex = input.slice(index + 2, index + 6);
      if (hex.length !== 4 || !/^[0-9a-fA-F]{4}$/.test(hex)) {
        throw new Error('Unicode 输入格式无效，应为 \\uXXXX');
      }
      output += String.fromCharCode(Number.parseInt(hex, 16));
      index += 6;
      continue;
    }

    output += input[index];
    index += 1;
  }

  return output;
}

/**
 * 将文本按 UTF-8 字节编码为 \xHH 序列。
 *
 * Args:
 *   input: 原始文本。
 *
 * Returns:
 *   形如 \x68\x69 的字节转义串。
 */
export function encodeUtf16Hex(input: string): string {
  const bytes = UTF8_ENCODER.encode(input);
  return Array.from(bytes, (byte) => `\\x${byte.toString(16).padStart(2, '0')}`).join('');
}

/**
 * 将 \xHH 序列按 UTF-8 字节解码为文本。
 *
 * Args:
 *   input: 形如 \x68\x69 的字节转义串。
 *
 * Returns:
 *   解码后的文本。
 */
export function decodeUtf16Hex(input: string): string {
  const bytes: number[] = [];

  for (let index = 0; index < input.length; ) {
    if (/\s/.test(input[index])) {
      index += 1;
      continue;
    }

    if (input[index] === '\\' && input[index + 1] === 'x') {
      const hex = input.slice(index + 2, index + 4);
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) {
        throw new Error('UTF16(\\x) 输入格式无效，应为 \\xHH 序列');
      }
      bytes.push(Number.parseInt(hex, 16));
      index += 4;
      continue;
    }

    throw new Error('UTF16(\\x) 输入格式无效，应为 \\xHH 序列');
  }

  return UTF8_DECODER.decode(new Uint8Array(bytes));
}

/**
 * Base64 编码（支持 Unicode）。
 */
export function encodeBase64Text(input: string): string {
  return encodeBase64(input);
}

/**
 * Base64 解码（支持 Unicode）。
 */
export function decodeBase64Text(input: string): string {
  if (!isValidBase64(input)) {
    throw new Error('无效的 Base64 字符串');
  }
  return decodeBase64(input);
}

/**
 * 计算 MD5 摘要。
 */
export function hashMd5(input: string): string {
  return CryptoJS.MD5(input).toString();
}

/**
 * 计算 SHA1 摘要。
 */
export function hashSha1(input: string): string {
  return CryptoJS.SHA1(input).toString();
}

/**
 * 将文本编码为十六进制字符串（UTF-8 字节）。
 */
export function encodeHex(input: string): string {
  const bytes = UTF8_ENCODER.encode(input);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 将十六进制字符串解码为文本（UTF-8）。
 */
export function decodeHex(input: string): string {
  const normalized = input.replace(/\s+/g, '').toLowerCase();
  if (!/^[0-9a-f]*$/.test(normalized)) {
    throw new Error('十六进制字符串包含非法字符');
  }
  if (normalized.length % 2 !== 0) {
    throw new Error('十六进制字符串长度必须为偶数');
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return UTF8_DECODER.decode(bytes);
}

/**
 * HTML 普通编码：仅编码常见敏感字符。
 */
export function encodeHtmlBasic(input: string): string {
  return input.replace(/[&<>"']/g, (char) => BASIC_HTML_ESCAPE_MAP[char] ?? char);
}

/**
 * HTML 深度编码：将所有字符编码为十六进制实体。
 */
export function encodeHtmlDeep(input: string): string {
  let output = '';

  for (const char of input) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;
    output += `&#x${codePoint.toString(16).toUpperCase()};`;
  }

  return output;
}

/**
 * 将 HTML 片段转换为 JS 字符串字面量。
 */
export function convertHtmlToJs(input: string): string {
  const escaped = input
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/<\/script>/gi, '<\\/script>');

  return `"${escaped}"`;
}

/**
 * HTML 实体解码，支持命名实体与数值实体。
 */
export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (full, entity) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return numberToCodePoint(codePoint, full);
    }

    if (entity.startsWith('#')) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return numberToCodePoint(codePoint, full);
    }

    return HTML_ENTITY_MAP[entity] ?? full;
  });
}

/**
 * 解析 URL 参数并返回格式化 JSON。
 */
export function parseUrlParamsToJson(input: string): string {
  const queryPart = extractQuery(input);
  const params = new URLSearchParams(queryPart);
  const result: Record<string, string | string[]> = {};

  for (const [name, value] of params.entries()) {
    const existing = result[name];
    if (existing === undefined) {
      result[name] = value;
      continue;
    }

    if (Array.isArray(existing)) {
      existing.push(value);
      continue;
    }

    result[name] = [existing, value];
  }

  return JSON.stringify(result, null, 2);
}

/**
 * 轻量解码 JWT（只解析 header/payload/signature，不做验签）。
 */
export function decodeJwtLite(input: string): string {
  const parts = input.trim().split('.');
  if (parts.length !== 3) {
    throw new Error('JWT 格式无效：应包含 3 段内容');
  }

  const header = parseJwtSegment(parts[0], 'Header');
  const payload = parseJwtSegment(parts[1], 'Payload');

  return JSON.stringify(
    {
      header,
      payload,
      signature: parts[2],
    },
    null,
    2,
  );
}

/**
 * 格式化 Cookie 字符串为 JSON。
 */
export function formatCookieToJson(input: string): string {
  const segments = input
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  const result: Record<string, string | string[] | string[]> = {};
  const flags: string[] = [];

  for (const segment of segments) {
    const equalIndex = segment.indexOf('=');
    if (equalIndex < 0) {
      flags.push(segment);
      continue;
    }

    const name = segment.slice(0, equalIndex).trim();
    const rawValue = segment.slice(equalIndex + 1).trim();
    if (!name) continue;

    const value = safeDecodeURIComponent(rawValue);
    const existing = result[name];

    if (existing === undefined) {
      result[name] = value;
      continue;
    }

    if (Array.isArray(existing)) {
      existing.push(value);
      continue;
    }

    result[name] = [existing, value];
  }

  if (flags.length > 0) {
    result.__flags = flags;
  }

  return JSON.stringify(result, null, 2);
}

/**
 * Gzip 压缩：输入文本，输出 Base64。
 */
export function gzipCompress(input: string): string {
  const bytes = UTF8_ENCODER.encode(input);
  ensureGzipSizeLimit(bytes.length);

  const compressed = pako.gzip(bytes);
  return bytesToBase64(compressed);
}

/**
 * Gzip 解压：输入 Base64，输出文本。
 */
export function gzipDecompress(input: string): string {
  const compressedBytes = base64ToBytes(input.trim());
  ensureGzipSizeLimit(compressedBytes.length);

  try {
    const decompressed = pako.ungzip(compressedBytes);
    return UTF8_DECODER.decode(decompressed);
  } catch {
    throw new Error('Gzip 解压失败，请确认输入为有效的 Gzip Base64 字符串');
  }
}

export const ENCODING_OPERATIONS: readonly EncodingOperationDefinition[] = [
  { id: 'unicode-encode', label: 'Unicode编码', group: 'encrypt', hint: '输出 \\uXXXX', run: encodeUnicode },
  { id: 'url-encode', label: 'URL编码', group: 'encrypt', hint: '输出 % 编码', run: encodeUrl },
  { id: 'utf16-encode', label: 'UTF16编码', group: 'encrypt', hint: '按字节输出 \\xHH', run: encodeUtf16Hex },
  { id: 'base64-encode', label: 'Base64编码', group: 'encrypt', hint: '输出 Base64 文本', run: encodeBase64Text },
  { id: 'md5-hash', label: 'MD5计算', group: 'encrypt', hint: '输出 32 位十六进制摘要', run: hashMd5 },
  { id: 'hex-encode', label: '十六进制编码', group: 'encrypt', hint: '输出十六进制字符串', run: encodeHex },
  { id: 'sha1-hash', label: 'SHA1加密', group: 'encrypt', hint: '输出 40 位十六进制摘要', run: hashSha1 },
  { id: 'html-encode', label: 'HTML普通编码', group: 'encrypt', hint: '编码 &,<,>,",\'', run: encodeHtmlBasic },
  { id: 'html-encode-deep', label: 'HTML深度编码', group: 'encrypt', hint: '每个字符转实体编码', run: encodeHtmlDeep },
  { id: 'html-to-js', label: 'HTML转JS', group: 'encrypt', hint: '转换为 JS 字符串字面量', run: convertHtmlToJs },
  {
    id: 'gzip-compress',
    label: 'Gzip压缩',
    group: 'encrypt',
    hint: '压缩输出 Base64（输入建议 ≤1MB）',
    run: gzipCompress,
  },

  { id: 'unicode-decode', label: 'Unicode解码', group: 'decrypt', hint: '输入 \\uXXXX', run: decodeUnicode },
  { id: 'url-decode', label: 'URL解码', group: 'decrypt', hint: '输入 % 编码文本', run: decodeUrl },
  { id: 'utf16-decode', label: 'UTF16解码', group: 'decrypt', hint: '输入 \\xHH 序列', run: decodeUtf16Hex },
  { id: 'base64-decode', label: 'Base64解码', group: 'decrypt', hint: '输入 Base64 文本', run: decodeBase64Text },
  { id: 'hex-decode', label: '十六进制解码', group: 'decrypt', hint: '输入十六进制字符串', run: decodeHex },
  {
    id: 'html-entity-decode',
    label: 'HTML实体解码',
    group: 'decrypt',
    hint: '解码常见命名实体与数字实体',
    run: decodeHtmlEntities,
  },
  {
    id: 'url-params-parse',
    label: 'URL参数解析',
    group: 'decrypt',
    hint: '输出参数 JSON',
    run: parseUrlParamsToJson,
  },
  { id: 'jwt-decode', label: 'JWT解码', group: 'decrypt', hint: '轻量解码，不校验签名', run: decodeJwtLite },
  { id: 'cookie-format', label: 'Cookie格式化', group: 'decrypt', hint: '输出 Cookie JSON', run: formatCookieToJson },
  {
    id: 'gzip-decompress',
    label: 'Gzip解压',
    group: 'decrypt',
    hint: '输入 Base64 压缩串（建议 ≤1MB）',
    run: gzipDecompress,
  },
] as const;

export type EncodingOperationId = (typeof ENCODING_OPERATIONS)[number]['id'];

/**
 * 执行指定操作（统一入口，用于测试与 UI 逻辑复用）。
 *
 * Args:
 *   operationId: 操作 ID。
 *   input: 输入文本。
 *
 * Returns:
 *   处理结果字符串。
 */
export function runEncodingOperation(operationId: EncodingOperationId, input: string): string {
  if (!input.trim()) {
    throw new Error('请输入内容');
  }

  const operation = ENCODING_OPERATIONS.find((item) => item.id === operationId);
  if (!operation) {
    throw new Error(`未知操作: ${operationId}`);
  }

  return operation.run(input);
}

function numberToCodePoint(codePoint: number, fallback: string): string {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return fallback;
  }
  return String.fromCodePoint(codePoint);
}

function extractQuery(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const questionIndex = trimmed.indexOf('?');
  const queryStart = questionIndex >= 0 ? questionIndex + 1 : 0;
  const hashIndex = trimmed.indexOf('#', queryStart);

  if (hashIndex >= 0) {
    return trimmed.slice(queryStart, hashIndex);
  }

  return trimmed.slice(queryStart);
}

function parseJwtSegment(segment: string, sectionName: string): Record<string, unknown> {
  try {
    const jsonText = base64UrlDecode(segment);
    return JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    throw new Error(`JWT ${sectionName} 解析失败`);
  }
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const paddingSize = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(paddingSize);

  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return UTF8_DECODER.decode(bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  if (!isValidBase64(base64)) {
    throw new Error('Gzip 解压需要有效的 Base64 输入');
  }

  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function ensureGzipSizeLimit(sizeInBytes: number): void {
  if (sizeInBytes > GZIP_SIZE_LIMIT_BYTES) {
    throw new Error('输入内容过大（超过 1MB），请缩小后重试');
  }
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
