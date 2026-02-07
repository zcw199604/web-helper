import * as XLSX from 'xlsx';

export type SqlDialect = 'mysql' | 'oracle' | 'pg';
export type DelimiterMode = 'auto' | 'tab' | 'comma';

export type NormalizedTableData = {
  columns: string[];
  rows: Record<string, unknown>[];
};

export type ParsedWorkbookData = {
  sheetNames: string[];
  defaultSheetName: string;
  sheets: Record<string, NormalizedTableData>;
};

export type ParseTableTextOptions = {
  delimiter?: DelimiterMode;
};

export type ToJsonOptions = {
  indent?: number;
};

export type ToSqlOptions = {
  dialect: SqlDialect;
  tableName: string;
};

export type ToXmlOptions = {
  rootName?: string;
  rowName?: string;
};

/**
 * 解析粘贴的表格文本（TSV/CSV）并归一化。
 *
 * @param input 原始粘贴文本。
 * @param options 解析选项（分隔符策略）。
 * @returns 归一化后的列和行。
 */
export function parseTableText(
  input: string,
  options: ParseTableTextOptions = {},
): NormalizedTableData {
  const normalizedInput = input.replace(/\r\n?/g, '\n').trim();
  if (!normalizedInput) {
    throw new Error('请先粘贴表格数据');
  }

  const rawLines = normalizedInput.split('\n');
  const lines = rawLines.filter((line) => line.trim() !== '');
  if (lines.length === 0) {
    throw new Error('粘贴内容为空，无法解析');
  }

  const delimiter = resolveDelimiter(lines, options.delimiter ?? 'auto');
  const matrix = lines.map((line) => splitDelimitedLine(line, delimiter));

  return normalizeTableMatrix(matrix);
}

/**
 * 解析 Excel 二进制并提取全部工作表的归一化数据。
 *
 * @param arrayBuffer Excel 文件二进制。
 * @returns 包含工作表名称及每个工作表数据的对象。
 */
export function parseExcelWorkbook(arrayBuffer: ArrayBuffer): ParsedWorkbookData {
  if (arrayBuffer.byteLength === 0) {
    throw new Error('Excel 文件内容为空');
  }

  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
  });

  const sheetNames = workbook.SheetNames.filter((name) => !!name);
  if (sheetNames.length === 0) {
    throw new Error('未检测到可用工作表');
  }

  const sheets: Record<string, NormalizedTableData> = {};

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      sheets[sheetName] = { columns: [], rows: [] };
      continue;
    }

    const matrix = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    }) as unknown[][];

    if (matrix.length === 0) {
      sheets[sheetName] = { columns: [], rows: [] };
      continue;
    }

    sheets[sheetName] = normalizeTableMatrix(matrix);
  }

  return {
    sheetNames,
    defaultSheetName: sheetNames[0],
    sheets,
  };
}

/**
 * 将归一化后的数据导出为 JSON 文本。
 *
 * @param data 归一化数据。
 * @param options JSON 导出选项。
 * @returns JSON 字符串。
 */
export function toJsonText(data: NormalizedTableData, options: ToJsonOptions = {}): string {
  return JSON.stringify(data.rows, null, options.indent ?? 2);
}

/**
 * 将归一化后的数据导出为 INSERT SQL 文本。
 *
 * @param data 归一化数据。
 * @param options SQL 导出选项。
 * @returns INSERT SQL 字符串。
 */
export function toInsertSqlText(data: NormalizedTableData, options: ToSqlOptions): string {
  const tableName = options.tableName.trim();
  if (!tableName) {
    throw new Error('表名不能为空');
  }

  if (data.columns.length === 0) {
    throw new Error('没有可用列，无法生成 SQL');
  }

  if (data.rows.length === 0) {
    return '-- 无可导出的数据行';
  }

  const quotedTable = quoteQualifiedIdentifier(tableName, options.dialect);
  const quotedColumns = data.columns.map((column) => quoteIdentifier(column, options.dialect));

  return data.rows
    .map((row) => {
      const values = data.columns.map((column) => formatSqlValue(row[column], options.dialect));
      return `INSERT INTO ${quotedTable} (${quotedColumns.join(', ')}) VALUES (${values.join(', ')});`;
    })
    .join('\n');
}

/**
 * 将归一化后的数据导出为 XML 文本。
 *
 * @param data 归一化数据。
 * @param options XML 导出选项。
 * @returns XML 字符串。
 */
export function toXmlText(data: NormalizedTableData, options: ToXmlOptions = {}): string {
  const rootTag = sanitizeXmlTagName(options.rootName ?? 'rows', 'rows');
  const rowTag = sanitizeXmlTagName(options.rowName ?? 'row', 'row');

  if (data.columns.length === 0 || data.rows.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag} />`;
  }

  const columnTags = buildUniqueXmlTags(data.columns);
  const rowBlocks = data.rows.map((row) => {
    const cellBlocks = data.columns
      .map((column, index) => {
        const value = formatXmlValue(row[column]);
        const tag = columnTags[index];
        return `    <${tag}>${escapeXmlText(value)}</${tag}>`;
      })
      .join('\n');

    return `  <${rowTag}>\n${cellBlocks}\n  </${rowTag}>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<${rootTag}>`,
    ...rowBlocks,
    `</${rootTag}>`,
  ].join('\n');
}

function resolveDelimiter(lines: string[], mode: DelimiterMode): '\t' | ',' {
  if (mode === 'tab') return '\t';
  if (mode === 'comma') return ',';

  const previewLines = lines.slice(0, 5);
  const tabScore = previewLines.reduce((score, line) => {
    const cells = splitDelimitedLine(line, '\t');
    return score + Math.max(0, cells.length - 1);
  }, 0);

  const commaScore = previewLines.reduce((score, line) => {
    const cells = splitDelimitedLine(line, ',');
    return score + Math.max(0, cells.length - 1);
  }, 0);

  // Excel/WPS 复制表格默认是 TSV，分值相同时优先按 tab 解析。
  return tabScore >= commaScore ? '\t' : ',';
}

function splitDelimitedLine(line: string, delimiter: '\t' | ','): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function normalizeTableMatrix(matrix: unknown[][]): NormalizedTableData {
  if (matrix.length === 0) {
    throw new Error('数据为空，无法转换');
  }

  const headerRow = matrix[0] ?? [];
  const columns = normalizeHeaders(headerRow);
  if (columns.length === 0) {
    throw new Error('未检测到有效表头');
  }

  const rows: Record<string, unknown>[] = [];

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const sourceRow = matrix[rowIndex] ?? [];
    const rowObject: Record<string, unknown> = {};
    let hasValue = false;

    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      const column = columns[columnIndex];
      const normalizedValue = normalizeCellValue(sourceRow[columnIndex]);
      rowObject[column] = normalizedValue;

      if (normalizedValue !== null) {
        hasValue = true;
      }
    }

    if (hasValue) {
      rows.push(rowObject);
    }
  }

  return {
    columns,
    rows,
  };
}

function normalizeHeaders(headerRow: unknown[]): string[] {
  const usedNames = new Map<string, number>();

  return headerRow.map((header, index) => {
    const raw = header === null || header === undefined ? '' : String(header).trim();
    const base = raw || `column_${index + 1}`;
    const key = base.toLowerCase();
    const count = usedNames.get(key) ?? 0;

    usedNames.set(key, count + 1);

    if (count === 0) return base;
    return `${base}_${count + 1}`;
  });
}

function normalizeCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString();
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^(true|false)$/i.test(trimmed)) {
      return trimmed.toLowerCase() === 'true';
    }

    // 避免把 001 这类字符串错误转为数字，仅转换无前导零的数字文本。
    if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(trimmed)) {
      if (!(trimmed.startsWith('0') && trimmed.length > 1 && !trimmed.startsWith('0.'))) {
        return Number(trimmed);
      }
    }

    return trimmed;
  }

  return String(value);
}

function quoteQualifiedIdentifier(identifier: string, dialect: SqlDialect): string {
  const parts = identifier
    .split('.')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    throw new Error('表名格式不合法');
  }

  return parts.map((part) => quoteIdentifier(part, dialect)).join('.');
}

function quoteIdentifier(identifier: string, dialect: SqlDialect): string {
  const trimmed = identifier.trim();
  if (!trimmed) {
    throw new Error('字段名不能为空');
  }

  if (dialect === 'mysql') {
    return `\`${trimmed.replace(/`/g, '``')}\``;
  }

  const normalized = dialect === 'oracle' ? trimmed.toUpperCase() : trimmed;
  return `"${normalized.replace(/"/g, '""')}"`;
}

function formatSqlValue(value: unknown, dialect: SqlDialect): string {
  if (value === null || value === undefined) return 'NULL';

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'NULL';
    return String(value);
  }

  if (typeof value === 'boolean') {
    if (dialect === 'oracle') return value ? '1' : '0';
    return value ? 'TRUE' : 'FALSE';
  }

  if (typeof value === 'string') {
    return `'${escapeSqlString(value)}'`;
  }

  if (value instanceof Date) {
    return `'${escapeSqlString(value.toISOString())}'`;
  }

  return `'${escapeSqlString(JSON.stringify(value))}'`;
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function formatXmlValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeXmlTagName(rawName: string, fallback: string): string {
  const trimmed = rawName.trim();
  const base = trimmed || fallback;
  const cleaned = base.replace(/[^A-Za-z0-9_.-]/g, '_');

  if (/^[A-Za-z_]/.test(cleaned)) {
    return cleaned;
  }

  return `_${cleaned}`;
}

function buildUniqueXmlTags(columns: string[]): string[] {
  const used = new Map<string, number>();

  return columns.map((column, index) => {
    const base = sanitizeXmlTagName(column, `column_${index + 1}`);
    const key = base.toLowerCase();
    const count = used.get(key) ?? 0;

    used.set(key, count + 1);

    if (count === 0) return base;
    return `${base}_${count + 1}`;
  });
}
