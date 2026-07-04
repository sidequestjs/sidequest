import type { HTMLAttributes } from "react";

/** Visual variants available for {@link Card}. */
export type CardVariant = "solid" | "muted";

/** Props for the {@link Card} component. Extends the native `div` attributes. */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Background treatment. Defaults to `"solid"`. */
  variant?: CardVariant;
}

const variantClasses: Record<CardVariant, string> = {
  solid: "bg-surface",
  muted: "bg-surface-muted",
};

/**
 * Surface container used across the Sidequest dashboard. Renders a rounded,
 * bordered panel that wraps arbitrary content and forwards any native `div`
 * attributes.
 */
export function Card({ variant = "solid", className, children, ...rest }: CardProps) {
  const classes = `rounded-card border border-border p-4 text-content ${variantClasses[variant]}${
    className ? ` ${className}` : ""
  }`;

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
