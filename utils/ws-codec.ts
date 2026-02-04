/**
 * WebSocket message codec helpers.
 *
 * - Used by the WebSocket tool page to encode/decode binary payloads.
 * - Works in both browser (btoa/atob) and Node (Buffer) environments.
 */

function stripSpaces(input: string) {
  return input.replace(/\s+/g, '');
}

function hasNodeBuffer() {
  return typeof Buffer !== 'undefined' && typeof Buffer.from === 'function';
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

export function hexToBytes(input: string): Uint8Array {
  let hex = stripSpaces(input.trim());
  if (hex.startsWith('0x') || hex.startsWith('0X')) hex = hex.slice(2);
  if (hex.length === 0) return new Uint8Array();
  if (hex.length % 2 !== 0) throw new Error('HEX 长度必须为偶数');
  if (!/^[0-9a-fA-F]+$/.test(hex)) throw new Error('HEX 含有非法字符');

  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

function normalizeBase64(input: string): string {
  let b64 = stripSpaces(input.trim());
  // URL-safe base64 -> standard base64
  b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  if (b64.length === 0) return '';

  const mod = b64.length % 4;
  if (mod === 2) b64 += '==';
  else if (mod === 3) b64 += '=';
  else if (mod === 1) throw new Error('Base64 长度不合法');
  return b64;
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';

  if (typeof btoa === 'function') {
    // btoa expects a binary string (latin1).
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  if (hasNodeBuffer()) return Buffer.from(bytes).toString('base64');
  throw new Error('当前环境不支持 Base64 编码');
}

export function base64ToBytes(input: string): Uint8Array {
  const b64 = normalizeBase64(input);
  if (b64.length === 0) return new Uint8Array();

  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  if (hasNodeBuffer()) return new Uint8Array(Buffer.from(b64, 'base64'));
  throw new Error('当前环境不支持 Base64 解码');
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

