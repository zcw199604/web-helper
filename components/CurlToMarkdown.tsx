/**
 * cURL / fetch → Markdown 工具页
 *
 * 粘贴 DevTools「Copy as cURL / Copy as fetch」与可选响应内容，生成 Markdown 接口文档并支持复制/下载。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Code2, Copy, Download, Eye, FileText, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ParsedCurlRequest } from '@/utils/curl';
import { parseRequestSnippet } from '@/utils/request';
import { buildRequestMarkdown, suggestMarkdownFileName, type ExampleCodeFormat } from '@/utils/markdown';
import { filterRequestHeaders, type RequestHeaderItem } from '@/utils/request-headers';
import { MarkdownPreview } from '@/components/ui/MarkdownPreview';
import { ToolHeader, ToolMain, ToolPageShell } from '@/components/ui/ToolLayout';

interface RequestMeta {
  method: string;
  url: string;
}

interface ParsedRequestSnapshot {
  kind: 'curl' | 'fetch';
  text: string;
  request: ParsedCurlRequest;
}

interface HeaderSummary {
  total: number;
  keptCount: number;
  removedCount: number;
  autoRemovedCount: number;
  manualRemovedCount: number;
  overlapRemovedCount: number;
  manualOnlyRemovedCount: number;
}

const EMPTY_HEADER_SUMMARY: HeaderSummary = {
  total: 0,
  keptCount: 0,
  removedCount: 0,
  autoRemovedCount: 0,
  manualRemovedCount: 0,
  overlapRemovedCount: 0,
  manualOnlyRemovedCount: 0,
};

function CurlToMarkdown() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [meta, setMeta] = useState<RequestMeta | null>(null);
  const [exampleCode, setExampleCode] = useState<ExampleCodeFormat>('none');
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [parsedSnapshot, setParsedSnapshot] = useState<ParsedRequestSnapshot | null>(null);
  const [headerItems, setHeaderItems] = useState<RequestHeaderItem[]>([]);
  const [autoRemoveNoiseHeaders, setAutoRemoveNoiseHeaders] = useState(true);
  const [manualRemovedHeaderIds, setManualRemovedHeaderIds] = useState<string[]>([]);

  const manualRemovedHeaderIdSet = useMemo(() => new Set(manualRemovedHeaderIds), [manualRemovedHeaderIds]);

  const headerSummary = useMemo<HeaderSummary>(() => {
    const total = headerItems.length;
    if (total === 0) return EMPTY_HEADER_SUMMARY;

    let autoRemovedCount = 0;
    let manualRemovedCount = 0;
    let removedCount = 0;
    let overlapRemovedCount = 0;

    for (const item of headerItems) {
      const autoRemoved = autoRemoveNoiseHeaders && item.autoRemovable;
      const manualRemoved = manualRemovedHeaderIdSet.has(item.id);

      if (autoRemoved) autoRemovedCount++;
      if (manualRemoved) manualRemovedCount++;
      if (autoRemoved && manualRemoved) overlapRemovedCount++;
      if (autoRemoved || manualRemoved) removedCount++;
    }

    return {
      total,
      keptCount: total - removedCount,
      removedCount,
      autoRemovedCount,
      manualRemovedCount,
      overlapRemovedCount,
      manualOnlyRemovedCount: manualRemovedCount - overlapRemovedCount,
    };
  }, [autoRemoveNoiseHeaders, headerItems, manualRemovedHeaderIdSet]);

  /**
   * 重置由解析结果派生出的状态。
   * 使用函数式更新避免空数组重复赋值导致的无意义重渲染。
   */
  const resetDerivedState = useCallback(() => {
    setMarkdown('');
    setMeta(null);
    setHeaderItems((previous) => (previous.length === 0 ? previous : []));
    setManualRemovedHeaderIds((previous) => (previous.length === 0 ? previous : []));
  }, []);

  // 仅对输入文本做 debounce + 解析，避免勾选 Header 时重复解析 cURL/fetch 文本。
  useEffect(() => {
    const timer = setTimeout(() => {
      const text = input.trim();
      if (!text) {
        setParsedSnapshot(null);
        resetDerivedState();
        setError(null);
        return;
      }

      const result = parseRequestSnippet(text);
      if (!result.ok) {
        setParsedSnapshot(null);
        resetDerivedState();
        setError(result.error);
        return;
      }

      setError(null);
      setMeta({ method: result.request.method, url: result.request.url });
      setParsedSnapshot({
        kind: result.kind,
        text,
        request: result.request,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [input, resetDerivedState]);

  // 解析成功后，按当前过滤策略生成 Markdown；Header 勾选只会走这一层，不会重复解析输入。
  useEffect(() => {
    if (!parsedSnapshot) return;

    const filteredHeaders = filterRequestHeaders(parsedSnapshot.request.headers, {
      autoRemoveNoiseHeaders,
      manualRemovedHeaderIds,
    });

    setHeaderItems(filteredHeaders.items);

    const availableHeaderIds = new Set(filteredHeaders.items.map((item) => item.id));
    setManualRemovedHeaderIds((previousIds) => {
      const nextIds = previousIds.filter((id) => availableHeaderIds.has(id));
      return nextIds.length === previousIds.length ? previousIds : nextIds;
    });

    setMarkdown(
      buildRequestMarkdown(
        {
          ...parsedSnapshot.request,
          headers: filteredHeaders.headers,
        },
        {
          originalRequest: { kind: parsedSnapshot.kind, text: parsedSnapshot.text },
          exampleCode,
          responseBody: response.trim() ? response : undefined,
        }
      )
    );
  }, [autoRemoveNoiseHeaders, exampleCode, manualRemovedHeaderIds, parsedSnapshot, response]);

  const handleCopy = useCallback(async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [markdown]);

  const handleDownload = useCallback(() => {
    if (!markdown) return;
    const fileName = meta?.url ? suggestMarkdownFileName(meta.url) : 'request.md';
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [markdown, meta?.url]);

  const handleClear = useCallback(() => {
    setInput('');
    setResponse('');
    setError(null);
    setParsedSnapshot(null);
    resetDerivedState();
  }, [resetDerivedState]);

  const handleToggleManualHeader = useCallback((headerId: string) => {
    setManualRemovedHeaderIds((previousIds) => {
      if (previousIds.includes(headerId)) {
        return previousIds.filter((id) => id !== headerId);
      }
      return [...previousIds, headerId];
    });
  }, []);

  const handleSelectAllHeadersForManualRemoval = useCallback(() => {
    setManualRemovedHeaderIds((previousIds) => {
      const nextIds = headerItems.map((header) => header.id);
      const noChange =
        previousIds.length === nextIds.length &&
        previousIds.every((id, index) => id === nextIds[index]);

      return noChange ? previousIds : nextIds;
    });
  }, [headerItems]);

  const handleClearManualRemovedHeaders = useCallback(() => {
    setManualRemovedHeaderIds((previous) => (previous.length === 0 ? previous : []));
  }, []);

  return (
    <ToolPageShell>
      <ToolHeader
        title="cURL / fetch → Markdown"
        description="粘贴 DevTools「Copy as cURL / Copy as fetch」，生成接口文档"
        icon={<FileText className="w-5 h-5" />}
        iconClassName="bg-indigo-50 text-indigo-600"
        actions={
          <>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">示例代码</span>
              <select
                value={exampleCode}
                onChange={(e) => setExampleCode(e.target.value as ExampleCodeFormat)}
                className="bg-transparent text-sm text-gray-700 focus:outline-none"
                title="控制是否生成示例代码，以及示例代码格式"
              >
                <option value="none">不生成</option>
                <option value="curl">cURL</option>
                <option value="fetch">fetch</option>
                <option value="both">cURL + fetch</option>
              </select>
            </div>
            <button onClick={handleCopy} disabled={!markdown} className="btn btn-secondary gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '已复制' : '复制 Markdown'}</span>
            </button>
            <button onClick={handleDownload} disabled={!markdown} className="btn btn-secondary gap-2">
              <Download className="w-4 h-4" />
              <span>下载 .md</span>
            </button>
            <button onClick={handleClear} className="btn btn-ghost gap-2">
              <Trash2 className="w-4 h-4" />
              <span>清空</span>
            </button>
          </>
        }
        toolbar={
          <div className="space-y-3">
            {error ? (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            ) : null}

            {meta && !error ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
                <span className="px-2 py-1 rounded-md bg-slate-100 font-mono flex-shrink-0">{meta.method}</span>
                <span className="truncate font-mono">{meta.url}</span>
              </div>
            ) : null}

            {headerItems.length > 0 && !error ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-xs text-slate-700 select-none">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={autoRemoveNoiseHeaders}
                      onChange={(event) => setAutoRemoveNoiseHeaders(event.target.checked)}
                    />
                    <span>自动删除常见无用 Header</span>
                  </label>
                  <span className="text-xs text-slate-500">
                    保留 {headerSummary.keptCount}/{headerSummary.total}，总删除 {headerSummary.removedCount}（自动{' '}
                    {headerSummary.autoRemovedCount}，手动额外 {headerSummary.manualOnlyRemovedCount}）
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleSelectAllHeadersForManualRemoval}
                    className="btn btn-secondary px-3 py-1.5 text-xs"
                    disabled={headerItems.length === 0}
                  >
                    全部勾选删除
                  </button>
                  <button
                    onClick={handleClearManualRemovedHeaders}
                    className="btn btn-ghost px-3 py-1.5 text-xs"
                    disabled={manualRemovedHeaderIds.length === 0}
                  >
                    清空手动勾选
                  </button>
                  <span className="text-[11px] text-slate-400">
                    自动规则示例：sec-fetch-*, sec-ch-*, user-agent, accept-language
                  </span>
                </div>

                <div className="max-h-40 overflow-auto border border-slate-200 rounded-lg bg-white custom-scrollbar divide-y divide-slate-100">
                  {headerItems.map((header) => {
                    const manualRemoved = manualRemovedHeaderIdSet.has(header.id);
                    const autoRemoved = autoRemoveNoiseHeaders && header.autoRemovable;
                    const isRemoved = manualRemoved || autoRemoved;

                    return (
                      <label
                        key={header.id}
                        className={cn(
                          'flex items-start gap-2 px-3 py-2 text-xs transition-colors',
                          isRemoved ? 'bg-slate-50 text-slate-400' : 'text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-300"
                          checked={manualRemoved}
                          onChange={() => handleToggleManualHeader(header.id)}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[11px] truncate">{header.name}</span>
                            {header.autoRemovable ? (
                              <span className="px-1.5 py-0.5 rounded border border-amber-100 bg-amber-50 text-amber-600 text-[10px]">
                                自动清理
                              </span>
                            ) : null}
                            {isRemoved ? (
                              <span className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-500 text-[10px]">
                                已删除
                              </span>
                            ) : null}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 truncate">{header.value || '(空值)'}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        }
      />

      {/* 主编辑区 */}
      <ToolMain className="grid grid-cols-2 divide-x divide-slate-100 min-h-0 overflow-hidden">
        {/* 输入区 */}
        <div className="flex flex-col h-full bg-slate-50/30">
          <div className="flex flex-col flex-[2] min-h-0">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Request (cURL / fetch)</span>
              <span className="text-xs text-slate-400">{input.length} chars</span>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="粘贴 DevTools Network → Copy as cURL / Copy as fetch 的内容..."
              className="flex-1 p-4 bg-transparent resize-none font-mono text-sm text-slate-700 focus:outline-none focus:bg-white transition-colors custom-scrollbar leading-relaxed"
            />
          </div>

          <div className="flex flex-col flex-1 min-h-0 border-t border-slate-100">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Response (可选)</span>
              <span className="text-xs text-slate-400">{response.length} chars</span>
            </div>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="粘贴接口响应内容（为空则不输出“响应示例/字段说明”）..."
              className="flex-1 p-4 bg-transparent resize-none font-mono text-sm text-slate-700 focus:outline-none focus:bg-white transition-colors custom-scrollbar leading-relaxed"
            />
          </div>
        </div>

        {/* 输出区 */}
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Markdown</span>
              <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setViewMode('code')}
                  className={cn(
                    'p-1.5 rounded-md text-slate-500 transition-all',
                    viewMode === 'code' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-700'
                  )}
                  title="编辑 Markdown"
                >
                  <Code2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={cn(
                    'p-1.5 rounded-md text-slate-500 transition-all',
                    viewMode === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-700'
                  )}
                  title="渲染预览"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
            <span className="text-xs text-slate-400">{markdown.length} chars</span>
          </div>
          {viewMode === 'code' ? (
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="生成的 Markdown 文档..."
              className={cn(
                'flex-1 p-4 bg-transparent resize-none font-mono text-sm text-slate-700 focus:outline-none custom-scrollbar leading-relaxed selection:bg-indigo-100 selection:text-indigo-900'
              )}
              spellCheck={false}
            />
          ) : (
            <div className="flex-1 overflow-auto p-4 bg-white custom-scrollbar">
              {markdown ? (
                <MarkdownPreview markdown={markdown} />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">暂无 Markdown 内容</div>
              )}
            </div>
          )}
        </div>
      </ToolMain>
    </ToolPageShell>
  );
}

export default CurlToMarkdown;
