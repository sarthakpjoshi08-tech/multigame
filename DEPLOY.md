# Deployment Guide

## Quick Start - Local Testing

```bash
cd C:\claudepro2
npm install
npm start
# Open http://localhost:3000 in two browser windows/tabs
```

## Deploy to Netlify (Static + External WebSocket Server)

### Option A: Netlify Static + Railway WebSocket (Recommended)

**1. Deploy WebSocket Server to Railway:**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Or via Railway Dashboard:
1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Connect this repository
4. Railway auto-detects Node.js and runs `npm start`

**2. Deploy Frontend to Netlify:**

1. Push to GitHub
2. Go to https://netlify.com → Add new site → Import from Git
3. Build settings:
   - Build command: (leave empty)
   - Publish directory: `public`
4. Add Environment Variable:
   - Key: `VITE_WS_URL`
   - Value: `wss://your-railway-app.up.railway.app` (your Railway URL with wss://)

**3. Update Frontend for External WebSocket:**

In `public/index.html`, replace the socket connection line:
```javascript
// Change from:
socket = io({ transports: ['websocket', 'polling'], ... });

// To:
const WS_URL = 'wss://your-railway-app.up.railway.app';
socket = io(WS_URL, { transports: ['websocket', 'polling'], ... });
```

### Option B: Netlify Functions (SSE-based, No External Server)

This version uses Netlify Functions with Server-Sent Events for real-time updates.

1. Rename `public/index-netlify.html` to `public/index.html`
2. Deploy to Netlify with:
   - Build command: `echo "static site"`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`

**Note:** Netlify Functions have limitations:
- 10-second execution timeout
- No persistent connections (uses SSE polling)
- May not scale well for many concurrent games

### Option C: Full Netlify + Netlify WebSockets (Blaze Plan)

Netlify now supports WebSockets on their Blaze plan with Netlify Functions + WebSocket support. This requires:
- Netlify Blaze plan
- Special configuration

## Project Structure

```
├── public/
│   ├── index.html          # Main version (Socket.IO + external server)
│   └── index-netlify.html  # Netlify Functions version (SSE)
├── server.js               # Express + Socket.IO server
├── netlify/
│   └── functions/
│       ├── game.js         # Netlify Function for SSE-based multiplayer
│       └── package.json
├── package.json
├── netlify.toml            # Netlify config
├── .gitignore
├── README.md
└── DEPLOY.md
```

## Testing on Two Phones

1. **Deploy using Option A** (recommended for best experience)
2. Open the Netlify URL on Phone 1 (e.g., `https://your-app.netlify.app`)
3. Tap "Create Game" → Enter name → Get 6-character code
4. Share code with Phone 2 (via text, AirDrop, etc.)
5. On Phone 2: Open URL → "Join Game" → Enter name + code
6. Play!

## Troubleshooting

**WebSocket connection fails:**
- Check `VITE_WS_URL` is correct (wss:// not https://)
- Ensure Railway server is running
- Check browser console for CORS errors

**Game code not working:**
- Codes are case-insensitive
- Codes expire when game ends
- Max 2 players per game

**Netlify Functions version issues:**
- Check function logs in Netlify dashboard
- 10-second timeout may cause delays
- SSE may not work on some mobile browsers

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_WS_URL` | Option A | WebSocket server URL (wss://...) |
| `PORT` | Auto | Set by hosting platform |

## Scaling Considerations

For production with many users:
- Use Redis for game state (instead of in-memory Map)
- Add authentication
- Implement rate limiting
- Use a dedicated WebSocket service (Pusher, Ably, or self-hosted)
- Add database for game history

## Local Network Testing (No Deploy)

To test on two phones on same WiFi:

```bash
# Find your computer's IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# Start server
npm start

# On phones, open http://YOUR_IP:3000
```