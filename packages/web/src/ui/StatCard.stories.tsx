import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatCard } from "./StatCard";

const meta = {
  title: "Data display/StatCard",
  component: StatCard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof StatCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Completed: Story = {
  args: { label: "Completed", value: "1,284", tone: "completed", icon: "CircleCheck" },
};

export const Row: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
      <StatCard label="Running" value={12} tone="running" icon="Activity" />
      <StatCard label="Completed" value="1,284" tone="completed" icon="CircleCheck" />
      <StatCard label="Failed" value={7} tone="failed" icon="CircleX" delta="+2" />
      <StatCard label="Scheduled" value={40} tone="scheduled" icon="Clock" />
    </div>
  ),
};
