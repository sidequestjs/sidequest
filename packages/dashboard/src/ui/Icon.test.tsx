import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon, type IconName } from "./Icon";

describe("Icon", () => {
  it("renders a lucide glyph for a known name with defaults", () => {
    const { container } = render(<Icon name="Play" />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("resolves multi-segment names and honors size/strokeWidth/rest props", () => {
    const { container } = render(<Icon name="RefreshCcw" size={24} strokeWidth={3} className="x" />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("stroke-width", "3");
    expect(svg).toHaveClass("x");
  });

  it("renders nothing for an unknown name", () => {
    const { container } = render(<Icon name={"definitely-not-an-icon" as IconName} />);

    expect(container.querySelector("svg")).toBeNull();
  });
});
