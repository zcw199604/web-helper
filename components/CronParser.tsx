import { useState, useCallback } from 'react';
import { Copy, Check, Trash2, Play } from 'lucide-react';
import { getNextExecutions, cronToHuman, validateCron, CRON_EXAMPLES } from '@/utils/cron';
import { cn } from '@/utils/cn';

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
    <div className="h-full flex flex-col p-6 overflow-auto">
      {/* 标题栏 */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">Cron 表达式解析</h2>
        <p className="text-sm text-gray-500">解析 Cron 表达式，查看执行时间</p>
      </div>

      {/* 输入区域 */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleParse()}
            placeholder="输入 Cron 表达式，如: 0 0 * * *"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleParse}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-1"
          >
            <Play className="w-4 h-4" />
            解析
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            清空
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          格式: 分 时 日 月 周 (支持 5 位或 6 位表达式)
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 解析结果 */}
      {description && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-600">含义: </span>
              <span className="font-medium text-green-700">{description}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded text-sm text-gray-600 hover:bg-green-100"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>复制</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 下次执行时间 */}
      {nextTimes.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">接下来 10 次执行时间</h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">序号</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">执行时间</th>
                </tr>
              </thead>
              <tbody>
                {nextTimes.map((time, index) => (
                  <tr key={index} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-2 font-mono text-gray-700">{formatDate(time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 常用示例 */}
      <div className="mt-auto">
        <h3 className="text-sm font-medium text-gray-700 mb-2">常用表达式</h3>
        <div className="grid grid-cols-2 gap-2">
          {CRON_EXAMPLES.map((example, index) => (
            <button
              key={index}
              onClick={() => handleUseExample(example.expression)}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
            >
              <span className="font-mono text-sm text-blue-600">{example.expression}</span>
              <span className="text-xs text-gray-500">{example.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CronParser;
