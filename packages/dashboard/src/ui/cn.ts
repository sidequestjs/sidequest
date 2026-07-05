import { clsx, type ClassValue } from "clsx";

/**
 * cn — merges conditional class values into a single className string. Thin wrapper
 * over {@link clsx}; the components lean on Tailwind utilities, so this is how variant
 * maps, booleans, and caller-supplied `className` are composed.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
