import type { Meta, StoryObj } from "@storybook/react-vite";
import { NavItem } from "./NavItem";

const meta = {
  title: "Navigation/NavItem",
  component: NavItem,
  parameters: { layout: "padded" },
} satisfies Meta<typeof NavItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Active: Story = { args: { label: "Dashboard", icon: "layout-dashboard", active: true } };

export const Inactive: Story = { args: { label: "Jobs", icon: "list" } };

export const List: Story = {
  render: () => (
    <div style={{ width: "14rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <NavItem label="Dashboard" icon="layout-dashboard" active />
      <NavItem label="Jobs" icon="list" />
      <NavItem label="Queues" icon="layers" />
    </div>
  ),
};
