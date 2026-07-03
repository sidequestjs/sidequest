import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./Select";

const meta = {
  title: "Forms/Select",
  component: Select,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const States: Story = {
  args: {
    defaultValue: "running",
    options: [
      { value: "waiting", label: "Waiting" },
      { value: "running", label: "Running" },
      { value: "completed", label: "Completed" },
      { value: "failed", label: "Failed" },
    ],
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    defaultValue: "default",
    options: [
      { value: "default", label: "default" },
      { value: "mailers", label: "mailers" },
    ],
  },
};
