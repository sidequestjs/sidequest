import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  it("renders an area fill, a line, and an end dot for a series", () => {
    const { container } = render(<Sparkline data={[1, 3, 2, 5]} className="extra" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("extra");
    expect(svg?.querySelectorAll("path")).toHaveLength(2); // area + line
    expect(svg?.querySelector("circle")).not.toBeNull();
  });

  it("omits the area fill when fill is false", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} fill={false} />);
    expect(container.querySelectorAll("path")).toHaveLength(1); // line only
  });

  it("handles single-point and flat series without dividing by zero", () => {
    const single = render(<Sparkline data={[5]} />);
    expect(single.container.querySelector("circle")).not.toBeNull();
    const flat = render(<Sparkline data={[2, 2, 2]} />);
    expect(flat.container.querySelector("path")).not.toBeNull();
  });

  it("renders nothing for an empty series", () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
