import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Eraser,
  FileJson,
  ListChecks,
  Play,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ToolHeader, ToolMain, ToolPageShell } from '@/components/ui/ToolLayout';
import {
  applyJsonCleanStrategy,
  type JsonCleanResult,
  type JsonCleanStrategy,
  type JsonCleanStrategyDraft,
  validateStrategy,
} from '@/utils/json-cleaner';
import {
  deleteJsonCleanStrategy,
  listJsonCleanStrategies,
  upsertJsonCleanStrategy,
} from '@/utils/json-clean-strategy-store';
import { consumeJsonCleanerPrefill } from '@/utils/json-cleaner-handoff';

function normalizeExpressionsText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatStrategyToText(strategy: JsonCleanStrategy): string {
  return strategy.expressions.join('\n');
}

function formatOutput(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export default function JsonCleaner() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [summary, setSummary] = useState<JsonCleanResult['summary'] | null>(null);
  const [details, setDetails] = useState<JsonCleanResult['details']>([]);

  const [strategies, setStrategies] = useState<JsonCleanStrategy[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState('');

  const [strategyName, setStrategyName] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [expressionsText, setExpressionsText] = useState('');

  const [handoffMessage, setHandoffMessage] = useState<string | null>(null);
  const [pendingAutoRunText, setPendingAutoRunText] = useState<string | null>(null);

  const expressionList = useMemo(() => normalizeExpressionsText(expressionsText), [expressionsText]);
  const validation = useMemo(() => validateStrategy({ expressions: expressionList }), [expressionList]);

  const reloadStrategies = useCallback(() => {
    setStrategies(listJsonCleanStrategies());
  }, []);

  const resetEditor = useCallback(() => {
    setSelectedStrategyId('');
    setStrategyName('');
    setStrategyDescription('');
    setExpressionsText('');
  }, []);

  const loadStrategyToEditor = useCallback((strategy: JsonCleanStrategy) => {
    setSelectedStrategyId(strategy.id);
    setStrategyName(strategy.name);
    setStrategyDescription(strategy.description ?? '');
    setExpressionsText(formatStrategyToText(strategy));
  }, []);

  useEffect(() => {
    const list = listJsonCleanStrategies();
    setStrategies(list);

    if (list.length > 0) {
      loadStrategyToEditor(list[0]);
    }

    const handoffPayload = consumeJsonCleanerPrefill();
    if (handoffPayload) {
      setInputText(handoffPayload.jsonText);
      setHandoffMessage('已从 JSON 格式化工具导入内容');

      if (handoffPayload.autoRun) {
        setPendingAutoRunText(handoffPayload.jsonText);
      }
    }
  }, [loadStrategyToEditor]);

  const runCleanWithText = useCallback(
    (sourceText: string) => {
      try {
        const draft: JsonCleanStrategyDraft = {
          name: strategyName.trim() || '临时策略',
          description: strategyDescription,
          expressions: expressionList,
        };

        const result = applyJsonCleanStrategy(sourceText, draft);
        setOutputText(formatOutput(result.cleaned));
        setSummary(result.summary);
        setDetails(result.details);
        setError(null);
      } catch (e) {
        setOutputText('');
        setSummary(null);
        setDetails([]);
        setError((e as Error).message);
      }
    },
    [expressionList, strategyDescription, strategyName],
  );

  const handleRunClean = useCallback(() => {
    runCleanWithText(inputText);
  }, [inputText, runCleanWithText]);

  useEffect(() => {
    if (!pendingAutoRunText) return;

    if (expressionList.length === 0) {
      setHandoffMessage('已导入格式化 JSON，请先配置清理规则后再执行');
      setPendingAutoRunText(null);
      return;
    }

    runCleanWithText(pendingAutoRunText);
    setPendingAutoRunText(null);
    setHandoffMessage('已自动执行清理，可直接查看输出结果');
  }, [expressionList.length, pendingAutoRunText, runCleanWithText]);

  const handleSaveStrategy = useCallback(() => {
    const saveResult = upsertJsonCleanStrategy({
      id: selectedStrategyId || undefined,
      name: strategyName,
      description: strategyDescription,
      expressions: expressionList,
    });

    if (!saveResult.ok) {
      setError(saveResult.error);
      return;
    }

    reloadStrategies();
    loadStrategyToEditor(saveResult.strategy);
    setError(null);
  }, [expressionList, loadStrategyToEditor, reloadStrategies, selectedStrategyId, strategyDescription, strategyName]);

  const handleDeleteStrategy = useCallback(() => {
    if (!selectedStrategyId) {
      setError('请先选择要删除的策略');
      return;
    }

    if (!window.confirm('确认删除当前策略吗？此操作不可撤销。')) {
      return;
    }

    const result = deleteJsonCleanStrategy(selectedStrategyId);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    const latest = listJsonCleanStrategies();
    setStrategies(latest);

    if (latest.length > 0) {
      loadStrategyToEditor(latest[0]);
    } else {
      resetEditor();
    }

    setError(null);
  }, [loadStrategyToEditor, resetEditor, selectedStrategyId]);

  const handleCopy = useCallback(async () => {
    if (!outputText) return;

    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [outputText]);

  const handleDownload = useCallback(() => {
    if (!outputText) return;

    const blob = new Blob([outputText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'cleaned.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [outputText]);

  const handleClearAll = useCallback(() => {
    setInputText('');
    setOutputText('');
    setSummary(null);
    setDetails([]);
    setError(null);
    setCopied(false);
    setShowDetails(false);
    setHandoffMessage(null);
    setPendingAutoRunText(null);

    // 清空当前策略选择与编辑内容，但不删除已保存策略。
    resetEditor();
  }, [resetEditor]);

  const selectedStrategyLabel = selectedStrategyId
    ? strategies.find((item) => item.id === selectedStrategyId)?.name ?? '未命名策略'
    : '临时策略';

  return (
    <ToolPageShell>
      <ToolHeader
        title="JSON 清理"
        description="按策略剔除多余字段，输出可分享的新 JSON"
        icon={<Eraser className="h-5 w-5" />}
        iconClassName="bg-cyan-50 text-cyan-600"
        actions={
          <>
            <button onClick={handleRunClean} className="btn btn-primary gap-2">
              <Play className="h-4 w-4" />
              <span>执行清理</span>
            </button>
            <button onClick={handleCopy} disabled={!outputText} className="btn btn-secondary gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? '已复制' : '复制'}</span>
            </button>
            <button onClick={handleDownload} disabled={!outputText} className="btn btn-secondary gap-2">
              <Download className="h-4 w-4" />
              <span>下载</span>
            </button>
            <button onClick={handleClearAll} className="btn btn-ghost gap-2">
              <Trash2 className="h-4 w-4" />
              <span>清空</span>
            </button>
          </>
        }
        toolbar={
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">策略</span>
              <select
                value={selectedStrategyId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  if (!nextId) {
                    resetEditor();
                    return;
                  }

                  const found = strategies.find((item) => item.id === nextId);
                  if (found) loadStrategyToEditor(found);
                }}
                className="min-w-56 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
              >
                <option value="">临时策略（未保存）</option>
                {strategies.map((strategy) => (
                  <option key={strategy.id} value={strategy.id}>
                    {strategy.name}
                  </option>
                ))}
              </select>

              <button onClick={resetEditor} className="btn btn-secondary gap-1 px-3 py-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                <span>新建</span>
              </button>
              <button onClick={handleSaveStrategy} className="btn btn-secondary gap-1 px-3 py-1.5 text-xs">
                <Save className="h-3.5 w-3.5" />
                <span>保存</span>
              </button>
              <button onClick={handleDeleteStrategy} className="btn btn-secondary gap-1 px-3 py-1.5 text-xs">
                <Trash2 className="h-3.5 w-3.5" />
                <span>删除</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>当前：{selectedStrategyLabel}</span>
              <span>有效规则：{validation.normalizedExpressions.length}</span>
              <span>异常规则：{validation.issues.length}</span>

              {summary ? (
                <button
                  onClick={() => setShowDetails((previous) => !previous)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1 font-medium transition-colors',
                    showDetails
                      ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-800',
                  )}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  <span>{showDetails ? '收起统计详情' : '查看统计详情'}</span>
                </button>
              ) : null}
            </div>
          </div>
        }
      />

      {error ? (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      ) : null}

      {handoffMessage ? (
        <div className="border-b border-cyan-100 bg-cyan-50 px-4 py-2 text-sm text-cyan-700">{handoffMessage}</div>
      ) : null}

      <ToolMain className="grid min-h-0 grid-cols-1 divide-y divide-slate-100 overflow-hidden xl:grid-cols-2 xl:divide-x xl:divide-y-0">
        <div className="grid min-h-0 grid-rows-2 divide-y divide-slate-100 bg-slate-50/30">
          <section className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">输入区</span>
              <span className="text-xs text-slate-400">{inputText.length} chars</span>
            </div>
            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder="在此粘贴原始 JSON..."
              className="custom-scrollbar h-full flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-700 focus:bg-white focus:outline-none"
              spellCheck={false}
            />
          </section>

          <section className="flex min-h-0 flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">策略区</span>
              <span className="text-xs text-slate-400">每行一条 JSONPath 规则</span>
            </div>
            <div className="custom-scrollbar flex-1 space-y-3 overflow-auto p-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">策略名称</label>
                <input
                  value={strategyName}
                  onChange={(event) => setStrategyName(event.target.value)}
                  placeholder="例如：对外展示清理策略"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">策略说明（可选）</label>
                <input
                  value={strategyDescription}
                  onChange={(event) => setStrategyDescription(event.target.value)}
                  placeholder="描述策略用途，便于团队复用"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">规则列表</label>
                <textarea
                  value={expressionsText}
                  onChange={(event) => setExpressionsText(event.target.value)}
                  placeholder={'$.meta.trace\n$.user.password\n$.items[*].debug'}
                  className="custom-scrollbar min-h-36 w-full resize-y rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                  spellCheck={false}
                />
              </div>

              {validation.issues.length > 0 ? (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-600">
                  <div className="font-medium">检测到规则问题：</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {validation.issues.map((issue) => (
                      <li key={`${issue.expression}-${issue.index}`}>
                        {issue.expression || '(空规则)'}：{issue.error}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-700">
                  规则校验通过，可直接执行清理。
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="flex min-h-0 flex-col bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">输出区</span>
            {summary ? (
              <span className="text-xs text-slate-500">
                命中规则 {summary.matchedRules}/{summary.effectiveRules} · 删除节点 {summary.removedNodes}
              </span>
            ) : (
              <span className="text-xs text-slate-400">等待执行清理</span>
            )}
          </div>

          <textarea
            value={outputText}
            readOnly
            placeholder="清理后的 JSON 输出..."
            className="custom-scrollbar h-full flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-700 focus:outline-none"
            spellCheck={false}
          />

          {showDetails && details.length > 0 ? (
            <div className="max-h-48 border-t border-slate-100 bg-slate-50/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <FileJson className="h-3.5 w-3.5" />
                <span>规则执行明细</span>
              </div>
              <div className="custom-scrollbar max-h-36 space-y-2 overflow-auto">
                {details.map((detail, index) => (
                  <div key={`${detail.expression}-${index}`} className="rounded-md border border-slate-200 bg-white p-2 text-xs">
                    <div className="font-mono text-slate-700">{detail.expression || '(空规则)'}</div>
                    <div className="mt-1 text-slate-500">
                      匹配 {detail.matched} · 删除 {detail.removed} · 重复跳过 {detail.skippedDuplicates}
                    </div>
                    {detail.error ? <div className="mt-1 text-red-500">{detail.error}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </ToolMain>
    </ToolPageShell>
  );
}
