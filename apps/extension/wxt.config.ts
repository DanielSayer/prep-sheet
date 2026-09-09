import { defineConfig } from "wxt";
import { getBuildSettings } from "./config/build";

export default defineConfig({
  srcDir: "src",
  mode: "development",
  manifestVersion: 3,
  modules: ["@wxt-dev/module-react"],
  imports: false,
  webExt: { disabled: true },
  manifest: ({ mode }) => {
    const { origin, key, development } = getBuildSettings(mode);
    return {
      name: development ? "Prep Sheet (development)" : "Prep Sheet",
      description: "Save recipes from your browser to Prep Sheet.",
      key,
      permissions: ["activeTab", "scripting", "identity", "storage"],
      minimum_chrome_version: "116",
      host_permissions: [`${origin}/*`],
      action: { default_title: "Prep Sheet" },
    };
  },
  vite: ({ mode }) => ({
    define: {
      "import.meta.env.WXT_PREP_SHEET_ORIGIN": JSON.stringify(
        getBuildSettings(mode).origin,
      ),
    },
  }),
});
