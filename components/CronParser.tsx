import { useState, useCallback } from 'react';
import { Copy, Check, Trash2, Play, Clock, CalendarDays, History } from 'lucide-react';
import { getNextExecutions, cronToHuman, validateCron, CRON_EXAMPLES } from '@/utils/cron';
import { cn } from '@/utils/cn';
import { ToolHeader, ToolMain, ToolPageShell } from '@/components/ui/ToolLayout';

function CronParser() {
  const [input, setInput] = useState('');
  const [description, setDescription] = useState('');
  const [nextTimes, setNextTimes] = useState<Date[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 解析 Cron 表达式
  const handleParse = useCallback(() => {
    if (!input.trim()) {
      setError('请输入 Cron 表达式');
      return;
    }
    const validation = validateCron(input);
    if (!validation.valid) {
      setError(validation.error || '无效的 Cron 表达式');
      setDescription('');
      setNextTimes([]);
      return;
    }
    try {
      setDescription(cronToHuman(input));
      setNextTimes(getNextExecutions(input, 10));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input]);

  // 使用示例
  const handleUseExample = useCallback((expression: string) => {
    setInput(expression);
    setError(null);
    // 自动触发解析
    try {
        setDescription(cronToHuman(expression));
        setNextTimes(getNextExecutions(expression, 10));
    } catch {}
  }, []);

  // 复制
  const handleCopy = useCallback(async () => {
    if (!description) return;
    await navigator.clipboard.writeText(description);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [description]);

  // 清空
  const handleClear = useCallback(() => {
    setInput('');
    setDescription('');
    setNextTimes([]);
    setError(null);
  }, []);

  // 格式化时间
  const formatDate = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
  };

  return (
    <ToolPageShell>
      <ToolHeader
        title="Cron 表达式"
        description="解析 Cron 表达式与执行时间预测"
        icon={<Clock className="w-5 h-5" />}
        iconClassName="bg-purple-50 text-purple-600"
        actions={
          <>
            <button
              onClick={handleParse}
              className="btn btn-primary bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 gap-2"
            >
              <Play className="w-4 h-4" />
              <span>解析</span>
            </button>
            <button onClick={handleClear} className="btn btn-ghost p-2 text-gray-400 hover:text-red-500">
              <Trash2 className="w-5 h-5" />
            </button>
          </>
        }
      />

      <ToolMain className="overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
            
            {/* 输入区 */}
            <div className="space-y-3">
                 <label className="text-sm font-semibold text-slate-700 ml-1">表达式输入</label>
                 <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                        placeholder="输入 Cron 表达式，如: 0 0 * * *"
                        className="w-full px-5 py-4 text-lg font-mono border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-700 placeholder:text-slate-300"
                    />
                 </div>
                  <div className="flex items-start gap-2 text-xs text-slate-500 px-1">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">Format</span>
                    <span>分 时 日 月 周 (支持 5 位或 6 位表达式)</span>
                 </div>
            </div>

            {/* 错误提示 */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {error}
                </div>
            )}

            {/* 结果展示区 */}
            {(description || nextTimes.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* 左侧：语义描述 */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                            <CalendarDays className="w-4 h-4 text-purple-500" />
                            <span>执行规则</span>
                        </div>
                        <div className="p-6 bg-purple-50/50 border border-purple-100 rounded-2xl relative group">
                             <p className="text-lg text-purple-900 font-medium leading-relaxed pr-8">
                                {description}
                             </p>
                             <button
                                onClick={handleCopy}
                                className="absolute top-4 right-4 p-2 rounded-lg text-purple-400 hover:text-purple-700 hover:bg-purple-100 transition-colors opacity-0 group-hover:opacity-100"
                                title="复制描述"
                             >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                             </button>
                        </div>
                    </div>

                    {/* 右侧：下次执行时间 */}
                     <div className="space-y-4">
                         <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                            <History className="w-4 h-4 text-purple-500" />
                            <span>接下来 5 次执行时间</span>
                        </div>
                         <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="divide-y divide-slate-100">
                                {nextTimes.slice(0, 5).map((time, index) => (
                                    <div key={index} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <span className="text-xs font-medium text-slate-400 w-8">#{index + 1}</span>
                                        <span className="font-mono text-sm text-slate-600">{formatDate(time)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

             {/* 常用示例 */}
             <div className="pt-8 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">常用表达式示例</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {CRON_EXAMPLES.map((example, index) => (
                        <button
                        key={index}
                        onClick={() => handleUseExample(example.expression)}
                        className="flex flex-col items-start p-3 bg-white border border-slate-200 rounded-xl hover:border-purple-300 hover:shadow-md hover:shadow-purple-100/50 transition-all text-left group"
                        >
                        <span className="font-mono text-sm text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded mb-1.5 group-hover:bg-purple-100 transition-colors">
                            {example.expression}
                        </span>
                        <span className="text-xs text-slate-500 group-hover:text-slate-600">{example.description}</span>
                        </button>
                    ))}
                </div>
            </div>

        </div>
      </ToolMain>
    </ToolPageShell>
  );
}

export default CronParser;
