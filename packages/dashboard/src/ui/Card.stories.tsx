import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./Card";

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Solid: Story = {
  args: { children: "Solid card" },
};

export const Muted: Story = {
  args: { variant: "muted", children: "Muted card" },
};
