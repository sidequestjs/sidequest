import { icons, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";

/** A Lucide icon key, e.g. "Play", "RefreshCcw", "X". */
export type IconName = keyof typeof icons;

/** Props for the {@link Icon} component. Extends the underlying Lucide SVG props. */
export interface IconProps extends Omit<LucideProps, "ref"> {
  /** Lucide icon key (PascalCase, as exported by lucide-react), e.g. "Play", "RefreshCcw", "X". */
  name: IconName;
  /** Pixel size. @default 16 */
  size?: number;
  /** @default 2 */
  strokeWidth?: number;
}

/**
 * Icon — a Lucide glyph resolved by name (Feather's successor; the design system's
 * iconography). Renders `currentColor`, so it inherits the surrounding text color.
 * Returns nothing for an unknown name.
 */
export function Icon({ name, size = 16, strokeWidth = 2, ...rest }: IconProps) {
  const Glyph = icons[name] as ComponentType<LucideProps> | undefined;
  if (!Glyph) {
    return null;
  }
  return <Glyph size={size} strokeWidth={strokeWidth} aria-hidden {...rest} />;
}
