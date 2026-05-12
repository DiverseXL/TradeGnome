// routes/agent.js
// POST /api/agent/start  - begin watching a wallet
// POST /api/agent/stop   - stop watching a wallet
// GET  /api/agent/list   - list all active watchers
//
// Alerts are pushed to the frontend via WebSocket (ws://localhost:3002/ws)

const express = require('express');
const router  = express.Router();
const { startWatcher, stopWatcher, listWatchers } = require('../services/monitor');

// WebSocket clients registry — populated by index.js
let wsClients = new Set();

function registerWsClients(clientSet) {
  wsClients = clientSet;
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  wsClients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(msg); // 1 = OPEN
  });
}

// ── POST /api/agent/start ────────────────────────────────────
router.post('/start', (req, res) => {
  const { wallet, genome, chain = 'solana-mainnet' } = req.body;

  if (!wallet || !genome) {
    return res.status(400).json({ error: 'wallet and genome are required' });
  }

  startWatcher(wallet, genome, chain, (alert) => {
    // Fire alert to all connected frontend clients
    broadcast({ type: 'ALERT', alert });
    console.log(`   📡 Alert broadcast: ${alert.triggerMatched}`);
  });

  res.json({ status: 'watching', wallet });
});

// ── POST /api/agent/stop ─────────────────────────────────────
router.post('/stop', (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: 'wallet is required' });

  stopWatcher(wallet);
  res.json({ status: 'stopped', wallet });
});

// ── GET /api/agent/list ──────────────────────────────────────
router.get('/list', (_req, res) => {
  res.json({ watching: listWatchers() });
});

module.exports = { router, registerWsClients };