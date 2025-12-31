import { useState, useCallback } from 'react';
import { Copy, Check, Trash2, FileDown, FileUp } from 'lucide-react';
import { formatJson, minifyJson, validateJson } from '@/utils/json';
import { cn } from '@/utils/cn';

function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [indent, setIndent] = useState(2);

  // 格式化
  const handleFormat = useCallback(() => {
    if (!input.trim()) {
      setError('请输入 JSON 内容');
      return;
    }
    const validation = validateJson(input);
    if (!validation.valid) {
      setError(validation.error || '无效的 JSON');
      setOutput('');
      return;
    }
    try {
      setOutput(formatJson(input, indent));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input, indent]);

  // 压缩
  const handleMinify = useCallback(() => {
    if (!input.trim()) {
      setError('请输入 JSON 内容');
      return;
    }
    try {
      setOutput(minifyJson(input));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input]);

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
    setError(null);
  }, []);

  return (
    <div className="h-full flex flex-col p-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">JSON 格式化</h2>
          <p className="text-sm text-gray-500">格式化、压缩、验证 JSON 数据</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">缩进:</label>
          <select
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value={2}>2 空格</option>
            <option value={4}>4 空格</option>
            <option value={1}>1 Tab</option>
          </select>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleFormat}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          格式化
        </button>
        <button
          onClick={handleMinify}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          压缩
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
            placeholder="在此粘贴 JSON..."
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
            placeholder="格式化结果将显示在这里..."
            className="flex-1 p-4 bg-gray-50 border border-gray-300 rounded-lg resize-none font-mono text-sm focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

export default JsonFormatter;
