import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sparkline } from "./Sparkline";

const meta = {
  title: "Data display/Sparkline",
  component: Sparkline,
} satisfies Meta<typeof Sparkline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { data: [3, 5, 4, 8, 6, 9, 7, 11] } };

export const Tones: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem" }}>
      <Sparkline data={[3, 5, 4, 8, 6, 9]} />
      <Sparkline data={[8, 6, 7, 5, 4]} color="var(--status-failed)" />
      <Sparkline data={[12, 10, 9, 11, 8]} color="var(--status-scheduled)" fill={false} />
    </div>
  ),
};
