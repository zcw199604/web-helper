import { FileJson, KeyRound, Link, Clock, Binary, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

// 工具列表配置
const tools = [
  {
    id: 'json',
    name: 'JSON 格式化',
    description: '格式化、压缩、验证 JSON',
    icon: FileJson,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'group-hover:border-amber-200',
  },
  {
    id: 'base64',
    name: 'Base64 转换',
    description: '文本与 Base64 互转',
    icon: Binary,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'group-hover:border-blue-200',
  },
  {
    id: 'url',
    name: 'URL 编解码',
    description: 'URL 编码与解码',
    icon: Link,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'group-hover:border-emerald-200',
  },
  {
    id: 'cron',
    name: 'Cron 表达式',
    description: '解析 Cron 定时表达式',
    icon: Clock,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'group-hover:border-purple-200',
  },
  {
    id: 'jwt',
    name: 'JWT 解码',
    description: '解析 JWT Token',
    icon: KeyRound,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'group-hover:border-rose-200',
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
    <div className="w-80 min-h-[400px] bg-slate-50 flex flex-col font-sans">
      {/* 头部 */}
      <div className="bg-white px-5 py-4 border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
              W
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Web Helper</h1>
          </div>
          <button
            onClick={() => openToolsPage()}
            className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
          >
            打开面板
          </button>
        </div>
      </div>

      {/* 工具列表 */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => openToolsPage(tool.id)}
              className={cn(
                'group w-full flex items-center gap-3 p-3 rounded-xl',
                'bg-white border border-slate-200/60 shadow-sm',
                'hover:shadow-md hover:border-slate-300 transition-all duration-200',
                'text-left relative overflow-hidden'
              )}
            >
              <div className={cn('p-2.5 rounded-lg transition-colors duration-200', tool.bgColor, tool.color)}>
                <Icon className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                  {tool.name}
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  {tool.description}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transform group-hover:translate-x-0.5 transition-all" />
            </button>
          );
        })}
      </div>

      {/* 底部 */}
      <div className="p-3 text-center">
        <p className="text-[10px] text-slate-400 font-medium">
          v1.0.0 · Developer Toolbox
        </p>
      </div>
    </div>
  );
}

export default App;