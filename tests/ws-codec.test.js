import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bytesToHex,
  hexToBytes,
  bytesToBase64,
  base64ToBytes,
  bytesToUtf8,
  utf8ToBytes,
} from '../utils/ws-codec.ts';

test('ws-codec: hex roundtrip', () => {
  const bytes = new Uint8Array([0, 1, 2, 255, 16, 32]);
  const hex = bytesToHex(bytes);
  assert.equal(hex, '000102ff1020');
  assert.deepEqual(Array.from(hexToBytes(hex)), Array.from(bytes));
});

test('ws-codec: hexToBytes tolerates 0x prefix and spaces', () => {
  const bytes = hexToBytes('0x00 01 02 ff');
  assert.deepEqual(Array.from(bytes), [0, 1, 2, 255]);
});

test('ws-codec: base64 roundtrip', () => {
  const bytes = new Uint8Array([0, 1, 2, 3, 254, 255]);
  const b64 = bytesToBase64(bytes);
  const out = base64ToBytes(b64);
  assert.deepEqual(Array.from(out), Array.from(bytes));
});

test('ws-codec: base64ToBytes accepts url-safe base64 without padding', () => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7]);
  const b64 = bytesToBase64(bytes);
  const urlSafe = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const out = base64ToBytes(urlSafe);
  assert.deepEqual(Array.from(out), Array.from(bytes));
});

test('ws-codec: utf8 roundtrip', () => {
  const text = 'hello ws';
  const bytes = utf8ToBytes(text);
  assert.equal(bytesToUtf8(bytes), text);
});

