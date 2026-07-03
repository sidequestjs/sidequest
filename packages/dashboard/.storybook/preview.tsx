import type { Preview } from "@storybook/react-vite";
import "../src/ui/styles.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="sq-surface" style={{ minHeight: "100vh", padding: "2rem" }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
