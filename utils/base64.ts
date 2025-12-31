/**
 * Base64 工具函数
 */

/**
 * 将字符串编码为 Base64
 * @param input 原始字符串
 * @returns Base64 编码后的字符串
 */
export function encodeBase64(input: string): string {
  // 使用 TextEncoder 处理 Unicode 字符
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binaryString);
}

/**
 * 将 Base64 解码为字符串
 * @param input Base64 编码的字符串
 * @returns 解码后的原始字符串
 */
export function decodeBase64(input: string): string {
  const binaryString = atob(input);
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * 验证是否为有效的 Base64 字符串
 * @param input 待验证的字符串
 * @returns 是否有效
 */
export function isValidBase64(input: string): boolean {
  // Base64 正则表达式
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(input) && input.length % 4 === 0;
}
