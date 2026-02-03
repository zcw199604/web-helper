import { ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';
import { resolveToolModulesByIds } from '@/utils/tool-modules';
import { popupVisibleToolIds } from '@/utils/ui-config';

function App() {
  const tools = resolveToolModulesByIds(popupVisibleToolIds);
  const version = browser.runtime.getManifest().version;

  // 打开独立工具页面
  const openToolsPage = (toolId?: string) => {
    const url = toolId
      ? browser.runtime.getURL(`/tools.html#/${toolId}`)
      : browser.runtime.getURL('/tools.html');
    browser.tabs.create({ url });
  };

  return (
    <div className="w-80 min-h-[400px] bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 bg-white/90 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
            W
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-slate-900 leading-6 tracking-tight">
              Web Helper
            </div>
            <div className="text-xs text-slate-500 leading-5">
              开发者工具箱
            </div>
          </div>
        </div>

        <button
          onClick={() => openToolsPage()}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors duration-200 active:scale-95"
          title="打开工具面板"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="px-5 py-3 bg-gradient-to-br from-white/70 to-blue-50/40 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Tools
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            点击打开对应工具页面
          </div>
        </div>

        <div className="p-4">
          <div className="space-y-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => openToolsPage(tool.id)}
                  className={cn(
                    'group w-full flex items-start gap-4 px-5 py-4 text-left rounded-2xl',
                    'bg-white ring-1 ring-black/5',
                    'hover:shadow-sm hover:ring-black/10 transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30',
                    'active:scale-[0.99]'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5',
                      'bg-slate-50 text-slate-500 ring-1 ring-slate-200/60 transition-all',
                      'group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:scale-105'
                    )}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-slate-900 leading-6">
                      {tool.name}
                    </div>
                    <div className="mt-1 text-[12px] text-slate-500 leading-5 truncate">
                      {tool.description}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 text-center bg-white/90 backdrop-blur-sm">
        <p className="text-[10px] text-slate-400 font-medium">
          v{version} · Developer Toolbox
        </p>
      </div>
    </div>
  );
}

export default App;
