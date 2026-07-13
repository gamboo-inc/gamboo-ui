import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

const ghPagesBase = "/melta-ui/ai-study-archive";

export default defineConfig({
  site: process.env.GH_PAGES ? "https://hiro444647.github.io" : "https://example.com",
  base: process.env.GH_PAGES ? ghPagesBase : "/",
  markdown: {
    // melta UI の DS ルール（COLOR_NO_INLINE_STYLE_HARDCODE）に合わせ、
    // Shiki の inline style 出力を止めて独自の pre/code スタイルを使う
    syntaxHighlight: false,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
