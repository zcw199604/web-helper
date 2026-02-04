import { useState, useCallback, useEffect, useRef } from 'react';
import { Copy, Check, Trash2, FileJson, AlignLeft, Minimize2, ShieldCheck, Code2, Network, Download, Search, TextSearch, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { JsonTree } from '@/components/ui/JsonTree';
import { ToolHeader, ToolMain, ToolPageShell } from '@/components/ui/ToolLayout';
import JsonWorker from '../utils/json.worker?worker';

type OutputMode = 'format' | 'minify';

type WorkerComputeRequest = {
  type: 'compute';
  id: number;
  sourceId: number;
  text?: string;
  indent: number;
  outputMode: OutputMode;
  showQuery: boolean;
  queryForResult: string;
  wantTree: boolean;
};

type WorkerSuggestRequest = {
  type: 'suggest';
  id: number;
  sourceId: number;
  queryInput: string;
  limit: number;
};

type WorkerSearchRequest = {
  type: 'search';
  id: number;
  sourceId: number;
  text?: string;
  query: string;
  limit: number;
  caseSensitive: boolean;
  mode: 'key' | 'value' | 'both';
};

type WorkerSearchMatch = {
  path: string;
  preview: string;
  matchIn: 'key' | 'value';
};

type WorkerResponse =
  | {
      type: 'computeResult';
      id: number;
      parseError: string | null;
      queryError: string | null;
      outputText: string;
      displayData?: unknown;
    }
  | {
      type: 'suggestResult';
      id: number;
      suggestions: string[];
    }
  | {
      type: 'searchResult';
      id: number;
      matches: WorkerSearchMatch[];
      truncated: boolean;
      error: string | null;
    };

function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [indent, setIndent] = useState(2);
  const [viewMode, setViewMode] = useState<'code' | 'tree'>('tree');
  const [outputMode, setOutputMode] = useState<OutputMode>('format');
  const [expandAll, setExpandAll] = useState(false);
  const [treeVersion, setTreeVersion] = useState(0);
  
  // JSONPath 相关状态
  const [showQuery, setShowQuery] = useState(false);
  const [queryInput, setQueryInput] = useState('$.');
  const [debouncedQueryInput, setDebouncedQueryInput] = useState('$.');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [autoClearQuery, setAutoClearQuery] = useState(true);

  // 全量搜索相关状态（Tree 虚拟列表下 Ctrl+F 无法覆盖未渲染节点）
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchInput, setDebouncedSearchInput] = useState('');
  const [searchMatches, setSearchMatches] = useState<WorkerSearchMatch[]>([]);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // 自动补全相关状态
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const queryInputRef = useRef<HTMLInputElement>(null);
  const [displayData, setDisplayData] = useState<unknown | undefined>(undefined);

  const workerRef = useRef<Worker | null>(null);
  const viewModeRef = useRef(viewMode);
  const inputRef = useRef(input);
  const sourceIdRef = useRef(0);
  const lastTextSentSourceIdRef = useRef<number | null>(null);
  const computeTimerRef = useRef<number | undefined>(undefined);
  const searchTimerRef = useRef<number | undefined>(undefined);
  const computeReqSeqRef = useRef(0);
  const latestComputeReqIdRef = useRef(0);
  const suggestReqSeqRef = useRef(0);
  const latestSuggestReqIdRef = useRef(0);
  const searchReqSeqRef = useRef(0);
  const latestSearchReqIdRef = useRef(0);

  // Keep latest view mode accessible in worker callbacks (avoid capturing stale state).
  useEffect(() => {
    viewModeRef.current = viewMode;
    if (viewMode !== 'tree') {
      // Free large structured-clone payloads when user is in code view.
      setDisplayData(undefined);
    }
  }, [viewMode]);

  useEffect(() => {
    const worker = new JsonWorker();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

      if (msg.type === 'computeResult') {
        if (msg.id !== latestComputeReqIdRef.current) return;
        setOutput(msg.outputText);
        setError(msg.parseError);
        setQueryError(msg.queryError);
        if (msg.parseError) {
          setDisplayData(undefined);
          return;
        }

        // Only update tree data when the Worker actually sent it.
        if (viewModeRef.current === 'tree' && msg.displayData !== undefined) {
          setDisplayData(msg.displayData);
        }
      } else if (msg.type === 'suggestResult') {
        if (msg.id !== latestSuggestReqIdRef.current) return;
        setSuggestions(msg.suggestions);
        setShowSuggestions(msg.suggestions.length > 0);
        setActiveSuggestionIndex(0);
      } else if (msg.type === 'searchResult') {
        if (msg.id !== latestSearchReqIdRef.current) return;
        setSearchMatches(msg.matches);
        setSearchTruncated(msg.truncated);
        setSearchError(msg.error);
        setActiveSearchIndex(0);
      }
    };

    worker.onerror = () => {
      setError('Worker 初始化失败，请刷新后重试');
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const requestCompute = useCallback(
    (forceText: boolean = false, wantTree: boolean = false) => {
      const worker = workerRef.current;
      if (!worker) return;

      const sourceId = sourceIdRef.current;
      const includeText = forceText || lastTextSentSourceIdRef.current !== sourceId;

      const id = ++computeReqSeqRef.current;
      latestComputeReqIdRef.current = id;

      const msg: WorkerComputeRequest = {
        type: 'compute',
        id,
        sourceId,
        indent,
        outputMode,
        showQuery,
        queryForResult: debouncedQueryInput,
        wantTree,
      };

      if (includeText) {
        msg.text = inputRef.current;
        lastTextSentSourceIdRef.current = sourceId;
      }

      worker.postMessage(msg);
    },
    [debouncedQueryInput, indent, outputMode, showQuery]
  );

  const requestSearch = useCallback(
    (forceText: boolean = false) => {
      const worker = workerRef.current;
      if (!worker) return;

      const sourceId = sourceIdRef.current;
      const includeText = forceText || lastTextSentSourceIdRef.current !== sourceId;

      const id = ++searchReqSeqRef.current;
      latestSearchReqIdRef.current = id;

      const msg: WorkerSearchRequest = {
        type: 'search',
        id,
        sourceId,
        query: debouncedSearchInput,
        limit: 200,
        caseSensitive: false,
        mode: 'both',
      };

      if (includeText) {
        msg.text = inputRef.current;
        lastTextSentSourceIdRef.current = sourceId;
      }

      worker.postMessage(msg);
    },
    [debouncedSearchInput]
  );

  // Avoid effects re-firing just because requestCompute is recreated when its deps change.
  const requestComputeRef = useRef(requestCompute);
  useEffect(() => {
    requestComputeRef.current = requestCompute;
  }, [requestCompute]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    sourceIdRef.current += 1;
    setInput(e.target.value);
  }, []);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

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

  // 输入变化时：防抖发送到 Worker（避免重复复制 5MB+ 字符串）
  useEffect(() => {
    if (!input.trim()) {
      window.clearTimeout(computeTimerRef.current);
      setOutput('');
      setError(null);
      setQueryError(null);
      setDisplayData(undefined);
      return;
    }

    window.clearTimeout(computeTimerRef.current);
    computeTimerRef.current = window.setTimeout(() => {
      requestComputeRef.current(false, viewModeRef.current === 'tree');
    }, 300);

    return () => window.clearTimeout(computeTimerRef.current);
  }, [input]);

  // 防抖 JSONPath 查询输入，避免每次键入都跑一遍 JSONPath
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQueryInput(queryInput), 200);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  // 防抖全量搜索输入
  useEffect(() => {
    if (!showSearch) return;
    const timer = window.setTimeout(() => setDebouncedSearchInput(searchInput), 200);
    return () => window.clearTimeout(timer);
  }, [searchInput, showSearch]);

  // 全量搜索：当 JSON 或搜索词变化时，触发 Worker 扫描（避免阻塞主线程）
  useEffect(() => {
    if (!showSearch) {
      window.clearTimeout(searchTimerRef.current);
      setSearchMatches([]);
      setSearchTruncated(false);
      setSearchError(null);
      setActiveSearchIndex(0);
      return;
    }

    if (!input.trim()) {
      window.clearTimeout(searchTimerRef.current);
      setSearchMatches([]);
      setSearchTruncated(false);
      setSearchError(null);
      setActiveSearchIndex(0);
      return;
    }

    const q = debouncedSearchInput.trim();
    if (!q) {
      window.clearTimeout(searchTimerRef.current);
      setSearchMatches([]);
      setSearchTruncated(false);
      setSearchError(null);
      setActiveSearchIndex(0);
      return;
    }

    window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      requestSearch(false);
    }, 250);

    return () => window.clearTimeout(searchTimerRef.current);
  }, [debouncedSearchInput, input, requestSearch, showSearch]);

  // 缩进/输出模式变化：只需要重算输出文本，不需要重传/重算树
  useEffect(() => {
    if (!inputRef.current.trim()) return;
    requestComputeRef.current(false, false);
  }, [indent, outputMode]);

  // 查询条件变化：输出文本需要更新；Tree 模式下同时更新树数据（查询结果/退出查询）
  useEffect(() => {
    if (!inputRef.current.trim()) return;
    requestComputeRef.current(false, viewModeRef.current === 'tree');
  }, [debouncedQueryInput, showQuery]);

  // 仅在 Tree 模式时拉取 displayData（避免 code view 也收大对象 clone）
  useEffect(() => {
    if (viewMode !== 'tree') return;
    if (!inputRef.current.trim()) return;
    requestComputeRef.current(false, true);
  }, [viewMode]);

  // 查询输入变化：在 Worker 中生成建议（避免主线程扫描大 JSON）
  useEffect(() => {
    if (!showQuery || !queryInput) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const worker = workerRef.current;
    if (!worker) return;

    const timer = window.setTimeout(() => {
      const id = ++suggestReqSeqRef.current;
      latestSuggestReqIdRef.current = id;
      const msg: WorkerSuggestRequest = {
        type: 'suggest',
        id,
        sourceId: sourceIdRef.current,
        queryInput,
        limit: 50,
      };
      worker.postMessage(msg);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [queryInput, showQuery]);

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

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showSearch) return;

    if (e.key === 'Escape') {
      setShowSearch(false);
      return;
    }

    if (searchMatches.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSearchIndex((prev) => (prev + 1) % searchMatches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSearchIndex((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const match = searchMatches[activeSearchIndex];
      if (!match) return;
      setShowSearch(false);
      setQueryInput(match.path);
      setShowQuery(true);
    }
  };


  // 手动触发格式化
  const handleFormat = useCallback(() => {
    setOutputMode('format');
    setShowQuery(false); // 退出查询模式
    setShowSearch(false);
  }, []);

  // 压缩
  const handleMinify = useCallback(() => {
    if (!inputRef.current.trim()) {
      setError('请输入 JSON 内容');
      return;
    }
    setOutputMode('minify');
    setShowQuery(false);
    setShowSearch(false);
  }, []);

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
    sourceIdRef.current += 1;
    setInput('');
    setOutput('');
    setError(null);
    setQueryError(null);
    setQueryInput('$.');
    setShowQuery(false);
    setShowSearch(false);
    setSearchInput('');
    setDebouncedSearchInput('');
    setSearchMatches([]);
    setSearchTruncated(false);
    setSearchError(null);
    setActiveSearchIndex(0);
    setSuggestions([]);
    setShowSuggestions(false);
    setDisplayData(undefined);
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
              <div className="w-px h-4 bg-gray-200 mx-1"></div>
              <label
                className="flex items-center gap-1.5 cursor-pointer text-xs select-none"
                title="Tree 视图展开全部节点（大 JSON 可能更耗资源）"
              >
                <input
                  type="checkbox"
                  checked={expandAll}
                  onChange={(e) => {
                    setExpandAll(e.target.checked);
                    setTreeVersion((v) => v + 1);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-600">全部展开</span>
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
              onClick={() => {
                setShowSearch(false);
                setShowQuery((prev) => !prev);
              }}
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

            <button
              onClick={() => {
                setShowQuery(false);
                setShowSearch((prev) => {
                  const next = !prev;
                  if (next) {
                    setTimeout(() => searchInputRef.current?.focus(), 0);
                  }
                  return next;
                });
              }}
              className={cn(
                'btn gap-2 transition-all',
                showSearch
                  ? 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
                  : 'btn-secondary'
              )}
            >
              <TextSearch className="w-4 h-4" />
              <span>搜索</span>
            </button>

            <button onClick={handleClear} className="btn btn-ghost p-2 text-gray-400 hover:text-red-500">
              <Trash2 className="w-5 h-5" />
            </button>
          </>
        }
        toolbar={
          showSearch ? (
            <div className="animate-in slide-in-from-top-2 duration-200 relative">
              <div className="relative flex items-center">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="全量搜索 key / value（支持大 JSON）"
                  className={cn(
                    "w-full pl-3 pr-10 py-2.5 bg-slate-50 border rounded-lg font-mono text-sm text-slate-700 focus:outline-none focus:ring-2 transition-all",
                    searchError
                      ? "border-red-300 focus:ring-red-200"
                      : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                  )}
                  autoComplete="off"
                />
                {searchInput.trim() && (
                  <button
                    onClick={() => setSearchInput('')}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                    title="清空搜索"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {searchMatches.length > 0 ? (
                <div className="mt-2 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                  <div className="max-h-72 overflow-y-auto">
                    {searchMatches.map((match, index) => (
                      <button
                        key={`${match.path}-${index}`}
                        onClick={() => {
                          setShowSearch(false);
                          setQueryInput(match.path);
                          setShowQuery(true);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 transition-colors",
                          index === activeSearchIndex
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-700 hover:bg-blue-50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-sm truncate">{match.path}</span>
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0",
                              match.matchIn === 'key'
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                            )}
                          >
                            {match.matchIn === 'key' ? 'KEY' : 'VALUE'}
                          </span>
                        </div>
                        {match.preview ? (
                          <div className="mt-0.5 text-xs text-slate-500 font-mono truncate">
                            {match.preview}
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex justify-between mt-1.5 px-1">
                <span className={cn("text-xs", searchError ? "text-red-500 font-medium" : "text-slate-400")}>
                  {searchError
                    ? searchError
                    : debouncedSearchInput.trim()
                      ? `匹配 ${searchMatches.length}${searchTruncated ? '+' : ''} 条`
                      : '输入关键词后开始搜索（key/value，不区分大小写）'}
                </span>
                {debouncedSearchInput.trim() && searchMatches[activeSearchIndex] ? (
                  <button
                    onClick={() => {
                      const match = searchMatches[activeSearchIndex];
                      if (!match) return;
                      setShowSearch(false);
                      setQueryInput(match.path);
                      setShowQuery(true);
                    }}
                    className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
                  >
                    打开当前
                  </button>
                ) : null}
              </div>
            </div>
          ) : showQuery ? (
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
      <ToolMain className="grid grid-cols-1 grid-rows-2 2xl:grid-cols-2 2xl:grid-rows-1 divide-y 2xl:divide-y-0 2xl:divide-x divide-slate-100 min-h-0 overflow-hidden">
        {/* 输入区 */}
        <div className="flex flex-col h-full bg-slate-50/30">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Input</span>
            <span className="text-xs text-slate-400">{input.length} chars</span>
          </div>
          <textarea
            value={input}
            onChange={handleInputChange}
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
                 <div className="absolute inset-0 w-full h-full overflow-hidden">
                    {displayData !== undefined ? (
                        <JsonTree 
                            key={`json-tree-${treeVersion}`}
                            data={displayData} 
                            isLast={true} 
                            path="$"
                            expandAll={expandAll}
                            onFillPath={handleFillPath}
                            className="h-full w-full overflow-auto p-4 custom-scrollbar"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4">
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
