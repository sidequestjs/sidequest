import type { InputHTMLAttributes } from "react";

/** Props for the {@link Input} field. Extends the native `input` attributes. */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** @default "md" */
  size?: "sm" | "md";
  /** Red border for validation errors. */
  invalid?: boolean;
}

/**
 * Input — text/number/datetime field, matching the dashboard's filter-bar inputs.
 * Pair with {@link FormField} for a label.
 */
export function Input({ type = "text", size = "md", invalid = false, className = "", style = {}, ...rest }: InputProps) {
  const height = size === "sm" ? "var(--control-height-sm)" : "var(--control-height)";
  return (
    <input
      type={type}
      className={`sq-input ${className}`}
      style={{
        height,
        width: "100%",
        padding: "0 0.75rem",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        color: "var(--text-primary)",
        background: "var(--surface-raised)",
        border: `1px solid ${invalid ? "var(--status-failed)" : "var(--border-strong)"}`,
        borderRadius: "var(--radius-sm)",
        transition:
          "border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)",
        ...style,
      }}
      {...rest}
    />
  );
}
