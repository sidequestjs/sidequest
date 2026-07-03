import type { Meta, StoryObj } from "@storybook/react-vite";
import { StepProgress } from "./StepProgress";

const meta = {
  title: "Data display/StepProgress",
  component: StepProgress,
  parameters: { layout: "padded" },
} satisfies Meta<typeof StepProgress>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Completed: Story = {
  args: {
    steps: [
      { label: "Enqueued", icon: "inbox", status: "done" },
      { label: "Claimed", icon: "user-check", status: "done" },
      { label: "Running", icon: "activity", status: "done" },
      { label: "Completed", icon: "circle-check", status: "done" },
    ],
  },
};

export const Running: Story = {
  args: {
    steps: [
      { label: "Enqueued", icon: "inbox", status: "done" },
      { label: "Claimed", icon: "user-check", status: "done" },
      { label: "Running", icon: "activity", status: "active" },
      { label: "Completed", icon: "circle-check", status: "pending" },
    ],
  },
};

export const Failed: Story = {
  args: {
    steps: [
      { label: "Enqueued", icon: "inbox", status: "done" },
      { label: "Claimed", icon: "user-check", status: "done" },
      { label: "Running", icon: "activity", status: "failed" },
      { label: "Completed", icon: "circle-check", status: "canceled" },
    ],
  },
};
