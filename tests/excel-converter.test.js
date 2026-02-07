import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';

import {
  parseExcelWorkbook,
  parseTableText,
  toInsertSqlText,
  toJsonText,
  toXmlText,
} from '../utils/excel-converter.ts';

test('parseTableText: 默认按 TSV 解析 Excel 粘贴文本', () => {
  const input = ['id\tname\tactive', '1\tAlice\ttrue', '2\tBob\tfalse'].join('\n');

  const result = parseTableText(input);

  assert.deepEqual(result.columns, ['id', 'name', 'active']);
  assert.deepEqual(result.rows, [
    { id: 1, name: 'Alice', active: true },
    { id: 2, name: 'Bob', active: false },
  ]);
});

test('parseTableText: CSV 模式支持引号与逗号', () => {
  const input = ['id,name,comment', '1,"alice","hello,world"'].join('\n');

  const result = parseTableText(input, { delimiter: 'comma' });

  assert.deepEqual(result.columns, ['id', 'name', 'comment']);
  assert.deepEqual(result.rows, [{ id: 1, name: 'alice', comment: 'hello,world' }]);
});

test('parseTableText: 空表头与重复表头会自动修正', () => {
  const input = ['name,,name', 'a,1,b'].join('\n');

  const result = parseTableText(input, { delimiter: 'comma' });

  assert.deepEqual(result.columns, ['name', 'column_2', 'name_2']);
  assert.deepEqual(result.rows, [{ name: 'a', column_2: 1, name_2: 'b' }]);
});

test('toJsonText: 输出格式化 JSON', () => {
  const data = parseTableText(['id\tname', '1\tAlice'].join('\n'));
  const output = toJsonText(data, { indent: 2 });

  assert.match(output, /\n  \{/);
  assert.match(output, /"name": "Alice"/);
});

test('toInsertSqlText: mysql/oracle/pg 方言差异正确', () => {
  const data = {
    columns: ['id', 'user_name', 'note'],
    rows: [{ id: 1, user_name: 'alice', note: "O'Reilly" }],
  };

  const mysql = toInsertSqlText(data, { dialect: 'mysql', tableName: 'users' });
  const oracle = toInsertSqlText(data, { dialect: 'oracle', tableName: 'users' });
  const pg = toInsertSqlText(data, { dialect: 'pg', tableName: 'users' });

  assert.match(mysql, /INSERT INTO `users` \(`id`, `user_name`, `note`\)/);
  assert.match(oracle, /INSERT INTO "USERS" \("ID", "USER_NAME", "NOTE"\)/);
  assert.match(pg, /INSERT INTO "users" \("id", "user_name", "note"\)/);
  assert.match(mysql, /'O''Reilly'/);
});

test('toInsertSqlText: 无数据行时返回注释提示', () => {
  const sql = toInsertSqlText({ columns: ['id'], rows: [] }, { dialect: 'mysql', tableName: 't1' });
  assert.equal(sql, '-- 无可导出的数据行');
});

test('toXmlText: 转义 XML 特殊字符', () => {
  const xml = toXmlText({
    columns: ['name', 'remark'],
    rows: [{ name: '<Alice>', remark: 'Tom & Jerry "ok"' }],
  });

  assert.match(xml, /&lt;Alice&gt;/);
  assert.match(xml, /Tom &amp; Jerry &quot;ok&quot;/);
});

test('parseExcelWorkbook: 解析 workbook 并提取 sheet 数据', () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['id', 'name'],
    [1, 'Alice'],
    [2, 'Bob'],
  ]);

  XLSX.utils.book_append_sheet(workbook, sheet, 'Users');

  const binary = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const parsed = parseExcelWorkbook(binary);

  assert.deepEqual(parsed.sheetNames, ['Users']);
  assert.equal(parsed.defaultSheetName, 'Users');
  assert.deepEqual(parsed.sheets.Users.columns, ['id', 'name']);
  assert.deepEqual(parsed.sheets.Users.rows, [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]);
});

test('toInsertSqlText: 表名为空时抛错（异常场景）', () => {
  assert.throws(
    () =>
      toInsertSqlText(
        {
          columns: ['id'],
          rows: [{ id: 1 }],
        },
        { dialect: 'mysql', tableName: '   ' },
      ),
    /表名不能为空/,
  );
});

test('parseTableText: 空输入抛错（边界场景）', () => {
  assert.throws(() => parseTableText('   '), /请先粘贴表格数据/);
});
