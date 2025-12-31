import { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Download, Check, CornerLeftUp } from 'lucide-react';
import { cn } from '@/utils/cn';

interface JsonTreeProps {
  data: any;
  name?: string;
  isLast?: boolean;
  level?: number;
  initiallyExpanded?: boolean;
  path?: string;
  onFillPath?: (path: string) => void;
}

// 简单的类型判断
const getType = (value: any) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

// 下载 JSON 文件
const downloadJson = (data: any, fileName: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export function JsonTree({ 
  data, 
  name, 
  isLast = true, 
  level = 0, 
  initiallyExpanded = true,
  path = '$',
  onFillPath
}: JsonTreeProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [copied, setCopied] = useState(false);
  const type = getType(data);
  const isObject = type === 'object' || type === 'array';
  const isEmpty = isObject && Object.keys(data).length === 0;
  
  // 处理复制
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 处理下载
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fileName = name || 'data';
    downloadJson(data, fileName);
  };

  // 处理填充 Path
  const handleFillPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFillPath?.(path);
  };

  const renderValue = (val: any) => {
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
  };

  // 非对象类型 (叶子节点)
  if (!isObject) {
    return (
      <div className="flex items-start hover:bg-slate-50/50 rounded px-1 -ml-1 py-0.5 font-mono text-sm leading-6 group">
        <div style={{ paddingLeft: `${level * 20}px` }} className="flex-1 break-all flex items-center">
           <div className="flex-1">
              {name && <span className="text-purple-700 font-medium">"{name}"</span>}
              {name && <span className="text-slate-500 mr-2">:</span>}
              {renderValue(data)}
              {!isLast && <span className="text-slate-500">,</span>}
           </div>

           {/* 叶子节点也添加操作按钮 */}
            {onFillPath && (
                <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity px-2">
                     <button
                        onClick={handleFillPath}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        title="填充 JSONPath"
                        >
                        <CornerLeftUp className="w-3.5 h-3.5" />
                    </button>
                    {/* 叶子节点通常不需要单独下载/复制整个对象，但如果用户需要也可以加上，这里主要响应 Fill Path 需求 */}
                </div>
            )}
        </div>
      </div>
    );
  }

  const keys = Object.keys(data);
  const BracketOpen = type === 'array' ? '[' : '{';
  const BracketClose = type === 'array' ? ']' : '}';

  return (
    <div className="font-mono text-sm leading-6">
      <div 
        className={cn(
          "flex items-center gap-1 hover:bg-slate-100/80 rounded px-1 -ml-1 py-0.5 cursor-pointer group select-none transition-colors",
          isEmpty && "cursor-default"
        )}
        onClick={() => !isEmpty && setIsExpanded(!isExpanded)}
      >
        <div style={{ paddingLeft: `${level * 20}px` }} className="flex items-center gap-1">
          {/* 展开/折叠图标 */}
          {!isEmpty ? (
            <div className="w-4 h-4 flex items-center justify-center text-slate-400">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </div>
          ) : (
            <div className="w-4 h-4" /> 
          )}

          {/* 属性名 */}
          {name && (
            <>
              <span className="text-purple-700 font-medium">"{name}"</span>
              <span className="text-slate-500">:</span>
            </>
          )}

          {/* 括号和摘要 */}
          <span className="text-slate-600 font-medium">{BracketOpen}</span>
          {!isExpanded && !isEmpty && (
            <span className="text-slate-400 mx-1 text-xs">...</span>
          )}
          {isEmpty && <span className="text-slate-600 font-medium">{BracketClose}</span>}
          
          {/* 数组长度提示 */}
          {type === 'array' && !isExpanded && (
            <span className="text-slate-400 text-xs ml-1">({keys.length} items)</span>
          )}
        </div>

        {/* 操作按钮 (仅在 hover 时显示，且非空对象) */}
        <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity px-2">
            {onFillPath && (
                 <button
                    onClick={handleFillPath}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                    title="填充 JSONPath"
                 >
                    <CornerLeftUp className="w-3.5 h-3.5" />
                 </button>
            )}
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

      {/* 子节点 */}
      {isExpanded && !isEmpty && (
        <div>
          {keys.map((key, index) => {
             // 构造子节点的 Path
             const isSimpleKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
             let childPath = path;
             if (type === 'array') {
                childPath = `${path}[${index}]`;
             } else {
                childPath = isSimpleKey ? `${path}.${key}` : `${path}['${key}']`;
             }

             return (
                <JsonTree
                key={key}
                name={type === 'array' ? undefined : key}
                data={data[key]}
                isLast={index === keys.length - 1}
                level={level + 1}
                initiallyExpanded={initiallyExpanded}
                path={childPath}
                onFillPath={onFillPath}
                />
             );
          })}
          <div 
             className="hover:bg-slate-50/50 rounded px-1 -ml-1 py-0.5"
             style={{ paddingLeft: `${level * 20 + 20}px` }}
          >
             <span className="text-slate-600 font-medium">{BracketClose}</span>
             {!isLast && <span className="text-slate-500">,</span>}
          </div>
        </div>
      )}
       
       {/* 折叠时的闭合括号 (非空且未展开时显示) */}
       {!isExpanded && !isEmpty && (
          <div className="inline-block">
             <span className="text-slate-600 font-medium">{BracketClose}</span>
             {!isLast && <span className="text-slate-500">,</span>}
          </div>
       )}
    </div>
  );
}