# TicTac Multiplayer

A real-time multiplayer tic-tac-toe game playable on two different phones via Netlify.

## Features

- Real-time multiplayer using Socket.IO
- Works on mobile browsers (iOS Safari, Chrome Android)
- 6-character game codes for easy sharing
- Clean, responsive design with dark mode support
- Play again functionality
- Connection status indicator

## Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Open http://localhost:3000
```

## Deployment to Netlify

### Option 1: Static Site + External WebSocket Server (Recommended)

Netlify doesn't support persistent WebSocket connections directly. The best approach:

1. **Deploy the frontend to Netlify** (static files)
2. **Deploy the WebSocket server separately** (Railway, Render, Fly.io, or a VPS)

#### Step 1: Deploy Frontend to Netlify

1. Push this repository to GitHub
2. Connect to Netlify
3. Build settings:
   - Build command: `echo "static site"` (or leave empty)
   - Publish directory: `public`
4. Add environment variable: `VITE_WS_URL` = your WebSocket server URL (e.g., `wss://your-server.railway.app`)

#### Step 2: Deploy WebSocket Server

**Railway (easiest):**
1. Go to railway.app
2. New Project → Deploy from GitHub
3. Select this repo
4. Set start command: `node server.js`
5. Add PORT environment variable (Railway provides this automatically)

**Render:**
1. Go to render.com
2. New Web Service
3. Connect GitHub repo
4. Build command: `npm install`
5. Start command: `node server.js`

**Fly.io:**
```bash
fly launch
fly deploy
```

#### Step 3: Update Frontend to Use External Server

In `public/index.html`, change the socket connection:
```javascript
// Replace this line:
socket = io({ ... });

// With:
const WS_URL = 'wss://your-websocket-server.com'; // Your deployed server URL
socket = io(WS_URL, { ... });
```

### Option 2: Netlify Functions + Polling (Alternative)

For a fully Netlify-native solution without external server, you'd need to implement polling/Server-Sent Events. This is included in `netlify/functions/game.js` but requires more setup.

## Project Structure

```
├── public/
│   └── index.html      # Frontend (HTML + CSS + JS)
├── server.js           # Express + Socket.IO server
├── package.json
├── netlify.toml        # Netlify configuration
└── README.md
```

## Game Rules

1. **Create Game**: Enter your name, get a 6-character code
2. **Share Code**: Send code to friend (works across different phones/networks)
3. **Join Game**: Friend enters their name + your code
4. **Play**: Take turns placing X/O on the 3x3 grid
5. **Win**: Get 3 in a row (horizontal, vertical, diagonal)
6. **Replay**: Host can start a new game

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **Backend**: Node.js + Express + Socket.IO
- **Real-time**: WebSocket (Socket.IO with polling fallback)
- **Hosting**: Netlify (static) + Railway/Render (WebSocket)

## Browser Support

- iOS Safari 14+
- Chrome Android 90+
- Firefox Mobile
- Desktop browsers

## License

MIT