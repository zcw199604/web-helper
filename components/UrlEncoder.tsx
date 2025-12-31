import { useState, useCallback } from 'react';
import { Copy, Check, Trash2, ArrowDownUp } from 'lucide-react';
import { encodeUrl, decodeUrl, parseQueryParams, buildQueryString } from '@/utils/url';
import { cn } from '@/utils/cn';

function UrlEncoder() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [params, setParams] = useState<Record<string, string>>({});

  // 执行转换
  const handleConvert = useCallback(() => {
    if (!input.trim()) {
      setError('请输入内容');
      return;
    }
    try {
      if (mode === 'encode') {
        setOutput(encodeUrl(input));
      } else {
        setOutput(decodeUrl(input));
      }
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input, mode]);

  // 解析 URL 参数
  const handleParseParams = useCallback(() => {
    if (!input.trim()) {
      setError('请输入 URL');
      return;
    }
    try {
      const parsed = parseQueryParams(input);
      setParams(parsed);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input]);

  // 交换输入输出
  const handleSwap = useCallback(() => {
    setInput(output);
    setOutput('');
    setMode(mode === 'encode' ? 'decode' : 'encode');
    setError(null);
  }, [output, mode]);

  // 复制
  const handleCopy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  // 清空
  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setParams({});
    setError(null);
  }, []);

  return (
    <div className="h-full flex flex-col p-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">URL 编解码</h2>
          <p className="text-sm text-gray-500">URL 编码、解码、参数解析</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('encode')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              mode === 'encode'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            编码
          </button>
          <button
            onClick={() => setMode('decode')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              mode === 'decode'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            解码
          </button>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleConvert}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          {mode === 'encode' ? '编码' : '解码'}
        </button>
        <button
          onClick={handleParseParams}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
        >
          解析参数
        </button>
        <button
          onClick={handleSwap}
          disabled={!output}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1 disabled:opacity-50"
        >
          <ArrowDownUp className="w-4 h-4" />
          交换
        </button>
        <button
          onClick={handleClear}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
          清空
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 编辑区域 */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* 输入区 */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">输入</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入 URL 或文本..."
            className="flex-1 p-4 border border-gray-300 rounded-lg resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 输出区 */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">输出</span>
            <button
              onClick={handleCopy}
              disabled={!output}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-sm',
                output
                  ? 'text-gray-600 hover:bg-gray-100'
                  : 'text-gray-400 cursor-not-allowed'
              )}
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
          <textarea
            value={output}
            readOnly
            placeholder="转换结果将显示在这里..."
            className="flex-1 p-4 bg-gray-50 border border-gray-300 rounded-lg resize-none font-mono text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* URL 参数展示 */}
      {Object.keys(params).length > 0 && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">URL 参数</h3>
          <div className="space-y-1">
            {Object.entries(params).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-blue-600">{key}:</span>
                <span className="text-gray-700 font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UrlEncoder;
