import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormField } from "./FormField";
import { Input } from "./Input";

const meta = {
  title: "Forms/FormField",
  component: FormField,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FormField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithInput: Story = {
  args: {
    label: "Job class",
    width: "16rem",
    children: <Input placeholder="SendEmailJob" />,
  },
};

export const WithHint: Story = {
  args: {
    label: "Cron",
    hint: "in-memory, per instance",
    width: "16rem",
    children: <Input placeholder="0 * * * *" />,
  },
};
