import { useState, useCallback } from 'react';
import { Copy, Check, Trash2, ArrowDownUp, Binary, Link, List, Settings2 } from 'lucide-react';
import { encodeBase64, decodeBase64, isValidBase64 } from '@/utils/base64';
import { encodeUrl, decodeUrl, parseQueryParams } from '@/utils/url';
import { cn } from '@/utils/cn';

function EncodingTools() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // URL 参数相关状态
  const [params, setParams] = useState<Record<string, string>>({});
  const [showParams, setShowParams] = useState(false);

  // 通用处理函数
  const handleAction = useCallback((action: (val: string) => string, validate?: (val: string) => boolean, errorMsg?: string) => {
    if (!input.trim()) {
      setError('请输入内容');
      return;
    }
    if (validate && !validate(input)) {
      setError(errorMsg || '输入格式无效');
      return;
    }
    try {
      const result = action(input);
      setOutput(result);
      setError(null);
      // 如果是 URL 操作，顺便尝试解析参数，但不强制显示
      // 如果不是 URL 操作，隐藏参数面板
      setShowParams(false); 
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input]);

  // Base64
  const handleBase64Encode = () => handleAction(encodeBase64);
  const handleBase64Decode = () => handleAction(decodeBase64, isValidBase64, '无效的 Base64 字符串');

  // URL
  const handleUrlEncode = () => handleAction(encodeUrl);
  const handleUrlDecode = () => {
      handleAction((val) => {
          const res = decodeUrl(val);
          // 尝试自动解析参数
          try {
            const parsed = parseQueryParams(res);
            if (Object.keys(parsed).length > 0) {
                setParams(parsed);
                // 这里可以选择是否自动展开，暂不自动展开以免干扰，除非是专门点了解析
            }
          } catch {}
          return res;
      });
  };

  // 单独解析 URL 参数
  const handleParseParams = useCallback(() => {
    if (!input.trim()) return;
    try {
      // 优先解析 output，如果没有 output 则解析 input
      // 实际上用户可能想解析输入框里的 URL
      const target = input; 
      const parsed = parseQueryParams(target);
      setParams(parsed);
      setShowParams(true);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [input]);

  // 交换
  const handleSwap = useCallback(() => {
    setInput(output);
    setOutput('');
    setError(null);
    setShowParams(false);
  }, [output]);

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
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col gap-4 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">编码转换</h2>
              <p className="text-xs text-slate-400">Base64 / URL 编码与解码</p>
            </div>
          </div>
        </div>

        {/* 操作按钮组 */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Base64 Group */}
          <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
             <div className="px-2 text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Binary className="w-3.5 h-3.5" />
                Base64
             </div>
             <div className="w-px h-4 bg-slate-200 mx-1"></div>
             <button onClick={handleBase64Encode} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition-all">
                编码
             </button>
             <button onClick={handleBase64Decode} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition-all">
                解码
             </button>
          </div>

          {/* URL Group */}
          <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
             <div className="px-2 text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Link className="w-3.5 h-3.5" />
                URL
             </div>
             <div className="w-px h-4 bg-slate-200 mx-1"></div>
             <button onClick={handleUrlEncode} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-emerald-600 hover:bg-white rounded-md transition-all">
                编码
             </button>
             <button onClick={handleUrlDecode} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-emerald-600 hover:bg-white rounded-md transition-all">
                解码
             </button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <button 
            onClick={handleParseParams} 
            className="btn btn-secondary gap-2 px-3 py-1.5 text-xs"
            title="解析 URL 参数"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">参数</span>
          </button>

          <button 
            onClick={handleSwap} 
            disabled={!output}
            className="btn btn-secondary gap-2 px-3 py-1.5 text-xs"
            title="交换输入输出"
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
            placeholder="在此输入文本或 URL..."
            className="flex-1 p-4 bg-transparent resize-none font-mono text-sm text-slate-700 focus:outline-none focus:bg-white transition-colors custom-scrollbar leading-relaxed"
          />
        </div>

        {/* 输出区 */}
        <div className="flex flex-col h-full bg-white relative group">
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
                    "flex-1 p-4 bg-transparent resize-none font-mono text-sm text-slate-700 focus:outline-none custom-scrollbar leading-relaxed selection:bg-indigo-100 selection:text-indigo-900",
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

export default EncodingTools;
