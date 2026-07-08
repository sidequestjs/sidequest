import { cn } from "../../ui/cn";
import { useSystem } from "../hooks/use-system";

/**
 * EngineStatus — the sidebar footer's live backend indicator: a pulsing dot with the
 * connection state, plus the driver and version when the server reports them (the line
 * is omitted otherwise, so nothing is faked).
 */
export function EngineStatus() {
  const { data, error } = useSystem({ refetchInterval: 5000 });
  const connected = !error && (data?.connected ?? false);
  const meta = [data?.driver, data?.version].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "w-[7px] h-[7px] rounded-full",
            connected
              ? "sq-pulse bg-status-completed shadow-[0_0_0_3px_color-mix(in_srgb,var(--status-completed)_22%,transparent)]"
              : "bg-status-failed shadow-[0_0_0_3px_color-mix(in_srgb,var(--status-failed)_22%,transparent)]",
          )}
        />
        <span className="text-xs text-fg">{connected ? "Engine connected" : "Engine offline"}</span>
      </div>
      {meta && <div className="font-mono text-[11px] text-fg-muted">{meta}</div>}
    </div>
  );
}
