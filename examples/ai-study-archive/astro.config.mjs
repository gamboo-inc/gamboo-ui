import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

const ghPagesBase = "/gamboo-ui/ai-study-archive";

export default defineConfig({
  site: process.env.GH_PAGES ? "https://gamboo-inc.github.io" : "https://example.com",
  base: process.env.GH_PAGES ? ghPagesBase : "/",
  markdown: {
    // gamboo UI の DS ルール（COLOR_NO_INLINE_STYLE_HARDCODE）に合わせ、
    // Shiki の inline style 出力を止めて独自の pre/code スタイルを使う
    syntaxHighlight: false,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
