require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const http      = require('http');
const WebSocket = require('ws');

const analyzeRouter              = require('./routes/analyze');
const { router: agentRouter,
        registerWsClients }      = require('./routes/agent');

const app    = express();
const server = http.createServer(app);

// ── WebSocket server ─────────────────────────────────────────
const wss     = new WebSocket.Server({ server, path: '/ws' });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`   🔌 WS client connected (${clients.size} total)`);
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`   🔌 WS client disconnected (${clients.size} total)`);
  });
});

registerWsClients(clients);

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────
app.use('/api/analyze', analyzeRouter);
app.use('/api/agent',   agentRouter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'TradeGenome',
    keys: {
      goldrush: !!process.env.GOLDRUSH_API_KEY,
      openai:   !!process.env.OPENAI_API_KEY,
    },
  });
});

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`\n🧬 TradeGenome backend running on :${PORT}`);
  console.log(`   HTTP  → http://localhost:${PORT}/health`);
  console.log(`   WS    → ws://localhost:${PORT}/ws\n`);
});