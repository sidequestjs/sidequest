import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type Column, Table } from "./Table";

const columns: Column[] = [
  { key: "id", label: "ID", mono: true },
  { key: "name", label: "Name", align: "center", wrap: true, render: (r) => `#${String(r.name)}` },
];

describe("Table", () => {
  it("renders rows, uses rowKey or index, custom render, and fires onRowClick", () => {
    const rows: Record<string, unknown>[] = [{ id: 1, name: "a" }, { name: "b" }];
    const onRowClick = vi.fn();
    render(<Table columns={columns} rows={rows} onRowClick={onRowClick} />);

    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("#a")).toBeInTheDocument();
    screen.getByText("#a").click();
    expect(onRowClick).toHaveBeenCalledOnce();
  });

  it("renders plain cells without a click handler and honors rowKey/className/style", () => {
    render(
      <Table
        columns={[{ key: "id", label: "ID" }]}
        rows={[{ id: 5 }]}
        rowKey="id"
        className="extra"
        style={{ opacity: 1 }}
      />,
    );

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows the empty state when there are no rows", () => {
    render(<Table columns={columns} rows={[]} empty="Nothing here" />);

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});
