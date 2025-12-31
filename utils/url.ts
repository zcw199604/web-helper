/**
 * URL 编解码工具函数
 */

/**
 * URL 编码
 * @param input 原始字符串
 * @returns URL 编码后的字符串
 */
export function encodeUrl(input: string): string {
  return encodeURIComponent(input);
}

/**
 * URL 解码
 * @param input URL 编码的字符串
 * @returns 解码后的字符串
 */
export function decodeUrl(input: string): string {
  return decodeURIComponent(input);
}

/**
 * 完整 URL 编码（包括特殊字符）
 * @param input 原始 URL
 * @returns 编码后的 URL
 */
export function encodeFullUrl(input: string): string {
  return encodeURI(input);
}

/**
 * 完整 URL 解码
 * @param input 编码的 URL
 * @returns 解码后的 URL
 */
export function decodeFullUrl(input: string): string {
  return decodeURI(input);
}

/**
 * 解析 URL 查询参数
 * @param url 完整 URL 或查询字符串
 * @returns 参数对象
 */
export function parseQueryParams(url: string): Record<string, string> {
  const queryString = url.includes('?') ? url.split('?')[1] : url;
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * 将对象转换为查询字符串
 * @param params 参数对象
 * @returns 查询字符串
 */
export function buildQueryString(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}
