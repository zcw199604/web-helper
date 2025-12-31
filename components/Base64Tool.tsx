import { useState, useCallback } from 'react';
import { Copy, Check, Trash2, ArrowDownUp } from 'lucide-react';
import { encodeBase64, decodeBase64, isValidBase64 } from '@/utils/base64';
import { cn } from '@/utils/cn';

function Base64Tool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');

  // 执行转换
  const handleConvert = useCallback(() => {
    if (!input.trim()) {
      setError('请输入内容');
      return;
    }
    try {
      if (mode === 'encode') {
        setOutput(encodeBase64(input));
      } else {
        if (!isValidBase64(input)) {
          setError('无效的 Base64 格式');
          return;
        }
        setOutput(decodeBase64(input));
      }
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input, mode]);

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
    setError(null);
  }, []);

  return (
    <div className="h-full flex flex-col p-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Base64 转换</h2>
          <p className="text-sm text-gray-500">文本与 Base64 编码互转</p>
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
            <span className="text-sm font-medium text-gray-700">
              {mode === 'encode' ? '原始文本' : 'Base64 编码'}
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? '输入要编码的文本...' : '输入 Base64 编码...'}
            className="flex-1 p-4 border border-gray-300 rounded-lg resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 输出区 */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {mode === 'encode' ? 'Base64 编码' : '原始文本'}
            </span>
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
    </div>
  );
}

export default Base64Tool;
