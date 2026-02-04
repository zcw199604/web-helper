import { useCallback, useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Download, Check, CornerLeftUp } from 'lucide-react';
import { cn } from '@/utils/cn';

export type TreeRow =
  | {
      kind: 'leaf';
      id: string;
      level: number;
      name?: string;
      path: string;
      value: any;
      isLast: boolean;
    }
  | {
      kind: 'container';
      id: string;
      level: number;
      name?: string;
      path: string;
      value: any;
      containerType: 'array' | 'object';
      isEmpty: boolean;
      isExpanded: boolean;
      isLast: boolean;
      arrayLength?: number;
    }
  | {
      kind: 'close';
      id: string;
      level: number;
      path: string;
      containerType: 'array' | 'object';
      isLast: boolean;
    }
  | {
      kind: 'more';
      id: string;
      level: number;
      path: string;
      label: string;
    };

// Simple type detection for JSON-ish values.
function getType(value: any) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function downloadJson(data: any, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderValue(val: any) {
  const valType = getType(val);
  switch (valType) {
    case 'string':
      return <span className="text-green-600">"{val}"</span>;
    case 'number':
      return <span className="text-orange-600">{val}</span>;
    case 'boolean':
      return <span className="text-blue-600 font-bold">{String(val)}</span>;
    case 'null':
      return <span className="text-gray-500 font-bold">null</span>;
    default:
      return <span>{String(val)}</span>;
  }
}

export function LeafRowView({
  row,
  onFillPath,
}: {
  row: Extract<TreeRow, { kind: 'leaf' }>;
  onFillPath?: (path: string) => void;
}) {
  const handleFillPath = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFillPath?.(row.path);
    },
    [onFillPath, row.path]
  );

  return (
    <div className="flex items-start hover:bg-slate-50/50 rounded px-1 -ml-1 py-0.5 font-mono text-sm leading-6 group">
      <div style={{ paddingLeft: `${row.level * 20}px` }} className="flex-1 break-all flex items-center">
        <div className="flex-1">
          {row.name ? <span className="text-purple-700 font-medium">"{row.name}"</span> : null}
          {row.name ? <span className="text-slate-500 mr-2">:</span> : null}
          {renderValue(row.value)}
          {!row.isLast ? <span className="text-slate-500">,</span> : null}
        </div>

        {onFillPath ? (
          <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity px-2">
            <button
              onClick={handleFillPath}
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
              title="填充 JSONPath"
            >
              <CornerLeftUp className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ContainerRowView({
  row,
  onToggle,
  onFillPath,
}: {
  row: Extract<TreeRow, { kind: 'container' }>;
  onToggle: (path: string) => void;
  onFillPath?: (path: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const BracketOpen = row.containerType === 'array' ? '[' : '{';
  const BracketClose = row.containerType === 'array' ? ']' : '}';

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(JSON.stringify(row.value, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [row.value]);

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const fileName = row.name || 'data';
      downloadJson(row.value, fileName);
    },
    [row.name, row.value]
  );

  const handleFillPath = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFillPath?.(row.path);
    },
    [onFillPath, row.path]
  );

  const isCollapsed = !row.isExpanded;

  return (
    <div
      className={cn(
        'flex items-center gap-1 hover:bg-slate-100/80 rounded px-1 -ml-1 py-0.5 group select-none transition-colors font-mono text-sm leading-6',
        row.isEmpty ? 'cursor-default' : 'cursor-pointer'
      )}
      onClick={() => {
        if (row.isEmpty) return;
        onToggle(row.path);
      }}
    >
      <div style={{ paddingLeft: `${row.level * 20}px` }} className="flex items-center gap-1">
        {!row.isEmpty ? (
          <div className="w-4 h-4 flex items-center justify-center text-slate-400">
            {row.isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
        ) : (
          <div className="w-4 h-4" />
        )}

        {row.name ? (
          <>
            <span className="text-purple-700 font-medium">"{row.name}"</span>
            <span className="text-slate-500">:</span>
          </>
        ) : null}

        <span className="text-slate-600 font-medium">{BracketOpen}</span>

        {/* Summary when collapsed */}
        {isCollapsed && !row.isEmpty ? <span className="text-slate-400 mx-1 text-xs">...</span> : null}

        {/* Close bracket on the same line when collapsed or empty */}
        {isCollapsed || row.isEmpty ? (
          <>
            <span className="text-slate-600 font-medium">{BracketClose}</span>
            {!row.isLast ? <span className="text-slate-500">,</span> : null}
          </>
        ) : null}

        {row.containerType === 'array' && isCollapsed && !row.isEmpty ? (
          <span className="text-slate-400 text-xs ml-1">({row.arrayLength} items)</span>
        ) : null}
      </div>

      <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity px-2">
        {onFillPath ? (
          <button
            onClick={handleFillPath}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
            title="填充 JSONPath"
          >
            <CornerLeftUp className="w-3.5 h-3.5" />
          </button>
        ) : null}

        <button
          onClick={handleCopy}
          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
          title="复制此节点内容"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={handleDownload}
          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
          title="下载此节点内容"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function CloseRowView({ row }: { row: Extract<TreeRow, { kind: 'close' }> }) {
  const BracketClose = row.containerType === 'array' ? ']' : '}';
  return (
    <div className="hover:bg-slate-50/50 rounded px-1 -ml-1 py-0.5 font-mono text-sm leading-6">
      <div style={{ paddingLeft: `${row.level * 20}px` }}>
        <span className="text-slate-600 font-medium">{BracketClose}</span>
        {!row.isLast ? <span className="text-slate-500">,</span> : null}
      </div>
    </div>
  );
}

export function MoreRowView({
  row,
  onShowMore,
}: {
  row: Extract<TreeRow, { kind: 'more' }>;
  onShowMore: (path: string) => void;
}) {
  return (
    <div className="hover:bg-slate-50/50 rounded px-1 -ml-1 py-0.5 font-mono text-sm leading-6">
      <div style={{ paddingLeft: `${row.level * 20}px` }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowMore(row.path);
          }}
          className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
        >
          {row.label}
        </button>
      </div>
    </div>
  );
}

