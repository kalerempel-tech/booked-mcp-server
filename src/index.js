#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Modal API endpoint - will be deployed on Modal
const MODAL_API_URL = process.env.MODAL_API_URL || "http://localhost:8000";
const ANALYZE_ENDPOINT = `${MODAL_API_URL}/analyze`;

// Create MCP Server
const server = new Server(
  {
    name: "booked-demo-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "analyze_website",
        description:
          "Analyzes a website and generates a custom AI persona for a voice agent. " +
          "Uses Google Search and Firecrawl to gather business information, then creates " +
          "a detailed agent persona with system instructions, initial message, and brand colors. " +
          "This runs on Modal serverless for fast, scalable analysis.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The website URL to analyze (e.g., 'example.com' or 'https://example.com')",
            },
          },
          required: ["url"],
        },
      },
    ],
  };
});

// Handle tool execution - calls Modal API
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "analyze_website") {
    const { url } = args;

    if (!url || typeof url !== "string") {
      throw new Error("Invalid or missing 'url' parameter");
    }

    try {
      console.error(`[MCP] Analyzing website: ${url}`);
      console.error(`[MCP] Calling Modal API at: ${MODAL_API_URL}`);

      // Call Modal API
      const response = await fetch(ANALYZE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Modal API returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Analysis failed");
      }

      console.error(`[MCP] Analysis successful: ${result.data.persona.companyName}`);

      // Return structured data that GHL can use
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              data: {
                companyName: result.data.persona.companyName,
                systemInstruction: result.data.persona.systemInstruction,
                initialMessage: result.data.persona.initialMessage,
                brandColor: result.data.persona.brandColor,
                sources: result.data.sources,
              },
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("[MCP] Request failed:", error);

      // Return error in a format GHL can handle
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message || "Failed to analyze website",
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
async function main() {
  console.error("[MCP] Booked Demo MCP Server starting...");
  console.error("[MCP] Modal API URL:", MODAL_API_URL);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[MCP] Server running and ready for connections");
  console.error("[MCP] Exposed tool: analyze_website");
}

main().catch((error) => {
  console.error("[MCP] Fatal error:", error);
  process.exit(1);
});
