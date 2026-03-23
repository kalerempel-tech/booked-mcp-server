# GoHighLevel MCP Integration Guide

## Option 1: Deploy to Railway (Recommended)

Easiest option - Railway hosts the HTTP server for you.

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

### 3. Initialize in MCP server directory
```bash
cd /Users/kalerempel/booked-solid-ai-agent-demo/mcp-server
railway init
```

### 4. Set environment variables
In Railway dashboard or via CLI:
```bash
railway variables set MODAL_API_URL=https://kalerempel--booked-demo-analysis-fastapi-app.modal.run
```

### 5. Deploy
```bash
railway up
```

### 6. Get your URL
Railway will give you a URL like:
```
https://your-project.up.railway.app
```

**This is your MCP URL for GoHighLevel!**

---

## Option 2: Run Locally with Ngrok

For testing - expose local server to internet.

### 1. Install dependencies
```bash
cd /Users/kalerempel/booked-solid-ai-agent-demo/mcp-server
npm install
```

### 2. Set environment variables
```bash
export MODAL_API_URL=https://kalerempel--booked-demo-analysis-fastapi-app.modal.run
```

Or create `.env` file:
```bash
MODAL_API_URL=https://kalerempel--booked-demo-analysis-fastapi-app.modal.run
```

### 3. Start HTTP server
```bash
npm run start:http
```

You'll see:
```
[MCP HTTP] Server running on port 3000
```

### 4. Expose with ngrok
```bash
# Install ngrok first if needed
ngrok http 3000
```

Ngrok will give you a URL like:
```
https://abc123.ngrok.io
```

**This is your MCP URL for GoHighLevel!**

### 5. Keep ngrok running
Don't close the terminal - the URL will change if you restart.

---

## Option 3: Deploy to Render/VPS

### Deploy to Render

1. Create `render.yaml` in mcp-server folder:
```yaml
services:
  - type: web
    name: booked-demo-mcp-server
    env: node
    buildCommand: npm install
    startCommand: npm run start:http
    envVars:
      - key: MODAL_API_URL
        value: https://kalerempel--booked-demo-analysis-fastapi-app.modal.run
```

2. Push to GitHub
3. Connect repo to Render
4. Deploy

Get the URL from Render dashboard.

---

## Connecting to GoHighLevel

Once you have your HTTP server URL:

### 1. Go to GoHighLevel
Navigate to:
**Conversations AI** → **MCP Servers** → **Add MCP**

### 2. Fill in the form:

**MCP Name:**
```
Booked Demo Analysis
```

**MCP URL:**
```
https://your-url.up.railway.app
```
or
```
https://abc123.ngrok.io
```

**Timeout:**
```
60000
```
(60 seconds - gives time for website analysis)

**Headers:**
Leave empty (unless your deployment requires authentication)

**Query Parameters:**
Leave empty

### 3. Save and Test

After saving, GHL should verify the connection. You can test by calling the `analyze_website` tool.

---

## Testing the Connection

### Test health endpoint
```bash
curl https://your-url.up.railway.app/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "booked-demo-mcp-server",
  "version": "1.0.0"
}
```

### Test analyze_website tool
```bash
curl -X POST https://your-url.up.railway.app/tools/analyze_website \
  -H "Content-Type: application/json" \
  -d '{"url":"staples.com"}'
```

Should return persona data.

---

## GHL System Prompt Configuration

Once connected, update your Jordan system prompt to reference the tool:

```yaml
tools:
  - name: analyze_website
    description: Analyzes a website and generates custom AI voice agent persona
    timeout: 60000  # 60 seconds
```

The tool is now available in your GHL Conversations AI workflows!

---

## Endpoint Reference

Your HTTP server exposes these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/tools` | List available tools |
| POST | `/tools/analyze_website` | Execute website analysis |
| POST | `/tools/call` | Generic tool execution |
| GET | `/` | Server info |

---

## Troubleshooting

### "Connection refused" in GHL
- Check your server is running
- Verify the URL is correct
- Check firewall/security settings

### "Timeout" error
- Increase timeout in GHL (try 90000ms)
- Check Modal API is working
- Check server logs

### "Tool not found"
- Verify the endpoint path: `/tools/analyze_website`
- Check server logs for incoming requests

### "Analysis failed"
- Check MODAL_API_URL is set correctly
- Verify Modal API is deployed
- Check Modal secrets are configured

---

## Monitoring

### Check server logs
```bash
# Railway
railway logs

# Local
npm run start:http
# (logs output to stderr)
```

### Check Modal API
Visit: https://modal.com/apps/kalerempel/main/deployed/booked-demo-analysis

---

## Security Notes

For production:
1. Add API key authentication to HTTP server
2. Use HTTPS (Railway does this automatically)
3. Add rate limiting
4. Monitor for abuse

Example: Add authentication to headers in GHL:
```
Authorization: Bearer your-secret-api-key
```

Then verify in http-server.js:
```javascript
const authHeader = req.headers.authorization;
if (authHeader !== `Bearer ${process.env.API_KEY}`) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

---

## Summary

**Fastest path to production:**
1. Deploy to Railway (5 minutes)
2. Copy Railway URL
3. Paste into GoHighLevel MCP form
4. Done!

**Your URL will look like:**
```
https://booked-demo-mcp-server-production.up.railway.app
```

**In GoHighLevel:**
- Name: Booked Demo Analysis
- URL: (your Railway URL)
- Timeout: 60000
- Headers: (empty)

Ready to demo! 🚀
