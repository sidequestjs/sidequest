import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon, type IconName } from "./Icon";

const meta = {
  title: "Actions/Icon",
  component: Icon,
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Play: Story = { args: { name: "Play" } };

export const Large: Story = { args: { name: "RefreshCcw", size: 32 } };

const NAMES: IconName[] = ["Play", "X", "RefreshCcw", "Trash2", "Clock", "Activity", "CircleCheck", "CircleX", "Pause"];

export const Gallery: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem", color: "var(--text-primary)" }}>
      {NAMES.map((n) => (
        <Icon key={n} name={n} size={20} />
      ))}
    </div>
  ),
};
