import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    updatedDate: z.date(),
    status: z.enum(["学習中", "完了"]),
    level: z.string(),
    tags: z.array(z.string()).default([]),
    references: z
      .array(z.object({ label: z.string(), url: z.string() }))
      .default([]),
    relatedArticles: z.array(z.string()).default([]),
  }),
});

const media = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/media" }),
  schema: z.object({
    title: z.string(),
    url: z.string(),
    memo: z.string().default(""),
    addedDate: z.date(),
  }),
});

const glossary = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/glossary" }),
  schema: z.object({
    term: z.string(),
    description: z.string(),
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/faq" }),
  schema: z.object({
    question: z.string(),
    category: z.string(),
    order: z.number().default(0),
  }),
});

export const collections = { articles, media, glossary, faq };
