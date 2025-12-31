/**
 * JSON 工具函数
 */
import { JSONPath } from 'jsonpath-plus';

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

/**
 * 执行 JSONPath 查询
 * @param jsonInput JSON 字符串或对象
 * @param path JSONPath 表达式 (例如 "$.store.book[*]")
 * @returns 查询结果
 */
export function queryJsonPath(jsonInput: string | object, path: string): any {
  const json = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
  // 简单的空检查，防止库报错
  if (!path || path === '$') return [json]; 
  return JSONPath({ path, json, wrap: true });
}

/**
 * 获取 JSONPath 智能提示
 * @param json 当前的 JSON 对象
 * @param currentPath 当前输入的 Path 字符串
 * @returns 建议的 Key 列表
 */
export function getJsonPathSuggestions(json: any, currentPath: string): string[] {
  if (!json || !currentPath) return [];

  try {
    // 1. 确定父级路径和当前的搜索前缀
    // 简单的逻辑：以最后一个 '.' 为分隔符
    // 例如: "$.store.bo" -> parent: "$.store", prefix: "bo"
    // "$.store." -> parent: "$.store", prefix: ""
    // "$." -> parent: "$", prefix: ""
    
    let parentPath = '$';
    let prefix = '';

    const lastDotIndex = currentPath.lastIndexOf('.');
    
    if (lastDotIndex === -1) {
       // 没有点，可能是刚开始输入 "$" 或者其他非法字符，暂不处理或视为根
       if (currentPath.startsWith('$')) {
           parentPath = '$';
           prefix = currentPath.substring(1); // 去掉 $
       } else {
           return [];
       }
    } else {
       parentPath = currentPath.substring(0, lastDotIndex);
       prefix = currentPath.substring(lastDotIndex + 1);
    }

    // 如果父路径为空，默认为根
    if (!parentPath) parentPath = '$';

    // 2. 查询父级对象
    // 注意：queryJsonPath 可能会抛错，如果路径不完整
    let nodes: any[] = [];
    try {
        nodes = queryJsonPath(json, parentPath);
    } catch {
        return [];
    }

    if (!nodes || nodes.length === 0) return [];

    // 3. 收集所有可能的 Key
    const suggestions = new Set<string>();
    
    nodes.forEach(node => {
        if (node && typeof node === 'object' && !Array.isArray(node)) {
            Object.keys(node).forEach(key => suggestions.add(key));
        } else if (Array.isArray(node)) {
            // 如果是数组，这里暂时不提示索引，只提示数组本身的属性（通常没有）
            // 或者如果用户输入了 [*] 之后的点，jsonpath-plus 会返回数组内的元素
            // 这里的逻辑主要支持 Object 属性提示
        }
    });

    // 4. 过滤并返回
    return Array.from(suggestions)
        .filter(key => key.toLowerCase().startsWith(prefix.toLowerCase()))
        .sort();

  } catch (e) {
    return [];
  }
}
