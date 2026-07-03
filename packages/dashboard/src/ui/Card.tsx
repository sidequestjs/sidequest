import type { CSSProperties, ReactNode } from "react";

/** Props for the {@link Card} panel primitive. */
export interface CardProps {
  /** Header title. Omit for a bare panel. */
  title?: ReactNode;
  /** Right-aligned header actions (buttons). */
  actions?: ReactNode;
  /** Body padding. @default "var(--space-6)" */
  padding?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
}

/**
 * Card — the dashboard's panel primitive. Optional title/actions header, then a
 * padded body. Compose stat tiles, tables, and job details inside it.
 */
export function Card({
  title,
  actions,
  children,
  padding = "var(--space-6)",
  className = "",
  style = {},
  bodyStyle = {},
}: CardProps) {
  return (
    <div
      className={`sq-card ${className}`}
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-md)",
        overflow: "hidden",
        ...style,
      }}
    >
      {(title != null || actions != null) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `var(--space-4) ${padding}`,
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {title && (
            <h3
              style={{
                margin: 0,
                fontSize: "var(--text-lg)",
                fontWeight: "var(--weight-semibold)",
                color: "var(--text-strong)",
              }}
            >
              {title}
            </h3>
          )}
          {actions && <div style={{ display: "flex", gap: "0.5rem" }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding, ...bodyStyle }}>{children}</div>
    </div>
  );
}
