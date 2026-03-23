#!/usr/bin/env node

/**
 * HTTP-based MCP Server for GoHighLevel
 * Exposes the analyze_website tool via HTTP endpoints
 * Can be deployed to Railway, Render, or run locally
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const MODAL_API_URL = process.env.MODAL_API_URL || 'https://kalerempel--booked-demo-analysis-fastapi-app.modal.run';

// Middleware with explicit headers for GoHighLevel
app.use((req, res, next) => {
  // CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Standard response headers
  res.header('Content-Type', 'application/json');
  res.header('X-MCP-Version', '1.0.0');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(cors());
app.use(express.json());

/**
 * Health check endpoint
 * GHL may call this to verify the server is running
 */
app.get('/health', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.json({
    status: 'healthy',
    service: 'booked-demo-mcp-server',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * MCP tools list endpoint
 * Returns available tools that GHL can call (MCP discovery)
 */
app.get('/tools', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.json({
    tools: [
      {
        name: 'research_website',
        description: 'Research a company website during a call to generate a customized AI voice agent persona. Analyzes the business, services, and brand voice to create a personalized demo.',
        input_schema: {
          type: 'object',
          properties: {
            website: {
              type: 'string',
              description: 'The website URL to research (e.g., "staples.com" or "https://staples.com")'
            }
          },
          required: ['website']
        }
      }
    ]
  });
});

/**
 * MCP tool execution endpoint - research_website
 * GHL will POST to this endpoint to execute the tool
 */
app.post('/tools/research_website', async (req, res) => {
  try {
    res.set('Content-Type', 'application/json');
    const { website } = req.body;

    if (!website || typeof website !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing website parameter'
      });
    }

    console.error(`[MCP HTTP] Researching website: ${website}`);
    console.error(`[MCP HTTP] Calling Modal API at: ${MODAL_API_URL}`);

    // Call Modal API (rename parameter to 'url' for Modal)
    const response = await fetch(`${MODAL_API_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: website }),
    });

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing url parameter'
      });
    }

    console.error(`[MCP HTTP] Analyzing website: ${url}`);
    console.error(`[MCP HTTP] Calling Modal API at: ${MODAL_API_URL}`);

    // Call Modal API
    const response = await fetch(`${MODAL_API_URL}/analyze`, {
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
      throw new Error(result.error || 'Analysis failed');
    }

    console.error(`[MCP HTTP] Analysis successful: ${result.data.persona.companyName}`);

    // Return in MCP tool result format
    res.json({
      success: true,
      result: {
        company: result.data.persona.companyName,
        persona: result.data.persona.systemInstruction,
        greeting: result.data.persona.initialMessage,
        brandColor: result.data.persona.brandColor,
        sources: result.data.sources || []
      }
    });

  } catch (error) {
    console.error('[MCP HTTP] Request failed:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze website'
    });
  }
});

/**
 * Generic MCP tool invocation endpoint
 * GHL may POST to /tools/invoke with tool name and parameters
 */
app.post('/tools/invoke', async (req, res) => {
  try {
    res.set('Content-Type', 'application/json');
    const { name, arguments: args } = req.body;

    console.error(`[MCP HTTP] Tool invoke request: ${name}`, args);

    if (name === 'research_website') {
      const website = args?.website;

      if (!website || typeof website !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid or missing website parameter'
        });
      }

      console.error(`[MCP HTTP] Researching website: ${website}`);
      console.error(`[MCP HTTP] Calling Modal API at: ${MODAL_API_URL}`);

      // Call Modal API
      const response = await fetch(`${MODAL_API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: website }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Modal API returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      console.error(`[MCP HTTP] Analysis successful: ${result.data.persona.companyName}`);

      // Return in MCP tool result format
      return res.json({
        success: true,
        result: {
          company: result.data.persona.companyName,
          persona: result.data.persona.systemInstruction,
          greeting: result.data.persona.initialMessage,
          brandColor: result.data.persona.brandColor,
          sources: result.data.sources || []
        }
      });
    }

    res.status(404).json({
      success: false,
      error: `Unknown tool: ${name}`,
      available_tools: ['research_website']
    });

  } catch (error) {
    console.error('[MCP HTTP] Tool invoke failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Root endpoint - MCP server info
 * Advertises this as an MCP-compliant server
 */
app.get('/', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.json({
    name: 'booked-demo-mcp-server',
    version: '1.0.0',
    protocol: 'MCP over HTTP',
    description: 'MCP server for analyzing websites and generating AI voice agent personas',
    capabilities: {
      tools: true
    },
    endpoints: {
      health: 'GET /health',
      tools: 'GET /tools',
      research_website: 'POST /tools/research_website',
      invoke: 'POST /tools/invoke'
    }
  });
});

/**
 * Legacy tool call endpoint (alias for /invoke)
 * Some implementations may use this
 */
app.post('/tools/call', async (req, res) => {
  try {
    res.set('Content-Type', 'application/json');
    const { name, arguments: args } = req.body;

    console.error(`[MCP HTTP] Tool call request: ${name}`, args);

    if (name === 'research_website' || name === 'analyze_website') {
      const website = args?.website || args?.url;

      if (!website || typeof website !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid or missing website parameter'
        });
      }

      console.error(`[MCP HTTP] Researching website: ${website}`);

      // Call Modal API
      const response = await fetch(`${MODAL_API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: website }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Modal API returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      console.error(`[MCP HTTP] Analysis successful: ${result.data.persona.companyName}`);

      // Return in MCP tool result format
      return res.json({
        success: true,
        result: {
          company: result.data.persona.companyName,
          persona: result.data.persona.systemInstruction,
          greeting: result.data.persona.initialMessage,
          brandColor: result.data.persona.brandColor,
          sources: result.data.sources || []
        }
      });
    }

    res.status(404).json({
      success: false,
      error: `Unknown tool: ${name}`,
      available_tools: ['research_website']
    });

  } catch (error) {
    console.error('[MCP HTTP] Tool call failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Backward compatibility endpoint for old tool name
 * Redirects analyze_website to research_website
 */
app.post('/tools/analyze_website', async (req, res) => {
  try {
    res.set('Content-Type', 'application/json');
    const { url } = req.body;

    // Forward to research_website endpoint
    req.body = { website: url };
    return app._router.handle({ ...req, url: '/tools/research_website', method: 'POST' }, res);
  } catch (error) {
    console.error('[MCP HTTP] Legacy endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.error(`[MCP HTTP] Server running on port ${PORT}`);
  console.error(`[MCP HTTP] Modal API URL: ${MODAL_API_URL}`);
  console.error(`[MCP HTTP] Endpoints:`);
  console.error(`  - GET  /health`);
  console.error(`  - GET  /tools`);
  console.error(`  - POST /tools/analyze_website`);
  console.error(`  - POST /tools/call`);
  console.error(`\n[MCP HTTP] Ready for GoHighLevel connection!`);
});
