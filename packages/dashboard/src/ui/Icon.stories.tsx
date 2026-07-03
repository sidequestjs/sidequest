import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "./Icon";

const meta = {
  title: "Actions/Icon",
  component: Icon,
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Play: Story = { args: { name: "play" } };

export const Large: Story = { args: { name: "refresh-ccw", size: 32 } };

const NAMES = ["play", "x", "refresh-ccw", "trash-2", "clock", "activity", "circle-check", "circle-x", "pause"];

export const Gallery: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem", color: "var(--text-primary)" }}>
      {NAMES.map((n) => (
        <Icon key={n} name={n} size={20} />
      ))}
    </div>
  ),
};
