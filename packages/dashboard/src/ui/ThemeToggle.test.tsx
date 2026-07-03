import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

function mockMatchMedia(matchesLight: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: matchesLight }));
}

beforeEach(() => {
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
  mockMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ThemeToggle", () => {
  it("resolves an explicit light data-theme and toggles to dark, calling onChange", () => {
    document.documentElement.setAttribute("data-theme", "light");
    const onChange = vi.fn();
    render(<ThemeToggle onChange={onChange} />);

    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "true");
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith("dark");
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  it("resolves an explicit dark data-theme and toggles without onChange (sm size)", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<ThemeToggle size="sm" />);

    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");
    fireEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("falls back to a persisted theme when no attribute is set", () => {
    localStorage.setItem("sq-theme", "light");
    render(<ThemeToggle />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("falls back to the OS preference (light)", () => {
    mockMatchMedia(true);
    render(<ThemeToggle />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("falls back to dark when nothing else applies", () => {
    mockMatchMedia(false);
    render(<ThemeToggle />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("survives localStorage.getItem throwing", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    mockMatchMedia(true);
    render(<ThemeToggle />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("survives localStorage.setItem throwing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<ThemeToggle />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });
});
