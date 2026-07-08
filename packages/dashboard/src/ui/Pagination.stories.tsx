import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pagination } from "./Pagination";

const meta = {
  title: "Data table/Pagination",
  component: Pagination,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Middle: Story = { args: { page: 3, hasNext: true } };

export const FirstPage: Story = { args: { page: 1, hasNext: true } };

export const LastPage: Story = { args: { page: 9, hasNext: false } };
