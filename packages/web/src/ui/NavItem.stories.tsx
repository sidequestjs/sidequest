import type { Meta, StoryObj } from "@storybook/react-vite";
import { NavItem } from "./NavItem";

const meta = {
  title: "Navigation/NavItem",
  component: NavItem,
  parameters: { layout: "padded" },
} satisfies Meta<typeof NavItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Active: Story = { args: { label: "Dashboard", icon: "LayoutDashboard", active: true } };

export const Inactive: Story = { args: { label: "Jobs", icon: "List" } };

export const List: Story = {
  render: () => (
    <div style={{ width: "14rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <NavItem label="Dashboard" icon="LayoutDashboard" active />
      <NavItem label="Jobs" icon="List" />
      <NavItem label="Queues" icon="Layers" />
    </div>
  ),
};
