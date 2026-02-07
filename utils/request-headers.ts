/**
 * 请求 Header 过滤工具函数
 *
 * 功能：
 * 1) 自动移除 DevTools 复制请求中常见的浏览器噪音 Header。
 * 2) 支持按 Header 行进行手动勾选删除。
 */

import type { NameValuePair } from './curl';

const AUTO_REMOVE_HEADER_NAMES = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'cache-control',
  'connection',
  'content-length',
  'dnt',
  'host',
  'pragma',
  'priority',
  'referer',
  'user-agent',
]);

const AUTO_REMOVE_HEADER_PREFIXES = ['sec-ch-', 'sec-fetch-'];

export interface RequestHeaderItem extends NameValuePair {
  id: string;
  normalizedName: string;
  autoRemovable: boolean;
}

export interface FilterRequestHeadersOptions {
  autoRemoveNoiseHeaders: boolean;
  manualRemovedHeaderIds?: Iterable<string>;
}

export interface FilterRequestHeadersResult {
  headers: NameValuePair[];
  items: RequestHeaderItem[];
  autoRemovedIds: string[];
  manualRemovedIds: string[];
}

export function normalizeHeaderName(name: string): string {
  return name.trim().toLowerCase();
}

export function isNoiseHeaderName(name: string): boolean {
  const normalizedName = normalizeHeaderName(name);
  if (!normalizedName) return false;

  if (AUTO_REMOVE_HEADER_NAMES.has(normalizedName)) return true;
  return AUTO_REMOVE_HEADER_PREFIXES.some((prefix) => normalizedName.startsWith(prefix));
}

export function createRequestHeaderItems(headers: NameValuePair[]): RequestHeaderItem[] {
  const occurrences = new Map<string, number>();

  return headers.map((header) => {
    const normalizedName = normalizeHeaderName(header.name);
    const index = (occurrences.get(normalizedName) ?? 0) + 1;
    occurrences.set(normalizedName, index);

    return {
      ...header,
      id: `${normalizedName}#${index}`,
      normalizedName,
      autoRemovable: isNoiseHeaderName(header.name),
    };
  });
}

export function filterRequestHeaders(
  headers: NameValuePair[],
  options: FilterRequestHeadersOptions,
): FilterRequestHeadersResult {
  const items = createRequestHeaderItems(headers);
  const manualRemovedHeaderIdSet = new Set(options.manualRemovedHeaderIds);

  const keptHeaders: NameValuePair[] = [];
  const autoRemovedIds: string[] = [];
  const manualRemovedIds: string[] = [];

  for (const item of items) {
    const removedByManual = manualRemovedHeaderIdSet.has(item.id);
    const removedByAuto = options.autoRemoveNoiseHeaders && item.autoRemovable;

    if (removedByManual) {
      manualRemovedIds.push(item.id);
    }

    if (removedByAuto) {
      autoRemovedIds.push(item.id);
    }

    if (!removedByManual && !removedByAuto) {
      keptHeaders.push({ name: item.name, value: item.value });
    }
  }

  return {
    headers: keptHeaders,
    items,
    autoRemovedIds,
    manualRemovedIds,
  };
}
