import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CodeBlock } from "./CodeBlock";

describe("CodeBlock", () => {
  it("renders a string verbatim with defaults", () => {
    const { container } = render(<CodeBlock code="hello world" />);

    expect(screen.getByText("hello world")).toBeInTheDocument();
    expect(container.querySelector(".sq-codeblock")).not.toBeNull();
  });

  it("pretty-prints an object as JSON and honors language/maxHeight/className", () => {
    const { container } = render(
      <CodeBlock code={{ a: 1, b: "x" }} language="json" maxHeight="10rem" className="extra" style={{ opacity: 1 }} />,
    );

    expect(container.querySelector(".sq-codeblock")).toHaveClass("extra");
    expect(container.querySelector("code")).toHaveAttribute("data-language", "json");
    expect(screen.getByText(/"a": 1/)).toBeInTheDocument();
  });
});
