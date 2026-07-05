import type { SelectHTMLAttributes } from "react";
import { cn } from "./cn";
import { Icon } from "./Icon";

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

/**
 * Select — native dropdown styled to match the dashboard's filter selects. Pass
 * `options` as data, or `<option>` children. A non-interactive chevron is overlaid
 * on the right (the native indicator is removed via `appearance-none`).
 */
export function Select({ options, size = "md", className = "", children, ...rest }: SelectProps) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          "sq-select w-full appearance-none rounded-sm border border-edge-strong bg-surface-raised pl-3 pr-8 font-sans text-sm text-fg cursor-pointer transition-[border-color,box-shadow] duration-[120ms] ease-standard focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand-ring",
          size === "sm" ? "h-control-sm" : "h-control",
          className,
        )}
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
      <Icon
        name="chevron-down"
        size={16}
        className="pointer-events-none absolute right-[0.6rem] top-1/2 -translate-y-1/2 text-fg-secondary"
      />
    </div>
  );
}
