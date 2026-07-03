import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders a default enabled button with no icons", () => {
    render(<Button>Go</Button>);

    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn).toHaveClass("sq-btn", "sq-btn--default");
    expect(btn).toHaveAttribute("type", "button");
    expect(btn).not.toBeDisabled();
    expect(btn.querySelectorAll("svg")).toHaveLength(0);
  });

  it("honors variant, size, type, icons, block, active, disabled, className and style", () => {
    render(
      <Button
        variant="primary"
        size="lg"
        type="submit"
        icon="play"
        iconRight="x"
        disabled
        block
        active
        className="extra"
        style={{ margin: 0 }}
      >
        Run
      </Button>,
    );

    const btn = screen.getByRole("button", { name: "Run" });
    expect(btn).toHaveClass("sq-btn--primary", "extra");
    expect(btn).toHaveAttribute("type", "submit");
    expect(btn).toBeDisabled();
    // leading + trailing icons
    expect(btn.querySelectorAll("svg")).toHaveLength(2);
  });
});
