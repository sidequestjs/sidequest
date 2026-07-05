import type { Meta, StoryObj } from "@storybook/react-vite";
import { Delta } from "./Delta";

const meta = {
  title: "Data display/Delta",
  component: Delta,
} satisfies Meta<typeof Delta>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Up: Story = { args: { value: 12 } };

export const Down: Story = { args: { value: -4 } };
