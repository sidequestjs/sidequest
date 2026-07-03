import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select } from "./Select";

describe("Select", () => {
  it("renders options passed as data", () => {
    render(
      <Select
        aria-label="status"
        value="a"
        onChange={() => undefined}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />,
    );

    const select = screen.getByLabelText("status");
    expect(select).toHaveClass("sq-select");
    expect(screen.getByRole("option", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Beta" })).toBeInTheDocument();
  });

  it("renders option children and honors small size + className", () => {
    render(
      <Select aria-label="queue" size="sm" className="extra" defaultValue="c">
        <option value="c">Gamma</option>
      </Select>,
    );

    expect(screen.getByLabelText("queue")).toHaveClass("sq-select", "extra");
    expect(screen.getByRole("option", { name: "Gamma" })).toBeInTheDocument();
  });
});
