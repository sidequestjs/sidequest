import type { Preview } from "@storybook/react-vite";
import "../src/ui/styles.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Design system theme",
      defaultValue: "dark",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "dark", title: "Dark" },
          { value: "light", title: "Light" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme ?? "dark";
      return (
        <div className="sq-surface" data-theme={theme} style={{ minHeight: "100vh", padding: "2rem" }}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
