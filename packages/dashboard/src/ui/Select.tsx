import type { SelectHTMLAttributes } from "react";

/** A single option for {@link Select} when passing data instead of children. */
export interface SelectOption {
  value: string;
  label: string;
}

/** Props for the {@link Select} dropdown. Extends the native `select` attributes. */
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** Options as data; alternatively pass `<option>` children. */
  options?: SelectOption[];
  /** @default "md" */
  size?: "sm" | "md";
}

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%239aa6ba' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

/**
 * Select — native dropdown styled to match the dashboard's filter selects. Pass
 * `options` as data, or `<option>` children.
 */
export function Select({ options, size = "md", className = "", style = {}, children, ...rest }: SelectProps) {
  const height = size === "sm" ? "var(--control-height-sm)" : "var(--control-height)";
  return (
    <select
      className={`sq-select ${className}`}
      style={{
        height,
        width: "100%",
        padding: "0 2rem 0 0.75rem",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        color: "var(--text-primary)",
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        appearance: "none",
        backgroundImage: CHEVRON,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.6rem center",
        transition:
          "border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)",
        ...style,
      }}
      {...rest}
    >
      {options
        ? options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))
        : children}
    </select>
  );
}
