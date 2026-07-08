import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("renders a text input with defaults", () => {
    render(<Input aria-label="name" />);

    const input = screen.getByLabelText("name");
    expect(input).toHaveClass("sq-input");
    expect(input).toHaveAttribute("type", "text");
  });

  it("honors type, small size, invalid, className and style", () => {
    render(<Input aria-label="age" type="number" size="sm" invalid className="extra" style={{ marginTop: "1px" }} />);

    const input = screen.getByLabelText("age");
    expect(input).toHaveClass("sq-input", "extra");
    expect(input).toHaveAttribute("type", "number");
  });
});
