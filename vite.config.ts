import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

// public/benji.svg is both the standalone image (JSON-LD) and the inline portrait,
// so the page can theme and animate its layers.
export default defineConfig({
  plugins: [
    {
      name: "inline-portrait",
      transformIndexHtml(html) {
        const svg = readFileSync(new URL("./public/benji.svg", import.meta.url), "utf8");
        return html.replace("<!-- portrait -->", svg.trim());
      },
    },
  ],
});
