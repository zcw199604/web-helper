/**
 * JSON 工具函数
 */

/**
 * 格式化 JSON 字符串
 * @param input 原始 JSON 字符串
 * @param indent 缩进空格数，默认 2
 * @returns 格式化后的 JSON 字符串
 */
export function formatJson(input: string, indent: number = 2): string {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed, null, indent);
}

/**
 * 压缩 JSON 字符串（移除空白）
 * @param input 原始 JSON 字符串
 * @returns 压缩后的 JSON 字符串
 */
export function minifyJson(input: string): string {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed);
}

/**
 * 验证 JSON 字符串是否有效
 * @param input JSON 字符串
 * @returns 验证结果
 */
export function validateJson(input: string): { valid: boolean; error?: string } {
  try {
    JSON.parse(input);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}
