import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SuccessRateCard } from "./SuccessRateCard";

describe("SuccessRateCard", () => {
  it("renders the rate, throughput and range label", () => {
    render(<SuccessRateCard rate={94} throughput={132} rangeLabel="last 12m" />);
    expect(screen.getByText("94")).toBeInTheDocument();
    expect(screen.getByText("132 jobs · last 12m")).toBeInTheDocument();
  });
});
