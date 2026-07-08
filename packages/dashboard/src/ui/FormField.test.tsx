import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("renders only the control when no label or hint is given", () => {
    render(
      <FormField>
        <input aria-label="bare" />
      </FormField>,
    );

    expect(screen.getByLabelText("bare")).toBeInTheDocument();
    expect(screen.queryByText("Name")).toBeNull();
  });

  it("renders label, hint, fixed width and className", () => {
    const { container } = render(
      <FormField label="Name" htmlFor="n" width="12rem" hint="required" className="extra">
        <input id="n" />
      </FormField>,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("required")).toBeInTheDocument();
    expect(container.querySelector(".sq-field")).toHaveClass("extra");
  });
});
