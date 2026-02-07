import { useCallback, useMemo, useState } from 'react';
import { ArrowDownUp, Check, Copy, Lock, Trash2, Unlock } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  ENCODING_OPERATIONS,
  type EncodingOperationDefinition,
  type EncodingOperationGroup,
  runEncodingOperation,
} from '@/utils/encoding-toolkit';
import { ToolHeader, ToolMain, ToolPageShell } from '@/components/ui/ToolLayout';

function EncodingTools() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null);

  const encryptOperations = useMemo(
    () => ENCODING_OPERATIONS.filter((operation) => operation.group === 'encrypt'),
    [],
  );
  const decryptOperations = useMemo(
    () => ENCODING_OPERATIONS.filter((operation) => operation.group === 'decrypt'),
    [],
  );

  const activeOperation = useMemo(
    () => ENCODING_OPERATIONS.find((operation) => operation.id === activeOperationId) ?? null,
    [activeOperationId],
  );

  const handleOperation = useCallback(
    (operation: EncodingOperationDefinition) => {
      try {
        const result = runEncodingOperation(operation.id, input);
        setOutput(result);
        setError(null);
        setActiveOperationId(operation.id);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [input],
  );

  const handleSwap = useCallback(() => {
    setInput(output);
    setOutput('');
    setError(null);
  }, [output]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setError(null);
    setActiveOperationId(null);
  }, []);

  return (
    <ToolPageShell>
      <ToolHeader
        title="编码转换"
        description="加密/解密（Unicode、URL、Base64、HTML、Hash、JWT、Cookie、Gzip）"
        icon={<Lock className="w-5 h-5" />}
        iconClassName="bg-indigo-50 text-indigo-600"
        toolbar={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSwap}
              disabled={!output}
              className="btn btn-secondary gap-2 px-3 py-1.5 text-xs"
              title="交换输入输出"
            >
              <ArrowDownUp className="w-4 h-4" />
              <span className="hidden sm:inline">交换</span>
            </button>
            <button onClick={handleClear} className="btn btn-ghost p-2 text-slate-400 hover:text-red-500">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {error && (
        <div className="px-6 pt-4">
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{error}</div>
        </div>
      )}

      <ToolMain className="grid min-h-0 grid-cols-2 divide-x divide-slate-100 overflow-hidden">
        <div className="flex h-full flex-col bg-slate-50/30">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">操作面板</span>
              <span className="text-xs text-slate-400">{ENCODING_OPERATIONS.length} tools</span>
            </div>

            <OperationGroup
              title="加密 / 编码"
              group="encrypt"
              operations={encryptOperations}
              activeOperationId={activeOperationId}
              onRun={handleOperation}
            />

            <div className="my-3 h-px bg-slate-200" />

            <OperationGroup
              title="解密 / 解码"
              group="decrypt"
              operations={decryptOperations}
              activeOperationId={activeOperationId}
              onRun={handleOperation}
            />

            <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
              {activeOperation ? (
                <>
                  <span className="font-medium text-slate-700">当前操作：</span>
                  <span>{activeOperation.label}</span>
                  <span className="mx-1 text-slate-300">|</span>
                  <span>{activeOperation.hint}</span>
                </>
              ) : (
                <span>提示：请输入文本后，点击上方任意操作按钮。</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Input</span>
            <span className="text-xs text-slate-400">{input.length} chars</span>
          </div>

          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="在此输入文本、URL、JWT、Cookie 或 Gzip Base64..."
            className="custom-scrollbar flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-700 transition-colors focus:bg-white focus:outline-none"
          />
        </div>

        <div className="group relative flex h-full flex-col bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Output</span>
            <button
              onClick={handleCopy}
              disabled={!output}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all',
                output ? 'text-slate-600 hover:bg-slate-100 active:scale-95' : 'cursor-not-allowed text-slate-300',
              )}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-green-600">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>复制结果</span>
                </>
              )}
            </button>
          </div>

          <textarea
            value={output}
            readOnly
            placeholder="结果..."
            className="custom-scrollbar h-full flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-700 selection:bg-indigo-100 selection:text-indigo-900 focus:outline-none"
          />
        </div>
      </ToolMain>
    </ToolPageShell>
  );
}

type OperationGroupProps = {
  title: string;
  group: EncodingOperationGroup;
  operations: readonly EncodingOperationDefinition[];
  activeOperationId: string | null;
  onRun: (operation: EncodingOperationDefinition) => void;
};

function OperationGroup({ title, group, operations, activeOperationId, onRun }: OperationGroupProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {group === 'encrypt' ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
        <span>{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {operations.map((operation) => {
          const isActive = activeOperationId === operation.id;
          return (
            <button
              key={operation.id}
              onClick={() => onRun(operation)}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800',
              )}
              title={operation.hint}
            >
              {operation.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default EncodingTools;
