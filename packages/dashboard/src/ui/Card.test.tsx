import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("renders a bare panel (no header) with default padding", () => {
    const { container } = render(<Card>body</Card>);

    const root = container.querySelector(".sq-card");
    expect(root).not.toBeNull();
    expect(screen.getByText("body")).toBeInTheDocument();
    // no header when neither title nor actions are given
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders title, actions, and honors custom padding/className/style/bodyStyle", () => {
    const { container } = render(
      <Card
        title="Recent jobs"
        actions={<button>refresh</button>}
        padding="10px"
        className="extra"
        style={{ color: "rgb(1, 2, 3)" }}
        bodyStyle={{ gap: "1px" }}
      >
        body
      </Card>,
    );

    const root = container.querySelector(".sq-card");
    expect(root).toHaveClass("extra");
    expect(root).toHaveStyle({ color: "rgb(1, 2, 3)" });
    expect(screen.getByRole("heading", { name: "Recent jobs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "refresh" })).toBeInTheDocument();
  });

  it("renders a header with only a title", () => {
    render(<Card title="Only title">body</Card>);

    expect(screen.getByRole("heading", { name: "Only title" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders a header with only actions", () => {
    render(<Card actions={<button>go</button>}>body</Card>);

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("button", { name: "go" })).toBeInTheDocument();
  });
});
