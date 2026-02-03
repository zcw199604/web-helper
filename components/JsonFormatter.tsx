import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Copy, Check, Trash2, FileJson, AlignLeft, Minimize2, ShieldCheck, Code2, Network, Download, Search, X } from 'lucide-react';
import { formatJson, minifyJson, validateJson, queryJsonPath, getJsonPathSuggestions } from '@/utils/json';
import { cn } from '@/utils/cn';
import { JsonTree } from '@/components/ui/JsonTree';
import { ToolHeader, ToolMain, ToolPageShell } from '@/components/ui/ToolLayout';

function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [indent, setIndent] = useState(2);
  const [viewMode, setViewMode] = useState<'code' | 'tree'>('tree');
  
  // JSONPath 相关状态
  const [showQuery, setShowQuery] = useState(false);
  const [queryInput, setQueryInput] = useState('$.');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [autoClearQuery, setAutoClearQuery] = useState(true);
  
  // 自动补全相关状态
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const queryInputRef = useRef<HTMLInputElement>(null);

  // 源数据，基于 input，用于智能提示
  const sourceData = useMemo(() => {
    if (!input) return null;
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  }, [input]);

  // 展示数据，基于 output，用于 Tree View
  const displayData = useMemo(() => {
    if (!output) return null;
    try {
      return JSON.parse(output);
    } catch {
      return null;
    }
  }, [output]);

  // 当 input 变化时，如果 autoClearQuery 为 true，重置查询
  // 为了避免初始渲染或微小变动都重置，我们只在 input 存在且发生变化时触发
  // 这里简化逻辑：只要 input 变了，且 autoClearQuery 开着，就重置。
  useEffect(() => {
     if (autoClearQuery && input) {
         setQueryInput('$.');
         // 可选：如果希望重置后关闭查询栏，取消下面注释
         // setShowQuery(false); 
     }
  }, [input, autoClearQuery]);

  // 处理内容更新（包含格式化和查询逻辑）
  const updateOutput = useCallback((currentInput: string, currentIndent: number, isQueryActive: boolean, currentQuery: string) => {
    if (!currentInput.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    // 基础验证
    const validation = validateJson(currentInput);
    if (!validation.valid) {
      setError(validation.error || '无效的 JSON');
      setOutput('');
      return;
    }

    try {
      setError(null);
      setQueryError(null);
      
      // 如果处于查询模式且有查询语句
      if (isQueryActive && currentQuery && currentQuery.trim() !== '$' && currentQuery.trim() !== '$.') {
        try {
           const result = queryJsonPath(currentInput, currentQuery);
           setOutput(JSON.stringify(result, null, currentIndent));
        } catch (e) {
           setQueryError('无效的 JSONPath 表达式');
           setOutput('[]'); 
        }
      } else {
        // 普通格式化模式
        setOutput(formatJson(currentInput, currentIndent));
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // 监听输入、缩进、查询模式的变化
  useEffect(() => {
    const timer = setTimeout(() => {
        updateOutput(input, indent, showQuery, queryInput);
    }, 300); // 防抖
    return () => clearTimeout(timer);
  }, [input, indent, showQuery, queryInput, updateOutput]);

  // 处理查询输入变化，生成建议 (使用 sourceData)
  useEffect(() => {
    if (showQuery && sourceData && queryInput) {
        const newSuggestions = getJsonPathSuggestions(sourceData, queryInput);
        setSuggestions(newSuggestions);
        setShowSuggestions(newSuggestions.length > 0);
        setActiveSuggestionIndex(0);
    } else {
        setSuggestions([]);
        setShowSuggestions(false);
    }
  }, [queryInput, showQuery, sourceData]);

  // 应用建议
  const applySuggestion = (suggestion: string) => {
    const lastDotIndex = queryInput.lastIndexOf('.');
    if (lastDotIndex !== -1) {
        const basePath = queryInput.substring(0, lastDotIndex + 1);
        const newQuery = basePath + suggestion;
        setQueryInput(newQuery);
    } else {
        // 可能是刚开始输入，例如 "$"
         setQueryInput('$.' + suggestion);
    }
    setShowSuggestions(false);
    queryInputRef.current?.focus();
  };

  // 处理键盘事件（上下键选择建议）
  const handleQueryKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        applySuggestion(suggestions[activeSuggestionIndex]);
    } else if (e.key === 'Escape') {
        setShowSuggestions(false);
    }
  };


  // 手动触发格式化
  const handleFormat = useCallback(() => {
    setShowQuery(false); // 退出查询模式
    updateOutput(input, indent, false, '');
  }, [input, indent, updateOutput]);

  // 压缩
  const handleMinify = useCallback(() => {
    if (!input.trim()) {
      setError('请输入 JSON 内容');
      return;
    }
    try {
      setOutput(minifyJson(input));
      setError(null);
      setShowQuery(false);
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

  // 下载整个 JSON
  const handleDownloadFull = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = showQuery ? 'query-result.json' : 'formatted.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [output, showQuery]);

  // 清空
  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setError(null);
    setQueryError(null);
    setQueryInput('$.');
  }, []);

  // 填充 Path 到查询框
  const handleFillPath = useCallback((path: string) => {
    setQueryInput(path);
    setShowQuery(true);
  }, []);

  return (
    <ToolPageShell>
      <ToolHeader
        title="JSON 格式化"
        description="格式化、验证与 JSONPath 查询"
        icon={<FileJson className="w-5 h-5" />}
        iconClassName="bg-amber-50 text-amber-600"
        actions={
          <>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <label className="text-xs font-medium text-gray-500">缩进:</label>
              <select
                value={indent}
                onChange={(e) => setIndent(Number(e.target.value))}
                className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value={2}>2 空格</option>
                <option value={4}>4 空格</option>
                <option value={1}>1 Tab</option>
              </select>
              <div className="w-px h-4 bg-gray-200 mx-1"></div>
              <label
                className="flex items-center gap-1.5 cursor-pointer text-xs select-none"
                title="重新输入 JSON 时自动清空查询条件"
              >
                <input
                  type="checkbox"
                  checked={autoClearQuery}
                  onChange={(e) => setAutoClearQuery(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-600">重置查询</span>
              </label>
            </div>

            <div className="hidden lg:block h-6 w-px bg-gray-200 mx-1" />

            <button onClick={handleFormat} className="btn btn-primary gap-2">
              <AlignLeft className="w-4 h-4" />
              <span>格式化</span>
            </button>

            <button onClick={handleMinify} className="btn btn-secondary gap-2">
              <Minimize2 className="w-4 h-4" />
              <span>压缩</span>
            </button>

            <button
              onClick={() => setShowQuery(!showQuery)}
              className={cn(
                'btn gap-2 transition-all',
                showQuery
                  ? 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200'
                  : 'btn-secondary'
              )}
            >
              <Search className="w-4 h-4" />
              <span>查询</span>
            </button>

            <button onClick={handleClear} className="btn btn-ghost p-2 text-gray-400 hover:text-red-500">
              <Trash2 className="w-5 h-5" />
            </button>
          </>
        }
        toolbar={
          showQuery ? (
            <div className="animate-in slide-in-from-top-2 duration-200 relative">
                <div className="relative flex items-center">
                     <input 
                        ref={queryInputRef}
                        type="text"
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        onKeyDown={handleQueryKeyDown}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // 延迟隐藏以允许点击
                        placeholder="输入 JSONPath (例如: $.store.book[*])"
                        className={cn(
                            "w-full pl-3 pr-10 py-2.5 bg-slate-50 border rounded-lg font-mono text-sm text-slate-700 focus:outline-none focus:ring-2 transition-all",
                            queryError 
                                ? "border-red-300 focus:ring-red-200" 
                                : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                        )}
                        autoComplete="off"
                     />
                     {queryInput !== '$.' && (
                        <button 
                            onClick={() => setQueryInput('$.')}
                            className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                     )}
                </div>
                
                {/* 智能提示下拉列表 */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={suggestion}
                                onClick={() => applySuggestion(suggestion)}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm font-mono hover:bg-blue-50 transition-colors flex items-center gap-2",
                                    index === activeSuggestionIndex ? "bg-blue-50 text-blue-700" : "text-slate-700"
                                )}
                            >
                                <span className="text-slate-400">.</span>
                                <span>{suggestion}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex justify-between mt-1.5 px-1">
                     <span className={cn("text-xs", queryError ? "text-red-500 font-medium" : "text-slate-400")}>
                        {queryError || "支持标准的 JSONPath 语法"}
                     </span>
                     <a 
                        href="https://github.com/JSONPath-Plus/JSONPath" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
                    >
                        语法参考
                     </a>
                </div>
            </div>
          ) : null
        }
      />

      {/* 错误提示 (全局 JSON 错误) */}
      {error && (
        <div className="px-6 pt-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* 主编辑区 */}
      <ToolMain className="grid grid-cols-2 divide-x divide-slate-100 min-h-0 overflow-hidden">
        {/* 输入区 */}
        <div className="flex flex-col h-full bg-slate-50/30">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
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
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
             <div className="flex items-center gap-3">
                 <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {showQuery ? "Query Result" : "Output"}
                 </span>
                 
                 {/* 视图切换 */}
                 <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                    <button
                        onClick={() => setViewMode('code')}
                        className={cn(
                            "p-1.5 rounded-md text-slate-500 transition-all",
                            viewMode === 'code' ? "bg-white text-blue-600 shadow-sm" : "hover:text-slate-700"
                        )}
                        title="代码视图"
                    >
                        <Code2 className="w-4 h-4" />
                    </button>
                     <button
                        onClick={() => setViewMode('tree')}
                        className={cn(
                            "p-1.5 rounded-md text-slate-500 transition-all",
                            viewMode === 'tree' ? "bg-white text-blue-600 shadow-sm" : "hover:text-slate-700"
                        )}
                         title="树形视图 (可交互)"
                    >
                        <Network className="w-4 h-4" />
                    </button>
                </div>
             </div>

            <div className="flex items-center gap-2">
               <button
                onClick={handleDownloadFull}
                disabled={!output}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  output
                    ? 'text-slate-600 hover:bg-slate-100 active:scale-95'
                    : 'text-slate-300 cursor-not-allowed'
                )}
                title={showQuery ? "下载查询结果" : "下载完整 JSON"}
              >
                 <Download className="w-4 h-4" />
                 <span className="hidden sm:inline">下载</span>
              </button>
              <button
                onClick={handleCopy}
                disabled={!output}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  output
                    ? 'text-slate-600 hover:bg-slate-100 active:scale-95'
                    : 'text-slate-300 cursor-not-allowed'
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">已复制</span>
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
          
          {/* 内容区域 */}
          <div className="flex-1 relative overflow-hidden">
             {viewMode === 'code' ? (
                <textarea
                    value={output}
                    readOnly
                    placeholder="等待处理..."
                    className="absolute inset-0 w-full h-full p-4 bg-transparent resize-none font-mono text-sm text-slate-700 focus:outline-none custom-scrollbar leading-relaxed selection:bg-blue-100 selection:text-blue-900"
                    spellCheck={false}
                />
             ) : (
                 <div className="absolute inset-0 w-full h-full overflow-auto p-4 custom-scrollbar">
                    {displayData ? (
                        <JsonTree 
                            data={displayData} 
                            isLast={true} 
                            path="$"
                            onFillPath={handleFillPath}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                             {showQuery ? <Search className="w-8 h-8 mb-2 opacity-50" /> : <Network className="w-8 h-8 mb-2 opacity-50" />}
                             <p className="text-sm">{showQuery ? "查询结果为空或语法错误" : "无法解析为 JSON 对象"}</p>
                        </div>
                    )}
                 </div>
             )}
          </div>
        </div>
      </ToolMain>
    </ToolPageShell>
  );
}

export default JsonFormatter;
