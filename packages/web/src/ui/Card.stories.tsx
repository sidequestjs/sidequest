import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./Card";

const meta = {
  title: "Layout/Card",
  component: Card,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Bare: Story = {
  args: { children: "A bare panel with just body content." },
};

export const Titled: Story = {
  args: { title: "Recent jobs", children: "Panel body." },
};

export const WithActions: Story = {
  args: {
    title: "Queues",
    actions: (
      <button className="sq-btn sq-btn--default" style={{ height: "2rem", padding: "0 0.7rem" }}>
        Refresh
      </button>
    ),
    children: "Panel with header actions.",
  },
};
