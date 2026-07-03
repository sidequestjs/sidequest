import type { CSSProperties } from "react";

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
      className={`sq-codeblock ${className}`}
      style={{
        margin: 0,
        background: "var(--surface-code)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "0.85rem 1rem",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        lineHeight: 1.6,
        // The code surface is always near-black (terminal-style) in both themes, so the
        // text stays light regardless of the active theme.
        color: "var(--sq-gray-300)",
        maxHeight,
        overflow: "auto",
        ...style,
      }}
    >
      <code data-language={language}>{text}</code>
    </pre>
  );
}
