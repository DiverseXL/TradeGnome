// services/monitor.js
// The live agent. Polls GoldRush every 60s for new activity on a watched wallet.
// Compares new transactions against the genome's agent triggers using GPT-4o.
// Fires alerts via WebSocket to any connected frontend client.

const { getClassifiedTransactions, extractSwaps, extractBridgeEvents } = require('./goldrush');
const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Active watchers: Map<walletAddress, { genome, intervalId, lastSeenTx }>
const watchers = new Map();

/**
 * Start monitoring a wallet against its genome triggers.
 * @param {string} wallet
 * @param {object} genome - the genome object from generateGenome()
 * @param {string} chain
 * @param {function} onAlert - callback(alert) fired when a trigger matches
 */
function startWatcher(wallet, genome, chain = 'solana-mainnet', onAlert) {
  if (watchers.has(wallet)) stopWatcher(wallet);

  console.log(`\n👁  Monitor started for ${wallet.slice(0, 8)}...`);
  console.log(`   Watching ${genome.agentTriggers.length} triggers every 60s\n`);

  let lastSeenTx = null;

  const intervalId = setInterval(async () => {
    try {
      const txs = await getClassifiedTransactions(wallet, chain);
      if (!txs.length) return;

      // Only look at txs we haven't seen before
      const newest = txs[0]?.tx_hash;
      if (newest === lastSeenTx) return;

      // Find all new txs since last check
      const lastIndex = lastSeenTx ? txs.findIndex((t) => t.tx_hash === lastSeenTx) : 1;
      const newTxs = txs.slice(0, lastIndex === -1 ? 3 : lastIndex);
      lastSeenTx = newest;

      if (!newTxs.length) return;

      const swaps   = extractSwaps(newTxs);
      const bridges = extractBridgeEvents(newTxs);

      if (!swaps.length && !bridges.length) return;

      console.log(`   🔔 ${wallet.slice(0, 8)}... has ${newTxs.length} new tx(s) — evaluating...`);

      // Ask GPT-4o if any new activity matches the genome triggers
      const alert = await evaluateTriggers(wallet, genome, swaps, bridges);
      if (alert) {
        console.log(`   ✅ Trigger matched: ${alert.triggerMatched}`);
        onAlert(alert);
      }
    } catch (err) {
      console.error(`   ❌ Monitor error for ${wallet.slice(0, 8)}:`, err.message);
    }
  }, 60_000); // poll every 60 seconds

  watchers.set(wallet, { genome, intervalId, chain });
}

function stopWatcher(wallet) {
  const watcher = watchers.get(wallet);
  if (watcher) {
    clearInterval(watcher.intervalId);
    watchers.delete(wallet);
    console.log(`   🛑 Monitor stopped for ${wallet.slice(0, 8)}...`);
  }
}

function listWatchers() {
  return Array.from(watchers.keys());
}

/**
 * Ask GPT-4o to evaluate whether new on-chain activity matches genome triggers.
 * Returns an alert object or null.
 */
async function evaluateTriggers(wallet, genome, swaps, bridges) {
  const prompt = `You are a trading agent monitor. A wallet has a known trading genome with specific behavioral triggers.

WALLET: ${wallet}

GENOME TRIGGERS (what to watch for):
${genome.agentTriggers.map((t, i) => `${i + 1}. ${t}`).join('\n')}

GENOME STRATEGY CONTEXT:
${genome.oneLiner}

NEW ON-CHAIN ACTIVITY DETECTED:
Swaps: ${JSON.stringify(swaps.slice(0, 5), null, 2)}
Bridges: ${JSON.stringify(bridges.slice(0, 3), null, 2)}

Does any of this new activity match one of the genome triggers?

Respond ONLY with valid JSON:
{
  "matched": true or false,
  "triggerMatched": "exact trigger text that matched, or null",
  "confidence": "High | Medium | Low",
  "explanation": "one sentence explaining why this matches or doesn't",
  "action": "What a follower of this strategy should consider doing right now"
}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
    max_tokens: 300,
  });

  const result = JSON.parse(response.choices[0].message.content);
  if (!result.matched) return null;

  return {
    wallet,
    timestamp: new Date().toISOString(),
    triggerMatched: result.triggerMatched,
    confidence: result.confidence,
    explanation: result.explanation,
    action: result.action,
  };
}

module.exports = { startWatcher, stopWatcher, listWatchers };