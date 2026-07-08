import { cn } from "../../ui/cn";

/** A single segment in a {@link SegmentedFilter}. */
export interface Segment {
  key: string;
  label: string;
  count: number;
}

/** Props for the {@link SegmentedFilter}. */
export interface SegmentedFilterProps {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
}

/**
 * SegmentedFilter — a pill toggle group with a live count chip per segment, for the
 * jobs status filter.
 */
export function SegmentedFilter({ segments, value, onChange }: SegmentedFilterProps) {
  return (
    <div className="flex gap-1 p-1 bg-surface-inset border border-edge rounded-[10px] w-fit">
      {segments.map((segment) => {
        const on = value === segment.key;
        return (
          <button
            key={segment.key}
            type="button"
            onClick={() => onChange(segment.key)}
            className={cn(
              "inline-flex items-center gap-[7px] px-3 py-1.5 rounded-[7px] cursor-pointer text-[13px] font-sans transition-colors",
              on
                ? "bg-surface-card text-fg-strong font-semibold shadow-sm"
                : "bg-transparent text-fg-secondary font-medium hover:text-fg",
            )}
          >
            {segment.label}
            <span
              className={cn(
                "font-mono text-[11px] px-1.5 py-px rounded-full",
                on ? "text-brand bg-brand/15" : "text-fg-muted bg-surface-raised",
              )}
            >
              {segment.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
