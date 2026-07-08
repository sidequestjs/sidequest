import { toQuery } from "./to-query";

describe("toQuery", () => {
  it("keeps present values as strings", () => {
    expect(toQuery({ state: "failed", page: 2 })).toEqual({ state: "failed", page: "2" });
  });

  it("drops undefined and empty values", () => {
    expect(toQuery({ state: undefined, queue: "", class: "Email" })).toEqual({ class: "Email" });
  });

  it("returns an empty object for an empty filter", () => {
    expect(toQuery({})).toEqual({});
  });
});
