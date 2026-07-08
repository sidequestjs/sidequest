import { Icon } from "../../ui/Icon";

/** Props for the {@link JobsToolbar}. */
export interface JobsToolbarProps {
  query: string;
  onQuery: (query: string) => void;
}

/**
 * JobsToolbar — free-text search over jobs (by class, id, or queue) above the jobs table.
 */
export function JobsToolbar({ query, onQuery }: JobsToolbarProps) {
  return (
    <div className="flex gap-3 items-center flex-wrap">
      <div className="relative flex-1 min-w-[240px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted inline-flex">
          <Icon name="Search" size={15} />
        </span>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search by class, id, or queue…"
          className="sq-input h-[38px] w-full pl-[34px] pr-3 bg-surface-raised border border-edge-strong rounded-lg text-fg text-[13px] font-sans transition-[border-color,box-shadow] focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand-ring"
        />
      </div>
    </div>
  );
}
