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
      { label: "Enqueued", icon: "Inbox", status: "done" },
      { label: "Claimed", icon: "UserCheck", status: "done" },
      { label: "Running", icon: "Activity", status: "done" },
      { label: "Completed", icon: "CircleCheck", status: "done" },
    ],
  },
};

export const Running: Story = {
  args: {
    steps: [
      { label: "Enqueued", icon: "Inbox", status: "done" },
      { label: "Claimed", icon: "UserCheck", status: "done" },
      { label: "Running", icon: "Activity", status: "active" },
      { label: "Completed", icon: "CircleCheck", status: "pending" },
    ],
  },
};

export const Failed: Story = {
  args: {
    steps: [
      { label: "Enqueued", icon: "Inbox", status: "done" },
      { label: "Claimed", icon: "UserCheck", status: "done" },
      { label: "Running", icon: "Activity", status: "failed" },
      { label: "Completed", icon: "CircleCheck", status: "canceled" },
    ],
  },
};
