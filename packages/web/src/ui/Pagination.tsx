import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";

/** Props for the {@link Pagination} control. */
export interface PaginationProps {
  page: number;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Pagination — the dashboard's joined prev / page / next control. Buttons abut with
 * shared borders; the ends disable when there is no previous/next page.
 */
export function Pagination({ page, hasNext = false, onPrev, onNext, className = "", style = {} }: PaginationProps) {
  const btn = (content: ReactNode, enabled: boolean, onClick: (() => void) | undefined, active: boolean) => (
    <button
      type="button"
      disabled={!enabled}
      onClick={enabled ? onClick : undefined}
      className={cn(
        "h-control-sm min-w-8 px-[0.7rem] text-xs font-medium font-sans border border-edge-strong",
        active ? "text-on-brand bg-brand" : "text-fg bg-surface-raised",
        enabled ? "cursor-pointer opacity-100 enabled:hover:bg-surface-hover" : "cursor-not-allowed opacity-40",
      )}
    >
      {content}
    </button>
  );

  return (
    <div className={cn("sq-pagination inline-flex rounded-sm overflow-hidden", className)} style={style}>
      {btn("«", page > 1, onPrev, false)}
      {btn(`Page ${page}`, false, undefined, true)}
      {btn("»", hasNext, onNext, false)}
    </div>
  );
}
