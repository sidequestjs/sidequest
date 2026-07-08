import type { Meta, StoryObj } from "@storybook/react-vite";
import { NavItem } from "./NavItem";
import { Sidebar } from "./Sidebar";

const meta = {
  title: "Navigation/Sidebar",
  component: Sidebar,
} satisfies Meta<typeof Sidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ height: "26rem", display: "flex" }}>
      <Sidebar>
        <NavItem label="Dashboard" icon="LayoutDashboard" active />
        <NavItem label="Jobs" icon="List" />
        <NavItem label="Queues" icon="Layers" />
      </Sidebar>
    </div>
  ),
};
