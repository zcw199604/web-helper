import { ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { resolveToolModulesByIds } from '@/utils/tool-modules';
import { popupVisibleToolIds } from '@/utils/ui-config';

function App() {
  const tools = resolveToolModulesByIds(popupVisibleToolIds);

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
              <div
                className={cn(
                  'p-2.5 rounded-lg transition-colors duration-200',
                  tool.popupStyle.bgColor,
                  tool.popupStyle.color
                )}
              >
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
          v1.2.2 · Developer Toolbox
        </p>
      </div>
    </div>
  );
}

export default App;
