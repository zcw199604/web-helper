import type { ToolId } from './tool-modules';

/**
 * Popup 菜单展示配置
 *
 * - `undefined`: 未配置时默认展示全部（与面板一致）
 * - `ToolId[]`: 白名单，只在 Popup 中展示指定模块（顺序按数组定义）
 */
export const popupVisibleToolIds: ToolId[] | undefined = undefined;

