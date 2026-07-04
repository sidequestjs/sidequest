import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardShell, type DashboardPage } from "./shell";

const pages: DashboardPage[] = [
  { path: "/", nav: { label: "Home" }, element: <div>home page</div> },
  { path: "/jobs", nav: { label: "Jobs" }, element: <div>jobs page</div> },
];

describe("DashboardShell", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("renders the nav entries and the active page", () => {
    render(<DashboardShell pages={pages} />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(screen.getByText("home page")).toBeInTheDocument();
  });

  it("switches the active page when a nav entry is clicked", async () => {
    const user = userEvent.setup();
    render(<DashboardShell pages={pages} />);

    await user.click(screen.getByText("Jobs"));
    act(() => {
      window.dispatchEvent(new Event("hashchange"));
    });

    expect(screen.getByText("jobs page")).toBeInTheDocument();
  });
});
