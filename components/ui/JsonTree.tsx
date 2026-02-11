import { memo, useCallback, useMemo, useRef, useState, useTransition } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/utils/cn';
import {
  CloseRowView,
  ContainerRowView,
  LeafRowView,
  MoreRowView,
  type TreeRow,
} from './json-tree/rows';
import type { JsonCleanExtractMode } from '@/utils/json-cleaner-rule-expressions';

interface JsonTreeProps {
  data: any;
  name?: string;
  isLast?: boolean;
  level?: number;
  initiallyExpanded?: boolean;
  expandAll?: boolean;
  path?: string;
  onFillPath?: (path: string) => void;
  onExtractRulePath?: (path: string, mode?: JsonCleanExtractMode) => void;
  onExtractPropertyRule?: (propertyName: string) => void;
  onCleanProperty?: (path: string, propertyName: string) => void;
  className?: string;
}

// Keep initial renders small; users can progressively reveal more.
const CHILD_PAGE_SIZE = 100;
const SIMPLE_KEY_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

// Simple type detection for JSON-ish values.
function getType(value: any) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function isEmptyPlainObject(value: Record<string, unknown>): boolean {
  // Avoid `Object.keys` for large objects: no array allocation, early exit.
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) return false;
  }
  return true;
}

function takeOwnKeys(value: Record<string, unknown>, limit: number): { keys: string[]; hasMore: boolean } {
  const keys: string[] = [];
  if (limit <= 0) return { keys, hasMore: false };

  // Collect up to `limit + 1` keys to detect "has more" without enumerating everything.
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    keys.push(key);
    if (keys.length > limit) {
      keys.pop();
      return { keys, hasMore: true };
    }
  }

  return { keys, hasMore: false };
}

function JsonTreeImpl({
  data,
  name,
  isLast = true,
  level = 0,
  initiallyExpanded,
  expandAll,
  path = '$',
  onFillPath,
  onExtractRulePath,
  onExtractPropertyRule,
  onCleanProperty,
  className,
}: JsonTreeProps) {
  const [isPending, startTransition] = useTransition();
  const [toggledPaths, setToggledPaths] = useState<Set<string>>(() => new Set());
  const [visibleCountByPath, setVisibleCountByPath] = useState<Map<string, number>>(() => new Map());

  const rootDefaultExpanded = expandAll ? true : (initiallyExpanded ?? level === 0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const onToggle = useCallback(
    (nodePath: string) => {
      startTransition(() => {
        setToggledPaths((prev) => {
          const next = new Set(prev);
          if (next.has(nodePath)) next.delete(nodePath);
          else next.add(nodePath);
          return next;
        });
      });
    },
    [startTransition]
  );

  const onShowMore = useCallback(
    (nodePath: string) => {
      startTransition(() => {
        setVisibleCountByPath((prev) => {
          const next = new Map(prev);
          const current = next.get(nodePath) ?? CHILD_PAGE_SIZE;
          next.set(nodePath, current + CHILD_PAGE_SIZE);
          return next;
        });
      });
    },
    [startTransition]
  );

  const rows = useMemo(() => {
    const out: TreeRow[] = [];

    const isExpandedFor = (nodePath: string, depth: number) => {
      const defaultExpanded = depth === 0 ? rootDefaultExpanded : !!expandAll;
      return toggledPaths.has(nodePath) ? !defaultExpanded : defaultExpanded;
    };

    const visibleCountFor = (nodePath: string) => visibleCountByPath.get(nodePath) ?? CHILD_PAGE_SIZE;

    const visit = (
      value: any,
      nodeName: string | undefined,
      nodePath: string,
      nodeLevel: number,
      nodeIsLast: boolean,
      depth: number
    ) => {
      const t = getType(value);

      if (t !== 'object' && t !== 'array') {
        out.push({
          kind: 'leaf',
          id: nodePath,
          level: nodeLevel,
          name: nodeName,
          path: nodePath,
          value,
          isLast: nodeIsLast,
        });
        return;
      }

      const containerType: 'array' | 'object' = t === 'array' ? 'array' : 'object';
      const isEmpty =
        containerType === 'array'
          ? (value as any[]).length === 0
          : isEmptyPlainObject(value as Record<string, unknown>);

      const isExpanded = !isEmpty && isExpandedFor(nodePath, depth);
      out.push({
        kind: 'container',
        id: nodePath,
        level: nodeLevel,
        name: nodeName,
        path: nodePath,
        value,
        containerType,
        isEmpty,
        isExpanded,
        isLast: nodeIsLast,
        arrayLength: containerType === 'array' ? (value as any[]).length : undefined,
      });

      if (isEmpty || !isExpanded) return;

      const childLevel = nodeLevel + 1;

      if (containerType === 'array') {
        const arr = value as any[];
        const total = arr.length;
        const visibleCount = visibleCountFor(nodePath);
        const end = Math.min(total, visibleCount);

        for (let index = 0; index < end; index += 1) {
          visit(arr[index], undefined, `${nodePath}[${index}]`, childLevel, index === total - 1, depth + 1);
        }

        if (total > visibleCount) {
          out.push({
            kind: 'more',
            id: `${nodePath}#more`,
            level: childLevel,
            path: nodePath,
            label: `显示更多...（已显示 ${end} / ${total}）`,
          });
        }
      } else {
        const obj = value as Record<string, unknown>;
        const visibleCount = visibleCountFor(nodePath);
        const { keys, hasMore } = takeOwnKeys(obj, visibleCount);
        const end = keys.length;

        for (let i = 0; i < end; i += 1) {
          const key = keys[i];
          const isSimpleKey = SIMPLE_KEY_RE.test(key);
          const childPath = isSimpleKey ? `${nodePath}.${key}` : `${nodePath}[${JSON.stringify(key)}]`;
          visit(obj[key], key, childPath, childLevel, !hasMore && i === end - 1, depth + 1);
        }

        if (hasMore) {
          out.push({
            kind: 'more',
            id: `${nodePath}#more`,
            level: childLevel,
            path: nodePath,
            label: `显示更多...（已显示 ${end}+）`,
          });
        }
      }

      out.push({
        kind: 'close',
        id: `${nodePath}#end`,
        level: childLevel,
        path: nodePath,
        containerType,
        isLast: nodeIsLast,
      });
    };

    visit(data, name, path, level, isLast, 0);
    return out;
  }, [data, expandAll, isLast, level, name, path, rootDefaultExpanded, toggledPaths, visibleCountByPath]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 24,
    overscan: 10,
    getItemKey: (index) => rows[index]?.id ?? index,
  });

  return (
    <div ref={scrollRef} className={cn('min-h-0', className, isPending && 'opacity-90')}>
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.kind === 'leaf' ? (
                <LeafRowView
                  row={row}
                  onFillPath={onFillPath}
                  onExtractRulePath={onExtractRulePath}
                  onExtractPropertyRule={onExtractPropertyRule}
                  onCleanProperty={onCleanProperty}
                />
              ) : row.kind === 'container' ? (
                <ContainerRowView
                  row={row}
                  onToggle={onToggle}
                  onFillPath={onFillPath}
                  onExtractRulePath={onExtractRulePath}
                  onExtractPropertyRule={onExtractPropertyRule}
                  onCleanProperty={onCleanProperty}
                />
              ) : row.kind === 'more' ? (
                <MoreRowView row={row} onShowMore={onShowMore} />
              ) : (
                <CloseRowView row={row} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const JsonTree = memo(JsonTreeImpl);

