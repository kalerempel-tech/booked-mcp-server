#!/usr/bin/env node

/**
 * MCP Server for GoHighLevel - Fresh Deployment
 * Proper MCP protocol implementation
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const MODAL_API_URL = process.env.MODAL_API_URL || 'https://kalerempel--booked-demo-analysis-fastapi-app.modal.run';

// Explicit headers for GoHighLevel MCP protocol
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('X-MCP-Version', '1.0.0');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'booked-mcp-server',
    version: '3.0.0-fresh',
    protocol: 'MCP'
  });
});

// Tool discovery endpoint - MCP compliant
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'research_website',
        description: 'Research a company website during a call to generate a customized AI voice agent persona',
        input_schema: {
          type: 'object',
          properties: {
            website: {
              type: 'string',
              description: 'The website URL to research (e.g., "staples.com")'
            }
          },
          required: ['website']
        }
      }
    ]
  });
});

// Tool execution endpoint
app.post('/tools/research_website', async (req, res) => {
  try {
    const { website } = req.body;

    if (!website) {
      return res.status(400).json({
        success: false,
        error: 'Missing website parameter'
      });
    }

    console.log(`[MCP] Researching: ${website}`);

    const response = await fetch(`${MODAL_API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: website }),
    });

    const result = await response.json();

    res.json({
      success: true,
      result: {
        company: result.data.persona.companyName,
        persona: result.data.persona.systemInstruction,
        greeting: result.data.persona.initialMessage,
        brandColor: result.data.persona.brandColor
      }
    });

  } catch (error) {
    console.error('[MCP] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generic tool invoke endpoint
app.post('/tools/invoke', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;

    if (name === 'research_website') {
      const website = args?.website;

      if (!website) {
        return res.status(400).json({
          success: false,
          error: 'Missing website parameter'
        });
      }

      const response = await fetch(`${MODAL_API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: website }),
      });

      const result = await response.json();

      res.json({
        success: true,
        result: {
          company: result.data.persona.companyName,
          persona: result.data.persona.systemInstruction,
          greeting: result.data.persona.initialMessage,
          brandColor: result.data.persona.brandColor
        }
      });
    }

    res.status(404).json({
      success: false,
      error: `Unknown tool: ${name}`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Root endpoint - MCP server info + tool discovery
app.get('/', (req, res) => {
  res.json({
    name: 'booked-mcp-server',
    version: '3.0.0-fresh',
    protocol: 'MCP over HTTP',
    description: 'MCP server for analyzing websites and generating AI voice agent personas',
    tools: [
      {
        name: 'research_website',
        description: 'Research a company website during a call to generate a customized AI voice agent persona',
        input_schema: {
          type: 'object',
          properties: {
            website: {
              type: 'string',
              description: 'The website URL to research (e.g., "staples.com")'
            }
          },
          required: ['website']
        }
      }
    ],
    endpoints: {
      health: 'GET /health',
      tools: 'GET /tools',
      research_website: 'POST /tools/research_website',
      invoke: 'POST /tools/invoke'
    }
  });
});

// Additional discovery endpoints for GHL compatibility
app.get('/mcp', (req, res) => {
  res.redirect('/tools');
});

app.get('/v1/tools', (req, res) => {
  res.redirect('/tools');
});

app.get('/api/tools', (req, res) => {
  res.redirect('/tools');
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`[MCP] Server running on port ${process.env.PORT || 3001}`);
  console.log(`[MCP] Modal API: ${MODAL_API_URL}`);
});
