import type { Meta, StoryObj } from "@storybook/react-vite";
import { CodeBlock } from "./CodeBlock";

const meta = {
  title: "Data display/CodeBlock",
  component: CodeBlock,
  parameters: { layout: "padded" },
} satisfies Meta<typeof CodeBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Args: Story = {
  args: { code: { to: "user@example.com", template: "welcome", attempts: 1 } },
};

export const StackTrace: Story = {
  args: {
    code: "Error: connection refused\n    at SendEmailJob.run (jobs/send-email.ts:12:15)\n    at Runner.perform (runner.ts:88:9)",
  },
};
