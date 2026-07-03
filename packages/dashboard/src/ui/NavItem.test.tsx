import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NavItem } from "./NavItem";

describe("NavItem", () => {
  it("renders an inactive link with no icon by default", () => {
    const { container } = render(<NavItem label="Jobs" />);

    const link = screen.getByRole("link", { name: "Jobs" });
    expect(link).toHaveClass("sq-navitem");
    expect(link).toHaveAttribute("href", "#");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders an inactive link with an icon (muted icon color)", () => {
    const { container } = render(<NavItem label="Jobs" icon="list" />);

    expect(screen.getByRole("link", { name: /Jobs/ })).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders an active link with an icon, href, className and style", () => {
    const { container } = render(
      <NavItem label="Queues" icon="layers" active href="/queues" className="extra" style={{ opacity: 1 }} />,
    );

    const link = screen.getByRole("link", { name: /Queues/ });
    expect(link).toHaveClass("extra");
    expect(link).toHaveAttribute("href", "/queues");
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
