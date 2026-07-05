import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Kbd } from "./Kbd";

describe("Kbd", () => {
  it("renders a key chip with its content and extra className", () => {
    render(<Kbd className="extra">K</Kbd>);
    const el = screen.getByText("K");
    expect(el.tagName).toBe("KBD");
    expect(el).toHaveClass("extra");
  });
});
