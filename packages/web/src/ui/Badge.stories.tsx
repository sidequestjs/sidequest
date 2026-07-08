import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge, type JobState, type QueueState } from "./Badge";

const meta = {
  title: "Data display/Badge",
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Completed: Story = { args: { state: "completed" } };

export const Running: Story = { args: { state: "running", dot: true } };

export const Failed: Story = { args: { state: "failed" } };

const ALL: (JobState | QueueState | "neutral")[] = [
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
  "neutral",
];

export const AllStates: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      {ALL.map((s) => (
        <Badge key={s} state={s} dot />
      ))}
    </div>
  ),
};
