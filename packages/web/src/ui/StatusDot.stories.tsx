import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusDot, type StatusDotState } from "./StatusDot";

const meta = {
  title: "Data display/StatusDot",
  component: StatusDot,
} satisfies Meta<typeof StatusDot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Running: Story = { args: { state: "running" } };

export const Completed: Story = { args: { state: "completed" } };

const ALL: StatusDotState[] = [
  "completed",
  "failed",
  "running",
  "claimed",
  "waiting",
  "scheduled",
  "canceled",
  "active",
  "paused",
  "disabled",
];

export const AllStates: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {ALL.map((s) => (
        <StatusDot key={s} state={s} />
      ))}
    </div>
  ),
};
