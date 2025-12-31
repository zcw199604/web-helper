import { useState, useCallback } from 'react';
import { Copy, Check, Trash2, FileJson, ArrowRightLeft, AlignLeft, ShieldCheck, Minimize2 } from 'lucide-react';
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
    <div className="h-full flex flex-col bg-white">
      {/* 顶部工具栏 */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
            <FileJson className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">JSON 格式化</h2>
            <p className="text-xs text-slate-400">格式化、压缩与验证</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
            <label className="text-xs font-medium text-slate-500">缩进:</label>
            <select
              value={indent}
              onChange={(e) => setIndent(Number(e.target.value))}
              className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value={2}>2 空格</option>
              <option value={4}>4 空格</option>
              <option value={1}>1 Tab</option>
            </select>
          </div>
          
          <div className="h-6 w-px bg-slate-200 mx-1" />

          <button onClick={handleFormat} className="btn btn-primary gap-2">
            <AlignLeft className="w-4 h-4" />
            <span>格式化</span>
          </button>
          
          <button onClick={handleMinify} className="btn btn-secondary gap-2">
            <Minimize2 className="w-4 h-4" />
            <span>压缩</span>
          </button>
          
          <button onClick={handleClear} className="btn btn-ghost p-2 text-slate-400 hover:text-red-500">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="px-6 pt-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* 主编辑区 */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-slate-100 min-h-0 overflow-hidden">
        {/* 输入区 */}
        <div className="flex flex-col h-full bg-slate-50/30">
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Input</span>
            <span className="text-xs text-slate-400">{input.length} chars</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="在此粘贴 JSON 内容..."
            className="flex-1 p-4 bg-transparent resize-none font-mono text-sm text-slate-700 focus:outline-none focus:bg-white transition-colors custom-scrollbar leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* 输出区 */}
        <div className="flex flex-col h-full bg-white relative group">
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-white">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Output</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={!output}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all',
                  output
                    ? 'text-slate-600 hover:bg-slate-100 active:scale-95'
                    : 'text-slate-300 cursor-not-allowed'
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-600">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>复制结果</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="等待处理..."
            className="flex-1 p-4 bg-transparent resize-none font-mono text-sm text-slate-700 focus:outline-none custom-scrollbar leading-relaxed selection:bg-blue-100 selection:text-blue-900"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

export default JsonFormatter;