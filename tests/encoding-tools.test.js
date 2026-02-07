import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ENCODING_OPERATIONS,
  decodeHtmlEntities,
  decodeUnicode,
  decodeUtf16Hex,
  decodeJwtLite,
  encodeUnicode,
  encodeUtf16Hex,
  formatCookieToJson,
  gzipCompress,
  gzipDecompress,
  parseUrlParamsToJson,
  runEncodingOperation,
} from '../utils/encoding-toolkit.ts';

const JWT_SAMPLE =
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWxpY2UifQ.signature';
const GZIP_SAMPLE_BASE64 = gzipCompress('hello gzip');

const normalInputs = {
  'unicode-encode': 'Hi',
  'url-encode': 'a b',
  'utf16-encode': '中文',
  'base64-encode': 'hello',
  'md5-hash': 'abc',
  'hex-encode': 'abc',
  'sha1-hash': 'abc',
  'html-encode': '<div>"&\'</div>',
  'html-encode-deep': 'A中',
  'html-to-js': '<div>hello</div>',
  'gzip-compress': 'gzip text',

  'unicode-decode': '\\u4f60\\u597d',
  'url-decode': 'hello%20world',
  'utf16-decode': '\\x68\\x69',
  'base64-decode': 'aGVsbG8=',
  'hex-decode': '68656c6c6f',
  'html-entity-decode': '&lt;div&gt;&amp;&quot;&#39;&lt;/div&gt;',
  'url-params-parse': 'https://example.com?a=1&b=2&b=3',
  'jwt-decode': JWT_SAMPLE,
  'cookie-format': 'a=1; b=hello%20world',
  'gzip-decompress': GZIP_SAMPLE_BASE64,
};

const invalidCases = {
  'unicode-encode': { input: '😀乱码', shouldThrow: false },
  'url-encode': { input: '😀乱码', shouldThrow: false },
  'utf16-encode': { input: '😀乱码', shouldThrow: false },
  'base64-encode': { input: '😀乱码', shouldThrow: false },
  'md5-hash': { input: '😀乱码', shouldThrow: false },
  'hex-encode': { input: '😀乱码', shouldThrow: false },
  'sha1-hash': { input: '😀乱码', shouldThrow: false },
  'html-encode': { input: '😀乱码', shouldThrow: false },
  'html-encode-deep': { input: '😀乱码', shouldThrow: false },
  'html-to-js': { input: '😀乱码', shouldThrow: false },
  'gzip-compress': { input: '😀乱码', shouldThrow: false },

  'unicode-decode': { input: '\\u12G4', shouldThrow: true },
  'url-decode': { input: '%E0%A4%A', shouldThrow: true },
  'utf16-decode': { input: '\\xZZ', shouldThrow: true },
  'base64-decode': { input: '###', shouldThrow: true },
  'hex-decode': { input: 'abc', shouldThrow: true },
  'html-entity-decode': { input: '&unknown;', shouldThrow: false },
  'url-params-parse': { input: '###', shouldThrow: false },
  'jwt-decode': { input: 'abc.def', shouldThrow: true },
  'cookie-format': { input: 'a=1; HttpOnly', shouldThrow: false },
  'gzip-decompress': { input: 'not-base64', shouldThrow: true },
};

test('operation count: should cover 21 tools', () => {
  assert.equal(ENCODING_OPERATIONS.length, 21);
});

test('matrix size: should provide 63 test scenarios', () => {
  assert.equal(ENCODING_OPERATIONS.length * 3, 63);
});

for (const operation of ENCODING_OPERATIONS) {
  test(`[matrix][normal] ${operation.id}`, () => {
    const result = runEncodingOperation(operation.id, normalInputs[operation.id]);
    assert.equal(typeof result, 'string');
    assert.ok(result.length >= 0);
  });

  test(`[matrix][empty] ${operation.id}`, () => {
    assert.throws(() => runEncodingOperation(operation.id, '   '), /请输入内容/);
  });

  test(`[matrix][invalid] ${operation.id}`, () => {
    const { input, shouldThrow } = invalidCases[operation.id];
    if (shouldThrow) {
      assert.throws(() => runEncodingOperation(operation.id, input));
    } else {
      const result = runEncodingOperation(operation.id, input);
      assert.equal(typeof result, 'string');
    }
  });
}

test('unicode encode/decode: should roundtrip Chinese text', () => {
  const encoded = encodeUnicode('你好');
  assert.equal(encoded, '\\u4f60\\u597d');
  assert.equal(decodeUnicode(encoded), '你好');
});

test('utf16(\\x) encode/decode: should roundtrip mixed text', () => {
  const encoded = encodeUtf16Hex('A中');
  assert.equal(encoded, '\\x41\\xe4\\xb8\\xad');
  assert.equal(decodeUtf16Hex(encoded), 'A中');
});

test('HTML entity decode: should decode named and numeric entities', () => {
  const output = decodeHtmlEntities('&lt;span&gt;&#x4F60;&#22909;&lt;/span&gt;');
  assert.equal(output, '<span>你好</span>');
});

test('URL params parse: should keep repeated keys as array', () => {
  const json = parseUrlParamsToJson('https://x.test?a=1&a=2&b=3');
  const parsed = JSON.parse(json);
  assert.deepEqual(parsed, { a: ['1', '2'], b: '3' });
});

test('JWT decode lite: should expose header/payload/signature', () => {
  const json = decodeJwtLite(JWT_SAMPLE);
  const parsed = JSON.parse(json);
  assert.equal(parsed.header.alg, 'none');
  assert.equal(parsed.payload.sub, '123');
  assert.equal(parsed.signature, 'signature');
});

test('cookie format: should decode URL-encoded value', () => {
  const json = formatCookieToJson('token=abc; user=Alice%20Chen');
  const parsed = JSON.parse(json);
  assert.equal(parsed.token, 'abc');
  assert.equal(parsed.user, 'Alice Chen');
});

test('gzip compress/decompress: should roundtrip text', () => {
  const compressed = gzipCompress('hello gzip');
  const plain = gzipDecompress(compressed);
  assert.equal(plain, 'hello gzip');
});

test('gzip compress: should block input larger than 1MB', () => {
  const huge = 'a'.repeat(1024 * 1024 + 1);
  assert.throws(() => gzipCompress(huge), /超过 1MB/);
});
