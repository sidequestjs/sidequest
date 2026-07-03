import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children inside a solid surface by default", () => {
    render(<Card>hello</Card>);

    const el = screen.getByText("hello");
    expect(el).toHaveClass("bg-surface");
    expect(el).toHaveClass("rounded-card");
    expect(el).toHaveClass("border-border");
  });

  it("applies the muted variant", () => {
    render(<Card variant="muted">muted</Card>);

    expect(screen.getByText("muted")).toHaveClass("bg-surface-muted");
  });

  it("merges a custom className and forwards native div attributes", () => {
    render(
      <Card className="extra" data-testid="card" role="group">
        content
      </Card>,
    );

    const el = screen.getByTestId("card");
    expect(el).toHaveClass("extra");
    expect(el).toHaveClass("bg-surface");
    expect(el).toHaveAttribute("role", "group");
    expect(el).toHaveTextContent("content");
  });
});
