import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("renders the glyph fallback, default brand and footer", () => {
    render(
      <Sidebar>
        <span>nav</span>
      </Sidebar>,
    );

    expect(screen.getByText("Sidequest")).toBeInTheDocument();
    expect(screen.getByText(/OSS Edition/)).toBeInTheDocument();
  });

  it("renders a logo image, custom brand, no footer, className and style", () => {
    const { container } = render(
      <Sidebar logoSrc="/logo.png" brand="Acme" footer={null} className="extra" style={{ opacity: 1 }}>
        <span>nav</span>
      </Sidebar>,
    );

    expect(container.querySelector(".sq-sidebar")).toHaveClass("extra");
    expect(container.querySelector("img")).toHaveAttribute("src", "/logo.png");
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.queryByText(/OSS Edition/)).toBeNull();
  });
});
