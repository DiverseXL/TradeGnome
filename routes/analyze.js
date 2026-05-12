// routes/analyze.js
// POST /api/analyze
// Accepts a wallet address, pulls GoldRush data, runs Genome AI, returns results.

const express = require('express');
const router = express.Router();

const {
  getClassifiedTransactions,
  getWalletBalances,
  extractSwaps,
  extractBridgeEvents,
  analyseBalanceComposition,
} = require('../services/goldrush');

const { generateGenome } = require('../services/genome');

router.post('/', async (req, res) => {
  const { wallet, chain = 'solana-mainnet' } = req.body;

  if (!wallet) {
    return res.status(400).json({ error: 'wallet address is required' });
  }

  try {
    console.log(`\n🔍 Analyzing wallet: ${wallet}`);

    // Step 1 — Pull raw data from GoldRush
    console.log('   ↳ Fetching classified transactions...');
    const [rawTxs, balances] = await Promise.all([
      getClassifiedTransactions(wallet, chain),
      getWalletBalances(wallet, chain),
    ]);

    // Step 2 — Extract structured events
    const swaps = extractSwaps(rawTxs);
    const bridges = extractBridgeEvents(rawTxs);
    const composition = analyseBalanceComposition(balances);


    console.log(`   ↳ ${swaps.length} swaps, ${bridges.length} bridges, $${Number(composition.totalPortfolioUsd).toLocaleString()} portfolio`);

    if (rawTxs.length === 0) {
      return res.status(422).json({
        error: 'No transaction history found for this wallet on this chain.',
      });
    }

    // Pass raw txs to genome even if no swaps detected —
    // the AI can still infer patterns from timing, value, and counterparties
    const txSummary = rawTxs.slice(0, 50).map((tx) => ({
      date:      tx.block_signed_at,
      to:        tx.to_address,
      value_usd: tx.value_quote,
      gas_usd:   tx.gas_quote,
      success:   tx.successful,
    }));

    // Step 3 — Run Genome AI
    console.log('   ↳ Running Genome AI engine...');
    const genome = await generateGenome(wallet, swaps, bridges, composition, txSummary);

    console.log(`   ✅ Genome generated: ${genome.strategyTitle}`);

    // Step 4 — Return everything
    res.json({
      wallet,
      chain,
      dataSnapshot: {
        totalTxs: rawTxs.length,
        totalSwaps: swaps.length,
        totalBridges: bridges.length,
        portfolioUsd: composition.totalPortfolioUsd,
        stablecoinPct: composition.stablecoinPct,
        topHoldings: composition.topHoldings.slice(0, 5),
      },
      genome,
    });
  } catch (err) {
    console.error('❌ Analyze error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;