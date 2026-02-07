import { useCallback, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import {
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileUp,
  Play,
  Table,
  Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  parseExcelWorkbook,
  parseTableText,
  toInsertSqlText,
  toJsonText,
  toXmlText,
  type DelimiterMode,
  type NormalizedTableData,
  type ParsedWorkbookData,
  type SqlDialect,
} from '@/utils/excel-converter';
import { ToolHeader, ToolMain, ToolPageShell } from '@/components/ui/ToolLayout';

type OutputType = 'json' | 'sql' | 'xml';
type InputMode = 'paste' | 'file';

function ExcelConverter() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputMode, setInputMode] = useState<InputMode>('paste');
  const [pasteText, setPasteText] = useState('');
  const [delimiterMode, setDelimiterMode] = useState<DelimiterMode>('auto');

  const [workbookData, setWorkbookData] = useState<ParsedWorkbookData | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

  const [outputType, setOutputType] = useState<OutputType>('json');
  const [sqlDialect, setSqlDialect] = useState<SqlDialect>('mysql');
  const [tableName, setTableName] = useState('my_table');

  const [xmlRootName, setXmlRootName] = useState('rows');
  const [xmlRowName, setXmlRowName] = useState('row');

  const [outputText, setOutputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const previewResult = useMemo(() => {
    try {
      if (inputMode === 'paste') {
        if (!pasteText.trim()) {
          return {
            data: null as NormalizedTableData | null,
            message: '请先粘贴 Excel/CSV 表格数据（默认优先粘贴）',
            error: null,
          };
        }

        const parsed = parseTableText(pasteText, { delimiter: delimiterMode });
        return {
          data: parsed,
          message: `已解析：${parsed.columns.length} 列 / ${parsed.rows.length} 行`,
          error: null,
        };
      }

      if (!workbookData) {
        return {
          data: null as NormalizedTableData | null,
          message: '请先导入 Excel 文件',
          error: null,
        };
      }

      const activeSheetName = selectedSheetName || workbookData.defaultSheetName;
      const activeSheet = workbookData.sheets[activeSheetName];
      if (!activeSheet) {
        return {
          data: null as NormalizedTableData | null,
          message: '请选择有效工作表',
          error: '当前选择的工作表不存在',
        };
      }

      return {
        data: activeSheet,
        message: `文件：${selectedFileName || '未命名'} · 工作表：${activeSheetName} · ${activeSheet.columns.length} 列 / ${activeSheet.rows.length} 行`,
        error: null,
      };
    } catch (e) {
      return {
        data: null as NormalizedTableData | null,
        message: '输入数据解析失败',
        error: (e as Error).message,
      };
    }
  }, [delimiterMode, inputMode, pasteText, selectedFileName, selectedSheetName, workbookData]);

  const handlePickFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const lowerName = file.name.toLowerCase();
      if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
        throw new Error('仅支持 .xlsx / .xls 文件');
      }

      const buffer = await file.arrayBuffer();
      const parsed = parseExcelWorkbook(buffer);

      setWorkbookData(parsed);
      setSelectedSheetName(parsed.defaultSheetName);
      setSelectedFileName(file.name);
      setInputMode('file');
      setError(null);
      setOutputText('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      // 允许重复选择同一个文件。
      event.target.value = '';
    }
  }, []);

  const handleConvert = useCallback(() => {
    try {
      if (!previewResult.data) {
        throw new Error('暂无可转换的数据');
      }

      let converted = '';
      if (outputType === 'json') {
        converted = toJsonText(previewResult.data, { indent: 2 });
      } else if (outputType === 'sql') {
        converted = toInsertSqlText(previewResult.data, {
          dialect: sqlDialect,
          tableName,
        });
      } else {
        converted = toXmlText(previewResult.data, {
          rootName: xmlRootName,
          rowName: xmlRowName,
        });
      }

      setOutputText(converted);
      setError(null);
    } catch (e) {
      setOutputText('');
      setError((e as Error).message);
    }
  }, [outputType, previewResult.data, sqlDialect, tableName, xmlRootName, xmlRowName]);

  const handleCopy = useCallback(async () => {
    if (!outputText) return;

    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [outputText]);

  const handleDownload = useCallback(() => {
    if (!outputText) return;

    const extension = outputType === 'json' ? 'json' : outputType === 'sql' ? 'sql' : 'xml';
    const fileBaseName = tableName.trim() || 'excel_export';
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${fileBaseName}.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [outputText, outputType, tableName]);

  const handleClear = useCallback(() => {
    setPasteText('');
    setWorkbookData(null);
    setSelectedSheetName('');
    setSelectedFileName('');
    setOutputText('');
    setError(null);
    setCopied(false);
    setInputMode('paste');
  }, []);

  return (
    <ToolPageShell>
      <ToolHeader
        title="Excel 转换"
        description="默认直接粘贴表格数据，支持导出 JSON / INSERT SQL / XML（MySQL / Oracle / PostgreSQL）"
        icon={<FileSpreadsheet className="w-5 h-5" />}
        iconClassName="bg-emerald-50 text-emerald-600"
        actions={
          <>
            <button onClick={handleConvert} className="btn btn-secondary gap-2" disabled={!previewResult.data}>
              <Play className="w-4 h-4" />
              <span>转换</span>
            </button>
            <button onClick={handleCopy} disabled={!outputText} className="btn btn-secondary gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '已复制' : '复制结果'}</span>
            </button>
            <button onClick={handleDownload} disabled={!outputText} className="btn btn-secondary gap-2">
              <Download className="w-4 h-4" />
              <span>下载</span>
            </button>
            <button onClick={handleClear} className="btn btn-ghost gap-2">
              <Trash2 className="w-4 h-4" />
              <span>清空</span>
            </button>
          </>
        }
        toolbar={
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">输入方式</span>
              <ModeButton active={inputMode === 'paste'} onClick={() => setInputMode('paste')}>
                默认粘贴
              </ModeButton>
              <ModeButton active={inputMode === 'file'} onClick={() => setInputMode('file')}>
                文件导入（可选）
              </ModeButton>
              <button onClick={handlePickFile} className="btn btn-secondary gap-2 px-3 py-1.5 text-xs">
                <FileUp className="w-4 h-4" />
                <span>导入 Excel</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">输出类型</span>
              <ModeButton active={outputType === 'json'} onClick={() => setOutputType('json')}>
                JSON
              </ModeButton>
              <ModeButton active={outputType === 'sql'} onClick={() => setOutputType('sql')}>
                INSERT SQL
              </ModeButton>
              <ModeButton active={outputType === 'xml'} onClick={() => setOutputType('xml')}>
                XML
              </ModeButton>
            </div>

            {outputType === 'sql' ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">SQL 方言</span>
                <select
                  value={sqlDialect}
                  onChange={(event) => setSqlDialect(event.target.value as SqlDialect)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  <option value="mysql">MySQL</option>
                  <option value="oracle">Oracle</option>
                  <option value="pg">PostgreSQL</option>
                </select>

                <span className="text-xs text-slate-500">表名</span>
                <input
                  value={tableName}
                  onChange={(event) => setTableName(event.target.value)}
                  className="min-w-44 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                  placeholder="my_table"
                />
              </div>
            ) : null}

            {outputType === 'xml' ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Root</span>
                <input
                  value={xmlRootName}
                  onChange={(event) => setXmlRootName(event.target.value)}
                  className="min-w-32 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                  placeholder="rows"
                />

                <span className="text-xs text-slate-500">Row</span>
                <input
                  value={xmlRowName}
                  onChange={(event) => setXmlRowName(event.target.value)}
                  className="min-w-32 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                  placeholder="row"
                />
              </div>
            ) : null}

            {inputMode === 'paste' ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">分隔符</span>
                <select
                  value={delimiterMode}
                  onChange={(event) => setDelimiterMode(event.target.value as DelimiterMode)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  <option value="auto">自动（推荐）</option>
                  <option value="tab">Tab（Excel复制默认）</option>
                  <option value="comma">逗号（CSV）</option>
                </select>
              </div>
            ) : null}

            {inputMode === 'file' && workbookData ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>工作表</span>
                <select
                  value={selectedSheetName}
                  onChange={(event) => setSelectedSheetName(event.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  {workbookData.sheetNames.map((sheetName) => (
                    <option key={sheetName} value={sheetName}>
                      {sheetName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Table className="h-4 w-4 text-slate-500" />
                <span>{previewResult.message}</span>
              </div>
              {previewResult.error ? <div className="mt-1 text-red-600">解析错误：{previewResult.error}</div> : null}
              {error ? <div className="mt-1 text-red-600">转换错误：{error}</div> : null}
            </div>
          </div>
        }
      />

      <ToolMain className="grid min-h-0 grid-cols-2 divide-x divide-slate-100 overflow-hidden">
        <div className="flex min-h-0 flex-col bg-slate-50/30">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">输入区</span>
          </div>

          {inputMode === 'paste' ? (
            <textarea
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              placeholder="直接粘贴 Excel / WPS / Google Sheets 数据（默认主入口）"
              className="custom-scrollbar h-full flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-700 focus:bg-white focus:outline-none"
            />
          ) : (
            <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 p-4 text-center text-sm text-slate-500">
              <FileSpreadsheet className="h-10 w-10 text-slate-300" />
              {selectedFileName ? (
                <>
                  <div className="font-medium text-slate-700">已导入：{selectedFileName}</div>
                  <div className="text-xs text-slate-500">可切换工作表并点击“转换”</div>
                </>
              ) : (
                <>
                  <div className="font-medium text-slate-700">尚未导入 Excel 文件</div>
                  <div className="text-xs text-slate-500">点击上方“导入 Excel”按钮（可选入口）</div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">输出区</span>
            <span className="text-xs text-slate-400">{outputType.toUpperCase()}</span>
          </div>

          <textarea
            value={outputText}
            readOnly
            placeholder="转换结果..."
            className="custom-scrollbar h-full flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-700 selection:bg-emerald-100 selection:text-emerald-900 focus:outline-none"
          />
        </div>
      </ToolMain>
    </ToolPageShell>
  );
}

type ModeButtonProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ModeButton({ active, onClick, children }: ModeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
        active
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800',
      )}
    >
      {children}
    </button>
  );
}

export default ExcelConverter;
