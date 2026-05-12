// services/genome.js
// The brain of TradeGenome.
// Takes structured GoldRush data and reverse-engineers the wallet's trading strategy.

const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Build a compact data payload to send to the LLM.
 * We summarize instead of dumping raw JSON — saves tokens, improves output quality.
 */
function buildGenomePayload(swaps, bridges, composition) {
  // Summarize swap patterns
  const swapSummary = swaps.slice(0, 40).map((s) => ({
    date: s.timestamp,
    from: s.fromToken,
    to: s.toToken,
    usd: s.usdValueAtTime,
    dex: s.dex,
  }));

  // Summarize bridge events
  const bridgeSummary = bridges.slice(0, 20).map((b) => ({
    date: b.timestamp,
    route: `${b.fromChain} → ${b.toChain}`,
    token: b.token,
    usd: b.usdValueAtTime,
  }));

  // Token rotation — what tokens does the wallet keep buying?
  const tokenFrequency = {};
  swaps.forEach((s) => {
    tokenFrequency[s.toToken] = (tokenFrequency[s.toToken] || 0) + 1;
  });
  const topTargetTokens = Object.entries(tokenFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([token, count]) => ({ token, count }));

  // DEX preference
  const dexFrequency = {};
  swaps.forEach((s) => {
    if (s.dex) dexFrequency[s.dex] = (dexFrequency[s.dex] || 0) + 1;
  });

  // Trade size buckets
  const tradeSizes = swaps
    .map((s) => s.usdValueAtTime)
    .filter(Boolean)
    .map(Number);

  const avgTradeSize =
    tradeSizes.length > 0
      ? (tradeSizes.reduce((a, b) => a + b, 0) / tradeSizes.length).toFixed(0)
      : 'unknown';

  const maxTradeSize =
    tradeSizes.length > 0 ? Math.max(...tradeSizes).toFixed(0) : 'unknown';

  return {
    portfolioComposition: composition,
    totalSwaps: swaps.length,
    totalBridges: bridges.length,
    avgTradeSizeUsd: avgTradeSize,
    maxTradeSizeUsd: maxTradeSize,
    topTargetTokens,
    dexPreference: dexFrequency,
    recentSwaps: swapSummary,
    bridgeHistory: bridgeSummary,
  };
}

/**
 * The genome prompt — this is where the magic happens.
 * Designed to extract 5 specific behavioral signals judges love.
 */
function buildGenomePrompt(walletAddress, payload) {
  return `You are a blockchain trading analyst specializing in on-chain behavioral analysis.

Analyze the following structured on-chain data for wallet: ${walletAddress}

DATA:
${JSON.stringify(payload, null, 2)}

Your task is to reverse-engineer this wallet's trading strategy and produce a "Trading Genome" — a precise, actionable summary of HOW this wallet makes money.

Respond ONLY with a valid JSON object in this exact structure:
{
  "strategyTitle": "A punchy 4-6 word title for this strategy (e.g. TGE Hunter, Stablecoin Sniper, Bridge Arbitrageur)",
  "oneLiner": "One sentence summary of the core strategy",
  "genome": "A 3-4 sentence natural language description of the strategy. Be specific about timing, token types, trade sizes, and exit conditions. Use numbers where possible.",
  "behavioralSignals": [
    "Signal 1: specific observable pattern with data to back it up",
    "Signal 2: specific observable pattern with data to back it up",
    "Signal 3: specific observable pattern with data to back it up",
    "Signal 4: specific observable pattern with data to back it up"
  ],
  "riskProfile": "Conservative | Moderate | Aggressive | Degen",
  "primaryDex": "The DEX this wallet uses most",
  "avgPositionSizeUsd": "number as string",
  "stablecoinBufferPct": "percentage as string from the portfolio data",
  "agentTriggers": [
    "Trigger 1: the specific on-chain condition an agent should watch for",
    "Trigger 2: the specific on-chain condition an agent should watch for"
  ],
  "weaknesses": "One sentence on what could cause this strategy to fail"
}

Be analytical and specific. Do not be vague. If data is insufficient for a field, make a reasoned inference and note it.`;
}

/**
 * Main function — call this from the route.
 * Returns the full genome object.
 */
async function generateGenome(walletAddress, swaps, bridges, composition, txSummary = []) {
  const payload = buildGenomePayload(swaps, bridges, composition);

  // Enrich payload with raw tx summary when swap classifier finds nothing
  if (swaps.length === 0 && txSummary.length > 0) {
    payload.rawTransactionSample = txSummary;
    payload.note = 'No DEX swaps detected via router matching. Infer strategy from raw tx patterns, counterparties, and portfolio composition.';
  }

  const prompt = buildGenomePrompt(walletAddress, payload);

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4, // Low temp = more analytical, less creative
    response_format: { type: 'json_object' },
    max_tokens: 1000,
  });

  const raw = response.choices[0].message.content;

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Genome AI returned invalid JSON: ' + raw);
  }
}

module.exports = { generateGenome, buildGenomePayload };