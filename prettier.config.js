/** @type {import("prettier").Config} */
const config = {
  semi: true, // Always use semicolons
  singleQuote: false, // Use double quotes
  trailingComma: "all", // Add trailing commas wherever possible (ES5+)
  printWidth: 120, // Wrap lines at 120 chars
  tabWidth: 2, // Use 2 spaces per tab
  useTabs: false, // Don't use hard tabs
  bracketSpacing: true, // Add spaces inside object literals: { foo: bar }
  arrowParens: "always", // Always include parens for arrow functions
  endOfLine: "lf", // Normalize line endings to LF (avoid CRLF issues)
  plugins: ["prettier-plugin-organize-imports"],
};

export default config;
