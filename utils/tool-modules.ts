import type { LucideIcon } from 'lucide-react';
import {
  FileJson,
  KeyRound,
  Clock,
  Settings2,
  Network,
  FileText,
  Cable,
  FileSpreadsheet,
} from 'lucide-react';

export type ToolId =
  | 'json'
  | 'excel-converter'
  | 'encoding'
  | 'cron'
  | 'jwt'
  | 'api-tester'
  | 'curl-to-md'
  | 'websocket';

export type ToolModule = {
  id: ToolId;
  name: string;
  description: string;
  icon: LucideIcon;
  popupStyle: {
    color: string;
    bgColor: string;
  };
};

export const TOOL_MODULES: ToolModule[] = [
  {
    id: 'json',
    name: 'JSON 格式化',
    description: '格式化、压缩、验证 JSON',
    icon: FileJson,
    popupStyle: {
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  },
  {
    id: 'excel-converter',
    name: 'Excel 转换',
    description: '粘贴/导入 Excel 数据，导出 JSON / SQL / XML',
    icon: FileSpreadsheet,
    popupStyle: {
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  },
  {
    id: 'encoding',
    name: '编码转换',
    description: 'Unicode / URL / Base64 / HTML / Gzip / Hash 等',
    icon: Settings2,
    popupStyle: {
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  },
  {
    id: 'cron',
    name: 'Cron 表达式',
    description: '解析 Cron 定时表达式',
    icon: Clock,
    popupStyle: {
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  },
  {
    id: 'jwt',
    name: 'JWT 解码',
    description: '解析 JWT Token',
    icon: KeyRound,
    popupStyle: {
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
  },
  {
    id: 'api-tester',
    name: 'API 调试',
    description: '调试 HTTP API 请求',
    icon: Network,
    popupStyle: {
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  },
  {
    id: 'websocket',
    name: 'WebSocket 调试',
    description: '连接、发送与接收消息',
    icon: Cable,
    popupStyle: {
      color: 'text-cyan-700',
      bgColor: 'bg-cyan-50',
    },
  },
  {
    id: 'curl-to-md',
    name: 'cURL / fetch → Markdown',
    description: '把请求转换成 Markdown 文档',
    icon: FileText,
    popupStyle: {
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
  },
];

export function resolveToolModulesByIds(
  visibleIds: readonly string[] | undefined,
  tools: readonly ToolModule[] = TOOL_MODULES,
): ToolModule[] {
  if (!visibleIds) return [...tools];

  const toolById = new Map<string, ToolModule>(tools.map((tool) => [tool.id, tool]));
  const resolved: ToolModule[] = [];

  for (const id of visibleIds) {
    const tool = toolById.get(id);
    if (tool) resolved.push(tool);
  }

  return resolved;
}
