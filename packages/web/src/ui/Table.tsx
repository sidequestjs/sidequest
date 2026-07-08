import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";

/** A column definition for {@link Table}. */
export interface Column<Row = Record<string, unknown>> {
  key: string;
  label: ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  /** Monospace cell (IDs, timestamps). */
  mono?: boolean;
  /** Allow wrapping (default: nowrap). */
  wrap?: boolean;
  /** Custom cell renderer. */
  render?: (row: Row) => ReactNode;
}

/** Props for {@link Table}. */
export interface TableProps<Row = Record<string, unknown>> {
  columns: Column<Row>[];
  rows: Row[];
  /** Field used as React key. @default "id" */
  rowKey?: string;
  onRowClick?: (row: Row) => void;
  /** Rendered when there are no rows. @default "No rows" */
  empty?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const ALIGN: Record<NonNullable<Column["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * Table — dense dark data table for the jobs and queues lists. Columns describe cells
 * (alignment, monospace, custom render); rows get a hover highlight and optional click.
 */
export function Table<Row extends Record<string, unknown> = Record<string, unknown>>({
  columns,
  rows,
  rowKey = "id",
  onRowClick,
  empty = "No rows",
  className = "",
  style = {},
}: TableProps<Row>) {
  return (
    <div className={cn("overflow-x-auto", className)} style={style}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-3 py-[0.6rem] text-xs font-semibold text-fg-secondary border-b border-edge whitespace-nowrap",
                  ALIGN[c.align ?? "left"],
                )}
                style={{ width: c.width }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-fg-muted">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr
              key={(row[rowKey] as string | number | undefined) ?? i}
              className={cn(
                "sq-row transition-colors duration-[120ms] hover:bg-surface-hover",
                onRowClick ? "cursor-pointer" : "cursor-default",
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-3 py-[0.65rem] text-fg border-b border-edge-subtle",
                    ALIGN[c.align ?? "left"],
                    c.mono ? "font-mono" : "",
                    c.wrap ? "whitespace-normal" : "whitespace-nowrap",
                  )}
                >
                  {c.render ? c.render(row) : (row[c.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
