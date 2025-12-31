import { useState, useCallback } from 'react';
import { Copy, Check, Trash2, ArrowDownUp, Binary, ArrowRightLeft } from 'lucide-react';
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
    <div className="h-full flex flex-col bg-white">
      {/* 顶部工具栏 */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <Binary className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Base64 转换</h2>
            <p className="text-xs text-slate-400">文本与 Base64 编码互转</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
             <button
              onClick={() => setMode('encode')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                mode === 'encode'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              编码
            </button>
            <button
              onClick={() => setMode('decode')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                mode === 'decode'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              解码
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <button onClick={handleConvert} className="btn btn-primary gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            <span>{mode === 'encode' ? '编码' : '解码'}</span>
          </button>

          <button 
            onClick={handleSwap} 
            disabled={!output}
            className="btn btn-secondary gap-2"
          >
            <ArrowDownUp className="w-4 h-4" />
            <span>交换</span>
          </button>
          
          <button onClick={handleClear} className="btn btn-ghost p-2 text-slate-400 hover:text-red-500">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="px-6 pt-4">
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        </div>
      )}

      {/* 主编辑区 */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-slate-100 min-h-0 overflow-hidden">
        {/* 输入区 */}
        <div className="flex flex-col h-full bg-slate-50/30">
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {mode === 'encode' ? 'Input Text' : 'Input Base64'}
            </span>
            <span className="text-xs text-slate-400">{input.length} chars</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? '输入要编码的文本...' : '输入 Base64 编码...'}
            className="flex-1 p-4 bg-transparent resize-none font-mono text-sm text-slate-700 focus:outline-none focus:bg-white transition-colors custom-scrollbar leading-relaxed"
          />
        </div>

        {/* 输出区 */}
        <div className="flex flex-col h-full bg-white group">
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-white">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
               {mode === 'encode' ? 'Base64 Output' : 'Text Output'}
            </span>
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
          <textarea
            value={output}
            readOnly
            placeholder="转换结果..."
            className="flex-1 p-4 bg-transparent resize-none font-mono text-sm text-slate-700 focus:outline-none custom-scrollbar leading-relaxed selection:bg-blue-100 selection:text-blue-900"
          />
        </div>
      </div>
    </div>
  );
}

export default Base64Tool;