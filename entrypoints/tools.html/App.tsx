import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { cn } from '@/utils/cn';
import { TOOL_MODULES } from '@/utils/tool-modules';

// 导入工具组件
import JsonFormatter from '@/components/JsonFormatter';
import EncodingTools from '@/components/EncodingTools';
import CronParser from '@/components/CronParser';
import JwtDecoder from '@/components/JwtDecoder';
import ApiTester from '@/components/ApiTester';
import CurlToMarkdown from '@/components/CurlToMarkdown';
import WebSocketTool from '@/components/WebSocketTool';

// 导航菜单配置
const navItems = TOOL_MODULES.map((tool) => ({
  path: `/${tool.id}`,
  name: tool.name,
  icon: tool.icon,
}));

function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col text-slate-900">
      {/* 顶部栏 */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="flex items-center h-14 gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
              W
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-slate-900 leading-6 tracking-tight">Web Helper</h1>
              <p className="hidden sm:block text-xs text-slate-500 leading-5">Developer Toolbox</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 w-full p-2 sm:p-3 lg:p-4">
        <div className="flex gap-2 sm:gap-3 lg:gap-6 h-full min-h-0">
          {/* 左侧导航 */}
          <aside className="w-14 sm:w-16 lg:w-64 flex-shrink-0 min-h-0">
            <nav className="bg-white rounded-xl lg:rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden h-full min-h-0 flex flex-col">
              <div className="hidden lg:block p-5 border-b border-slate-100">
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                  工具
                </h2>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto py-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={item.name}
                      aria-label={item.name}
                      className={({ isActive }) =>
                        cn(
                          'group w-full flex items-center justify-center lg:justify-start px-2 py-2.5 lg:px-4 lg:py-3 rounded-xl text-left transition-colors mx-1 lg:mx-2 my-0.5',
                          isActive
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-700 hover:bg-slate-50'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cn(
                              'w-5 h-5 transition-colors flex-shrink-0 lg:mr-3',
                              isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                            )}
                            strokeWidth={2}
                          />
                          <span className="hidden lg:inline font-medium leading-6">{item.name}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>

              <div className="p-2 lg:p-4 border-t border-slate-100">
                <button
                  title="设置"
                  className="w-full flex items-center justify-center lg:justify-start gap-3 px-2 py-2 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <Settings className="w-5 h-5 text-slate-400" />
                  <span className="hidden lg:inline text-sm font-medium">设置</span>
                </button>
              </div>
            </nav>
          </aside>

          {/* 右侧内容区域 */}
          <main className="flex-1 min-w-0 min-h-0">
            <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm ring-1 ring-black/5 h-full min-h-0 overflow-hidden flex flex-col">
              <Routes>
                <Route path="/" element={<Navigate to="/json" replace />} />
                <Route path="/json" element={<JsonFormatter />} />
                <Route path="/encoding" element={<EncodingTools />} />
                <Route path="/cron" element={<CronParser />} />
                <Route path="/jwt" element={<JwtDecoder />} />
                <Route path="/api-tester" element={<ApiTester />} />
                <Route path="/curl-to-md" element={<CurlToMarkdown />} />
                <Route path="/websocket" element={<WebSocketTool />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
