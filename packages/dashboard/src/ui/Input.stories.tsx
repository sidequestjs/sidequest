import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./Input";

const meta = {
  title: "Forms/Input",
  component: Input,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { placeholder: "Search jobs…" } };

export const Small: Story = { args: { size: "sm", placeholder: "Filter" } };

export const Invalid: Story = { args: { invalid: true, defaultValue: "bad value" } };
