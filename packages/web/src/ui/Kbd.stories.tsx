import type { Meta, StoryObj } from "@storybook/react-vite";
import { Kbd } from "./Kbd";

const meta = {
  title: "Data display/Kbd",
  component: Kbd,
} satisfies Meta<typeof Kbd>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Single: Story = { args: { children: "K" } };

export const Shortcut: Story = {
  render: () => (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", color: "var(--text-secondary)" }}>
      Press <Kbd>Cmd</Kbd>
      <Kbd>K</Kbd> to search
    </span>
  ),
};
