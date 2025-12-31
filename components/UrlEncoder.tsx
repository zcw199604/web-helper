import { useState, useCallback } from 'react';
import { Copy, Check, Trash2, ArrowDownUp, Link, ArrowRightLeft, List } from 'lucide-react';
import { encodeUrl, decodeUrl, parseQueryParams } from '@/utils/url';
import { cn } from '@/utils/cn';

function UrlEncoder() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [params, setParams] = useState<Record<string, string>>({});
  const [showParams, setShowParams] = useState(false);

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
        const decoded = decodeUrl(input);
        setOutput(decoded);
        // 尝试自动解析参数
        try {
           const parsed = parseQueryParams(decoded);
           if (Object.keys(parsed).length > 0) {
             setParams(parsed);
             setShowParams(true);
           } else {
             setShowParams(false);
           }
        } catch {}
      }
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input, mode]);

  // 手动解析参数
  const handleParseParams = useCallback(() => {
    if (!input.trim()) return;
    try {
      const parsed = parseQueryParams(input);
      setParams(parsed);
      setShowParams(true);
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
    setShowParams(false);
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
    setShowParams(false);
    setError(null);
  }, []);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部工具栏 */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
            <Link className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">URL 编解码</h2>
            <p className="text-xs text-slate-400">URL 编码、解码与参数解析</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
             <button
              onClick={() => setMode('encode')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                mode === 'encode'
                  ? 'bg-white text-emerald-600 shadow-sm'
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
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              解码
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <button onClick={handleConvert} className="btn btn-primary gap-2 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500">
            <ArrowRightLeft className="w-4 h-4" />
            <span>{mode === 'encode' ? '编码' : '解码'}</span>
          </button>

          <button 
            onClick={handleParseParams} 
            className="btn btn-secondary gap-2"
            title="解析 URL 参数"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">参数</span>
          </button>
          
           <button 
            onClick={handleSwap} 
            disabled={!output}
            className="btn btn-secondary gap-2"
          >
            <ArrowDownUp className="w-4 h-4" />
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
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Input</span>
            <span className="text-xs text-slate-400">{input.length} chars</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="在此输入 URL..."
            className="flex-1 p-4 bg-transparent resize-none font-mono text-sm text-slate-700 focus:outline-none focus:bg-white transition-colors custom-scrollbar leading-relaxed"
          />
        </div>

        {/* 输出区 */}
        <div className="flex flex-col h-full bg-white relative">
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-white">
             <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Output</span>
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
          
          <div className="flex-1 relative overflow-hidden flex flex-col">
              <textarea
                value={output}
                readOnly
                placeholder="结果..."
                className={cn(
                    "flex-1 p-4 bg-transparent resize-none font-mono text-sm text-slate-700 focus:outline-none custom-scrollbar leading-relaxed selection:bg-emerald-100 selection:text-emerald-900",
                    showParams ? "h-1/2 border-b border-slate-100" : "h-full"
                )}
              />
              
              {/* 参数列表面板 */}
              {showParams && (
                <div className="flex-1 bg-slate-50 flex flex-col min-h-0 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                         <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">URL Parameters</span>
                         <button onClick={() => setShowParams(false)} className="text-slate-400 hover:text-slate-600">
                             <span className="text-xs">Close</span>
                         </button>
                    </div>
                    <div className="overflow-y-auto p-0">
                        {Object.entries(params).map(([key, value], i) => (
                        <div key={key} className={cn("flex px-4 py-2 hover:bg-white transition-colors text-sm border-b border-slate-100 last:border-0", i % 2 === 0 ? "bg-slate-50/50" : "")}>
                            <span className="font-medium text-emerald-600 w-1/3 break-all pr-2">{key}</span>
                            <span className="text-slate-700 font-mono w-2/3 break-all select-all">{value}</span>
                        </div>
                        ))}
                    </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UrlEncoder;