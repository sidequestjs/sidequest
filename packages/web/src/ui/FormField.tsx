import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";

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
    <div className={cn("sq-field flex flex-col gap-[0.35rem]", className)} style={{ width: width ?? "auto", ...style }}>
      {label != null && (
        <label htmlFor={htmlFor} className="text-xs font-medium text-fg-secondary">
          {label}
        </label>
      )}
      {children}
      {hint != null && <span className="text-2xs text-fg-muted">{hint}</span>}
    </div>
  );
}
