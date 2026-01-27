/**
 * Markdown 预览组件
 *
 * 使用 react-markdown 渲染 Markdown，并提供基础样式（含 GFM 表格等）。
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/utils/cn';

export interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

export function MarkdownPreview({ markdown, className }: MarkdownPreviewProps) {
  return (
    <div className={cn('text-sm text-slate-700 leading-relaxed', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ node: _node, children, ...props }) => (
            <h1 {...props} className="text-xl font-bold text-slate-900 mt-2 mb-3">
              {children}
            </h1>
          ),
          h2: ({ node: _node, children, ...props }) => (
            <h2 {...props} className="text-lg font-bold text-slate-900 mt-6 mb-2">
              {children}
            </h2>
          ),
          h3: ({ node: _node, children, ...props }) => (
            <h3 {...props} className="text-base font-semibold text-slate-900 mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ node: _node, children, ...props }) => (
            <p {...props} className="my-2">
              {children}
            </p>
          ),
          a: ({ node: _node, children, ...props }) => (
            <a
              {...props}
              target="_blank"
              className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2 break-words"
              rel="noreferrer noopener"
            >
              {children}
            </a>
          ),
          ul: ({ node: _node, children, ...props }) => (
            <ul {...props} className="list-disc pl-6 my-2 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ node: _node, children, ...props }) => (
            <ol {...props} className="list-decimal pl-6 my-2 space-y-1">
              {children}
            </ol>
          ),
          li: ({ node: _node, children, ...props }) => (
            <li {...props} className="leading-relaxed">
              {children}
            </li>
          ),
          blockquote: ({ node: _node, children, ...props }) => (
            <blockquote {...props} className="my-3 pl-4 border-l-4 border-slate-200 text-slate-600">
              {children}
            </blockquote>
          ),
          hr: ({ node: _node, ...props }) => <hr {...props} className="my-6 border-slate-200" />,
          table: ({ node: _node, children, ...props }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table {...props} className="min-w-full text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ node: _node, children, ...props }) => (
            <thead {...props} className="bg-slate-50">
              {children}
            </thead>
          ),
          th: ({ node: _node, children, ...props }) => (
            <th {...props} className="text-left font-semibold text-slate-700 px-3 py-2 border-b border-slate-200">
              {children}
            </th>
          ),
          td: ({ node: _node, children, ...props }) => (
            <td {...props} className="align-top px-3 py-2 border-b border-slate-100 text-slate-700">
              {children}
            </td>
          ),
          pre: (rawProps) => {
            const { node: _node, children, ...props } = rawProps as {
              node?: unknown;
              children?: unknown;
              [key: string]: unknown;
            };

            const firstChild = Array.isArray(children) ? children[0] : children;
            const codeChildren =
              typeof firstChild === 'object' && firstChild && 'props' in firstChild
                ? (firstChild as { props?: { children?: unknown } }).props?.children
                : undefined;

            const rawText = Array.isArray(codeChildren) ? codeChildren.join('') : codeChildren;
            const text = String(rawText ?? '').replace(/\n$/, '');

            return (
              <pre
                {...props}
                className="my-3 p-3 rounded-lg bg-slate-950 text-slate-100 overflow-x-auto custom-scrollbar"
              >
                <code className="font-mono text-[0.95em] whitespace-pre">{text}</code>
              </pre>
            );
          },
          code: (rawProps) => {
            const { node: _node, className, children, ...props } = rawProps as {
              node?: unknown;
              className?: string;
              children?: unknown;
              [key: string]: unknown;
            };
            const text = String(children ?? '').replace(/\n$/, '');
            return (
              <code
                {...props}
                className={cn(
                  'font-mono text-[0.95em]',
                  'bg-slate-100 text-slate-800 px-1 py-0.5 rounded',
                  className
                )}
              >
                {text}
              </code>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
