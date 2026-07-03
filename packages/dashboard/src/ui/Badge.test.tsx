import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge, type JobState } from "./Badge";

describe("Badge", () => {
  it("renders a preset state with its default label and colors", () => {
    const { container } = render(<Badge state="completed" />);

    const el = container.querySelector(".sq-badge");
    expect(el).toHaveTextContent("Completed");
    expect(el).toHaveStyle({ color: "var(--status-completed)" });
    // no dot by default
    expect(el?.querySelector("span")).toBeNull();
  });

  it("uses defaults (neutral) and honors dot, children, bg/fg, className, style overrides", () => {
    const { container } = render(
      <Badge dot className="extra" style={{ marginTop: "2px" }} bg="rgb(17, 17, 17)" fg="rgb(238, 238, 238)">
        Hi
      </Badge>,
    );

    const el = container.querySelector(".sq-badge");
    expect(el).toHaveClass("extra");
    expect(el).toHaveTextContent("Hi");
    expect(el).toHaveStyle({ background: "rgb(17, 17, 17)", color: "rgb(238, 238, 238)" });
    // dot rendered
    expect(el?.querySelector("span")).not.toBeNull();
  });

  it("falls back to the neutral preset for an unknown state", () => {
    const { container } = render(<Badge state={"bogus" as JobState} />);

    const el = container.querySelector(".sq-badge");
    // neutral label is empty
    expect(el).toHaveTextContent("");
    expect(el).toHaveStyle({ color: "var(--text-secondary)" });
  });
});
