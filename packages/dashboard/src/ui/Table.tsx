import type { CSSProperties, ReactNode } from "react";

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
    <div style={{ overflowX: "auto", ...style }} className={className}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: c.align ?? "left",
                  padding: "0.6rem 0.75rem",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--weight-semibold)",
                  color: "var(--text-secondary)",
                  borderBottom: "1px solid var(--border-default)",
                  whiteSpace: "nowrap",
                  width: c.width,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr
              key={(row[rowKey] as string | number | undefined) ?? i}
              className="sq-row"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{ cursor: onRowClick ? "pointer" : "default" }}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    textAlign: c.align ?? "left",
                    padding: "0.65rem 0.75rem",
                    color: "var(--text-primary)",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontFamily: c.mono ? "var(--font-mono)" : "inherit",
                    whiteSpace: c.wrap ? "normal" : "nowrap",
                  }}
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
