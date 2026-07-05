import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusDot } from "./StatusDot";

describe("StatusDot", () => {
  it("renders the capitalized state label and pulses live states", () => {
    const { container } = render(<StatusDot state="running" />);
    expect(container).toHaveTextContent("Running");
    expect(container.querySelector(".sq-pulse")).not.toBeNull();
  });

  it("honors a custom label and does not pulse settled states", () => {
    const { container } = render(<StatusDot state="completed" label="Done" className="extra" />);
    expect(container).toHaveTextContent("Done");
    expect(container.querySelector(".sq-pulse")).toBeNull();
    expect(container.firstChild).toHaveClass("extra");
  });
});
