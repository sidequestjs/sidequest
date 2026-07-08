import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./Badge";
import { type Column, Table } from "./Table";

const meta = {
  title: "Data table/Table",
  component: Table,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

const columns: Column[] = [
  { key: "id", label: "ID", mono: true, width: "5rem" },
  { key: "class", label: "Class" },
  { key: "queue", label: "Queue" },
  { key: "state", label: "State", render: (r) => <Badge state={r.state as never} /> },
];

const rows: Record<string, unknown>[] = [
  { id: 1042, class: "SendEmailJob", queue: "mail", state: "completed" },
  { id: 1043, class: "GenerateReportJob", queue: "heavy", state: "running" },
  { id: 1044, class: "SendEmailJob", queue: "mail", state: "failed" },
];

export const Jobs: Story = { args: { columns, rows } };

export const Empty: Story = { args: { columns, rows: [], empty: "No jobs match your filters." } };
