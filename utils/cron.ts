/**
 * Cron 表达式工具函数
 */

import { CronExpressionParser } from 'cron-parser';
import cronstrue from 'cronstrue/i18n';

/**
 * 解析 Cron 表达式并获取下次执行时间
 * @param expression Cron 表达式
 * @param count 获取的执行时间数量
 * @returns 下次执行时间列表
 */
export function getNextExecutions(expression: string, count: number = 5): Date[] {
  const interval = CronExpressionParser.parse(expression);
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(interval.next().toDate());
  }
  return dates;
}

/**
 * 将 Cron 表达式转换为人类可读的描述
 * @param expression Cron 表达式
 * @param locale 语言，默认中文
 * @returns 人类可读的描述
 */
export function cronToHuman(expression: string, locale: string = 'zh_CN'): string {
  return cronstrue.toString(expression, { locale });
}

/**
 * 验证 Cron 表达式是否有效
 * @param expression Cron 表达式
 * @returns 验证结果
 */
export function validateCron(expression: string): { valid: boolean; error?: string } {
  try {
    CronExpressionParser.parse(expression);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}

/**
 * Cron 表达式字段说明
 */
export const CRON_FIELDS = [
  { name: '秒', range: '0-59', optional: true },
  { name: '分', range: '0-59', optional: false },
  { name: '时', range: '0-23', optional: false },
  { name: '日', range: '1-31', optional: false },
  { name: '月', range: '1-12', optional: false },
  { name: '周', range: '0-7', optional: false },
];

/**
 * 常用 Cron 表达式示例
 */
export const CRON_EXAMPLES = [
  { expression: '0 * * * *', description: '每小时执行' },
  { expression: '0 0 * * *', description: '每天零点执行' },
  { expression: '0 0 * * 1', description: '每周一零点执行' },
  { expression: '0 0 1 * *', description: '每月1号零点执行' },
  { expression: '*/5 * * * *', description: '每5分钟执行' },
  { expression: '0 9-18 * * 1-5', description: '工作日9点到18点每小时执行' },
];
