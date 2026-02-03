/**
 * cURL / fetch → Markdown 工具页
 *
 * 粘贴 DevTools「Copy as cURL / Copy as fetch」与可选响应内容，生成 Markdown 接口文档并支持复制/下载。
 */

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Code2, Copy, Download, Eye, FileText, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { parseRequestSnippet } from '@/utils/request';
import { buildRequestMarkdown, suggestMarkdownFileName, type ExampleCodeFormat } from '@/utils/markdown';
import { MarkdownPreview } from '@/components/ui/MarkdownPreview';
import { ToolHeader, ToolMain, ToolPageShell } from '@/components/ui/ToolLayout';

interface RequestMeta {
  method: string;
  url: string;
}

function CurlToMarkdown() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [meta, setMeta] = useState<RequestMeta | null>(null);
  const [exampleCode, setExampleCode] = useState<ExampleCodeFormat>('none');
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');

  const generate = useCallback(() => {
    const text = input.trim();
    if (!text) {
      setMarkdown('');
      setError(null);
      setMeta(null);
      return;
    }

    const result = parseRequestSnippet(text);
    if (!result.ok) {
      setMarkdown('');
      setMeta(null);
      setError(result.error);
      return;
    }

    setError(null);
    setMeta({ method: result.request.method, url: result.request.url });
    setMarkdown(
      buildRequestMarkdown(result.request, {
        originalRequest: { kind: result.kind, text },
        exampleCode,
        responseBody: response.trim() ? response : undefined,
      })
    );
  }, [exampleCode, input, response]);

  useEffect(() => {
    const timer = setTimeout(() => {
      generate();
    }, 300);
    return () => clearTimeout(timer);
  }, [generate]);

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
    setMarkdown('');
    setError(null);
    setMeta(null);
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
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  暂无 Markdown 内容
                </div>
              )}
            </div>
          )}
        </div>
      </ToolMain>
    </ToolPageShell>
  );
}

export default CurlToMarkdown;
