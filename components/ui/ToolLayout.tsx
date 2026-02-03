import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type ToolPageShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Tool page wrapper.
 * - Full-height by default to support "editor-like" tools (split panes, internal scroll).
 * - Keep styling minimal; each tool decides how its main area scrolls.
 */
export function ToolPageShell({ children, className }: ToolPageShellProps) {
  return <div className={cn('h-full w-full flex flex-col bg-white', className)}>{children}</div>;
}

type ToolHeaderProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  iconClassName?: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  className?: string;
};

/**
 * Consistent tool header: icon + title/description + actions.
 * Optional toolbar section for dense tools (e.g. query bar / secondary controls).
 */
export function ToolHeader({
  title,
  description,
  icon,
  iconClassName,
  actions,
  toolbar,
  className,
}: ToolHeaderProps) {
  return (
    <div className={cn('flex-none bg-white border-b border-slate-100', className)}>
      <div className={cn('px-6 py-5', toolbar ? 'pb-4' : '')}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {icon ? (
              <div className={cn('p-2 rounded-lg flex-shrink-0', iconClassName)}>{icon}</div>
            ) : null}
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-slate-900 leading-6 tracking-tight">
                {title}
              </h2>
              {description ? (
                <p className="text-xs text-slate-500 leading-5 mt-0.5">{description}</p>
              ) : null}
            </div>
          </div>

          {actions ? (
            <div className="flex items-center justify-end gap-2 flex-wrap">{actions}</div>
          ) : null}
        </div>

        {toolbar ? <div className="mt-4">{toolbar}</div> : null}
      </div>
    </div>
  );
}

type ToolMainProps = {
  children: ReactNode;
  className?: string;
};

export function ToolMain({ children, className }: ToolMainProps) {
  return <div className={cn('flex-1 min-h-0', className)}>{children}</div>;
}
