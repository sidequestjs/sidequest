import type { CSSProperties } from "react";
import { cn } from "./cn";

/** Props for the {@link CodeBlock} monospace panel. */
export interface CodeBlockProps {
  /** String, or an object that will be pretty-printed as JSON. */
  code: string | object;
  language?: string;
  /** @default "15rem" */
  maxHeight?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * CodeBlock — near-black monospace panel for job arguments, results, and stack traces.
 * Pass a string, or an object which is pretty-printed as JSON.
 */
export function CodeBlock({ code, language, maxHeight = "15rem", className = "", style = {} }: CodeBlockProps) {
  const text = typeof code === "string" ? code : JSON.stringify(code, null, 2);
  return (
    <pre
      className={cn(
        "sq-codeblock m-0 bg-surface-code border border-edge rounded-md px-4 py-[0.85rem] font-mono text-xs leading-[1.6] text-fg overflow-auto",
        className,
      )}
      style={{ maxHeight, ...style }}
    >
      <code data-language={language}>{text}</code>
    </pre>
  );
}
