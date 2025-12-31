import { FileJson, KeyRound, Link, Clock, Binary } from 'lucide-react';
import { cn } from '@/utils/cn';

// 工具列表配置
const tools = [
  {
    id: 'json',
    name: 'JSON 格式化',
    description: '格式化、压缩、验证 JSON',
    icon: FileJson,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'base64',
    name: 'Base64 转换',
    description: '文本与 Base64 互转',
    icon: Binary,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'url',
    name: 'URL 编解码',
    description: 'URL 编码与解码',
    icon: Link,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
  {
    id: 'cron',
    name: 'Cron 表达式',
    description: '解析 Cron 定时表达式',
    icon: Clock,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'jwt',
    name: 'JWT 解码',
    description: '解析 JWT Token',
    icon: KeyRound,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
];

function App() {
  // 打开独立工具页面
  const openToolsPage = (toolId?: string) => {
    const url = toolId
      ? browser.runtime.getURL(`/tools.html#/${toolId}`)
      : browser.runtime.getURL('/tools.html');
    browser.tabs.create({ url });
  };

  return (
    <div className="w-80 p-4 bg-white">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800">Web Helper</h1>
        <button
          onClick={() => openToolsPage()}
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          打开全部
        </button>
      </div>

      {/* 工具列表 */}
      <div className="space-y-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => openToolsPage(tool.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg',
                'border border-gray-100 hover:border-gray-200',
                'hover:bg-gray-50 transition-colors',
                'text-left'
              )}
            >
              <div className={cn('p-2 rounded-lg', tool.bgColor)}>
                <Icon className={cn('w-5 h-5', tool.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 text-sm">
                  {tool.name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {tool.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 底部 */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          v1.0.0 · 开发者工具箱
        </p>
      </div>
    </div>
  );
}

export default App;
