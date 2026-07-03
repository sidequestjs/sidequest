import { icons, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";

/** Props for the {@link Icon} component. Extends the underlying Lucide SVG props. */
export interface IconProps extends Omit<LucideProps, "ref"> {
  /** Lucide icon name, kebab or space separated, e.g. "play", "x", "refresh-ccw". */
  name: string;
  /** Pixel size. @default 16 */
  size?: number;
  /** @default 2 */
  strokeWidth?: number;
}

/** "refresh-ccw" | "refresh ccw" -> "RefreshCcw" (the Lucide component key). */
function toPascalCase(name: string): string {
  return name
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Icon — a Lucide glyph resolved by name (Feather's successor; the design system's
 * iconography). Renders `currentColor`, so it inherits the surrounding text color.
 * Returns nothing for an unknown name.
 */
export function Icon({ name, size = 16, strokeWidth = 2, ...rest }: IconProps) {
  const Glyph = icons[toPascalCase(name) as keyof typeof icons] as ComponentType<LucideProps> | undefined;
  if (!Glyph) {
    return null;
  }
  return <Glyph size={size} strokeWidth={strokeWidth} aria-hidden {...rest} />;
}
