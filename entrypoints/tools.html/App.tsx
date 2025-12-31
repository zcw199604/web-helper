import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { FileJson, KeyRound, Link, Clock, Binary } from 'lucide-react';
import { cn } from '@/utils/cn';

// 导入工具组件
import JsonFormatter from '@/components/JsonFormatter';
import Base64Tool from '@/components/Base64Tool';
import UrlEncoder from '@/components/UrlEncoder';
import CronParser from '@/components/CronParser';
import JwtDecoder from '@/components/JwtDecoder';

// 导航菜单配置
const navItems = [
  { path: '/json', name: 'JSON 格式化', icon: FileJson, color: 'text-amber-500' },
  { path: '/base64', name: 'Base64 转换', icon: Binary, color: 'text-blue-500' },
  { path: '/url', name: 'URL 编解码', icon: Link, color: 'text-green-500' },
  { path: '/cron', name: 'Cron 表达式', icon: Clock, color: 'text-purple-500' },
  { path: '/jwt', name: 'JWT 解码', icon: KeyRound, color: 'text-red-500' },
];

function App() {
  return (
    <div className="flex h-screen">
      {/* 侧边栏 */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-800">Web Helper</h1>
          <p className="text-xs text-gray-500">开发者工具箱</p>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    'hover:bg-gray-100',
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700'
                  )
                }
              >
                <Icon className={cn('w-5 h-5', item.color)} />
                <span className="text-sm">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">v1.0.0</p>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/json" replace />} />
          <Route path="/json" element={<JsonFormatter />} />
          <Route path="/base64" element={<Base64Tool />} />
          <Route path="/url" element={<UrlEncoder />} />
          <Route path="/cron" element={<CronParser />} />
          <Route path="/jwt" element={<JwtDecoder />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
