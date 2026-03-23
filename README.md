# Booked Demo MCP Server

Model Context Protocol (MCP) server that analyzes websites and generates custom AI personas for voice agents.

## What It Does

When a voice AI (like GoHighLevel Conversations) needs to analyze a prospect's website mid-call, it calls this MCP server's `analyze_website` tool. The server:

1. Takes a website URL as input
2. Uses Google Search + Firecrawl to gather business information
3. Generates a custom AI persona with:
   - Company name and branding
   - System instructions for the voice agent
   - Initial message
   - Brand colors
   - Source citations

## Setup

### 1. Install Dependencies

```bash
cd mcp-server
npm install
```

### 2. Environment Variables

Create a `.env` file in the `mcp-server` directory:

```bash
# Required: Google Gemini API Key
API_KEY=your_google_gemini_api_key_here

# Optional: Firecrawl API Key (for deep web scraping)
firecrawl_key=your_firecrawl_api_key_here
```

### 3. Test Locally

```bash
npm start
```

The server runs via stdio (standard input/output), which is how MCP servers communicate with clients.

## Connecting to GoHighLevel

In your GoHighLevel Conversations AI setup:

1. Add a new MCP server connection
2. Use command: `node /path/to/mcp-server/src/index.js`
3. Server will expose the `analyze_website` tool

### Example GHL Workflow

```
User calls in → GHL AI collects website URL →
Calls MCP tool "analyze_website" with URL →
MCP server analyzes and returns persona →
GHL AI updates its system instructions →
Continues call as new custom persona
```

## Deployment Options

### Option 1: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Option 2: Your Own Server
1. Copy the `mcp-server` directory to your server
2. Install Node.js 18+
3. Run `npm install`
4. Set environment variables
5. Run with `npm start` or via process manager (PM2, systemd)

### Option 3: Docker (Coming Soon)
```bash
docker build -t booked-mcp-server .
docker run -d --env-file .env booked-mcp-server
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `API_KEY` | ✅ Yes | Google Gemini API key from https://aistudio.google.com/app/apikey |
| `firecrawl_key` | ⚠️ Optional | Firecrawl API key for deep web scraping fallback |

## Tool Schema

### analyze_website

**Input:**
```json
{
  "url": "example.com"
}
```

**Output (Success):**
```json
{
  "success": true,
  "data": {
    "companyName": "Acme Corp",
    "systemInstruction": "You are [BOT_NAME]...",
    "initialMessage": "Hi! Thanks for calling...",
    "brandColor": "#2563EB",
    "sources": [
      {
        "title": "Acme Corp - About",
        "uri": "https://acme.com/about"
      }
    ]
  }
}
```

**Output (Error):**
```json
{
  "success": false,
  "error": "Failed to analyze website: ..."
}
```

## Troubleshooting

### Server won't start
- Check Node.js version: `node --version` (must be 18+)
- Verify dependencies: `npm install`

### Analysis fails
- Check Google API key is valid: `echo $API_KEY`
- Check Firecrawl key (if using): `echo $firecrawl_key`
- Check server logs for detailed error messages

### GHL can't connect
- Verify the command path is correct
- Ensure Node.js is in the system PATH
- Check that environment variables are loaded

## Development

Run in watch mode for auto-reload:
```bash
npm run dev
```

## License

MIT
