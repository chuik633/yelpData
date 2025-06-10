import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "docs", // Ensure the output directory is set to 'docs'
    assetsDir: "assets", // Specify the assets directory
  },
  publicDir: "public", // Ensure static files are included
});
