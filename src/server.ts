import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  loadTokens,
  loadComponents,
  loadRules,
  loadPackage,
  getProhibitionRules,
  getAllRules,
} from "./utils/loader.js";
import { getToken } from "./tools/get-token.js";
import { getComponent } from "./tools/get-component.js";
import { checkRule } from "./tools/check-rule.js";
import { search } from "./tools/search.js";
import type { RuleFilter } from "./utils/types.js";

export function createServer(): Server {
  const pkg = loadPackage();
  const components = loadComponents();
  const rules = loadRules();

  const server = new Server(
    { name: "melta-ui", version: pkg.version },
    { capabilities: { resources: {}, tools: {} } }
  );

  // --- Resources ---

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "melta://tokens",
        name: "Design Tokens",
        description: "melta UI design tokens (colors, typography, spacing, etc.)",
        mimeType: "application/json",
      },
      {
        uri: "melta://components",
        name: "Components",
        description: `All ${components.components.length} component metadata with Tailwind classes`,
        mimeType: "application/json",
      },
      {
        uri: "melta://rules",
        name: "Prohibition Rules (all)",
        description: `All ${rules.rules.length} prohibition rules including manual ones (full SSOT for AI reference)`,
        mimeType: "application/json",
      },
      {
        uri: "melta://rules/auto-detectable",
        name: "Prohibition Rules (auto-detectable subset)",
        description: "Subset of rules that check_rule can auto-detect from Tailwind class strings",
        mimeType: "application/json",
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    // Handle melta://components/{id}
    const componentMatch = uri.match(/^melta:\/\/components\/(.+)$/);
    if (componentMatch) {
      const id = componentMatch[1];
      const comp = getComponent(id);
      if (!comp) {
        throw new Error(`Component not found: ${id}`);
      }
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(comp, null, 2),
          },
        ],
      };
    }

    switch (uri) {
      case "melta://tokens":
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(loadTokens(), null, 2),
            },
          ],
        };

      case "melta://components":
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(loadComponents(), null, 2),
            },
          ],
        };

      case "melta://rules":
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(loadRules(), null, 2),
            },
          ],
        };

      case "melta://rules/auto-detectable":
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(getProhibitionRules(), null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });

  // --- Tools ---

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_token",
        description:
          "Get a design token by dot-path. Returns the token object with value and tailwind class.",
        inputSchema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description:
                'Dot-separated path to the token (e.g. "color.primary.600", "spacing.4", "radius.lg", "typography.fontSize.base")',
            },
          },
          required: ["path"],
        },
      },
      {
        name: "get_component",
        description:
          "Get component metadata including variants, sizes, accessibility requirements, and HTML sample.",
        inputSchema: {
          type: "object" as const,
          properties: {
            id: {
              type: "string",
              description:
                'Component ID (e.g. "button", "card", "table", "sidebar")',
            },
          },
          required: ["id"],
        },
      },
      {
        name: "check_rule",
        description:
          "Check Tailwind classes against melta UI prohibition rules. Returns violations with reasons and alternatives.",
        inputSchema: {
          type: "object" as const,
          properties: {
            classes: {
              type: "string",
              description:
                'Space-separated Tailwind classes to check (e.g. "text-black shadow-2xl bg-green-500")',
            },
          },
          required: ["classes"],
        },
      },
      {
        name: "search",
        description:
          "Search across tokens and components by keyword. Matches against names, values, tailwind classes, and descriptions.",
        inputSchema: {
          type: "object" as const,
          properties: {
            query: {
              type: "string",
              description: 'Search keyword (e.g. "card", "primary", "shadow")',
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_rules",
        description:
          `Get melta UI prohibition rules from rules.json (${rules.rules.length} total). Use this to retrieve manual/contextual rules that check_rule cannot auto-detect. Supports filtering by category, severity, or detector.`,
        inputSchema: {
          type: "object" as const,
          properties: {
            category: {
              type: "string",
              description:
                'Filter by category (e.g. "color", "spacing", "accessibility", "button", "modal")',
            },
            severity: {
              type: "string",
              enum: ["error", "warn"],
              description: "Filter by severity",
            },
            detector: {
              type: "string",
              enum: ["tailwind-class", "tailwind-class-prefix", "tailwind-class-segment", "html-attr", "composition", "manual"],
              description: "Filter by detector type",
            },
          },
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get_token": {
        const path = (args as { path: string }).path;
        const result = getToken(path);
        if (result === null) {
          return {
            content: [
              { type: "text", text: `Token not found: ${path}` },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_component": {
        const id = (args as { id: string }).id;
        const comp = getComponent(id);
        if (!comp) {
          return {
            content: [
              { type: "text", text: `Component not found: ${id}` },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(comp, null, 2),
            },
          ],
        };
      }

      case "check_rule": {
        const classes = (args as { classes: string }).classes;
        const violations = checkRule(classes);
        if (violations.length === 0) {
          return {
            content: [
              { type: "text", text: "No violations found." },
            ],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(violations, null, 2),
            },
          ],
        };
      }

      case "search": {
        const query = (args as { query: string }).query;
        const results = search(query);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "get_rules": {
        const filter = (args as RuleFilter | undefined) ?? {};
        const results = getAllRules(filter);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
