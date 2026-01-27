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

// 导航菜单配置
const navItems = TOOL_MODULES.map((tool) => ({
  path: `/${tool.id}`,
  name: tool.name,
  icon: tool.icon,
}));

function App() {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* 侧边栏 */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10">
        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
              W
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">Web Helper</h1>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Developer Tools</p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          <div className="text-xs font-semibold text-slate-400 px-3 py-2 uppercase tracking-wider">
            Tools
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('w-5 h-5 transition-colors', isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600')} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={cn('text-sm font-medium', isActive ? 'font-semibold' : '')}>{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* 底部 */}
        <div className="p-4 border-t border-slate-100">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <Settings className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium">设置</span>
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 h-full overflow-hidden flex flex-col">
              <Routes>
                <Route path="/" element={<Navigate to="/json" replace />} />
                <Route path="/json" element={<JsonFormatter />} />
                <Route path="/encoding" element={<EncodingTools />} />
                <Route path="/cron" element={<CronParser />} />
                <Route path="/jwt" element={<JwtDecoder />} />
                <Route path="/api-tester" element={<ApiTester />} />
                <Route path="/curl-to-md" element={<CurlToMarkdown />} />
              </Routes>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
