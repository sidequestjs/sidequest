import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

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
export function Input({ type = "text", size = "md", invalid = false, className = "", ...rest }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "sq-input w-full px-3 font-sans text-sm text-fg bg-surface-raised rounded-sm border transition-[border-color,box-shadow] duration-[120ms] ease-standard placeholder:text-fg-muted focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand-ring",
        size === "sm" ? "h-control-sm" : "h-control",
        invalid ? "border-status-failed" : "border-edge-strong",
        className,
      )}
      {...rest}
    />
  );
}
