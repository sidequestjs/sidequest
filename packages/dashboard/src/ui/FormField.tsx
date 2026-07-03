import type { CSSProperties, ReactNode } from "react";

/** Props for the {@link FormField} label + control wrapper. */
export interface FormFieldProps {
  /** Label text above the control. */
  label?: string;
  htmlFor?: string;
  /** Fixed width, e.g. "12rem" (filter bars). */
  width?: string;
  /** Helper text below the control. */
  hint?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * FormField — label + control wrapper for filter bars and forms. Optional label above
 * and hint below the control.
 */
export function FormField({ label, htmlFor, width, hint, className = "", style = {}, children }: FormFieldProps) {
  return (
    <div
      className={`sq-field ${className}`}
      style={{ display: "flex", flexDirection: "column", gap: "0.35rem", width: width ?? "auto", ...style }}
    >
      {label != null && (
        <label
          htmlFor={htmlFor}
          style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}
        >
          {label}
        </label>
      )}
      {children}
      {hint != null && <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-muted)" }}>{hint}</span>}
    </div>
  );
}
