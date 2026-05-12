// services/goldrush.test.js
// Run this FIRST to verify your API key and see raw data before building anything else.
// Usage: node services/goldrush.test.js <wallet_address>
//
// Good test wallets to try:
//   - Any known Solana whale from Birdeye's leaderboard
//   - Grab one from: https://birdeye.so/leaderboard

import 'dotenv/config';
import {
  getClassifiedTransactions,
  getWalletBalances,
  extractSwaps,
  extractBridgeEvents,
  analyseBalanceComposition,
} from './goldrush.js';

// ── Config ──────────────────────────────────────────────────────────────────
// Swap this for any wallet you want to test with
const TEST_WALLET = process.argv[2] || '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs';
const CHAIN = 'solana-mainnet';

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('\n🧬 TradeGenome — GoldRush Data Test');
console.log('━'.repeat(50));
console.log(`Wallet : ${TEST_WALLET}`);
console.log(`Chain  : ${CHAIN}`);
console.log('━'.repeat(50));

if (!process.env.GOLDRUSH_API_KEY || process.env.GOLDRUSH_API_KEY === 'your_goldrush_key_here') {
  console.error('\n❌  No GOLDRUSH_API_KEY found.');
  console.error('   Copy .env.example to .env and paste your key.\n');
  process.exit(1);
}

try {
  // 1. Pull classified transactions
  console.log('\n⏳  Fetching classified transactions...');
  const rawTxs = await getClassifiedTransactions(TEST_WALLET, CHAIN);
  console.log(`✅  ${rawTxs.length} transactions returned`);

  // 2. Extract structured events
  const swaps = extractSwaps(rawTxs);
  const bridges = extractBridgeEvents(rawTxs);
  console.log(`   ↳  ${swaps.length} DEX swaps detected`);
  console.log(`   ↳  ${bridges.length} bridge events detected`);

  // 3. Pull balances
  console.log('\n⏳  Fetching wallet balances...');
  const balances = await getWalletBalances(TEST_WALLET, CHAIN);
  const composition = analyseBalanceComposition(balances);
  console.log(`✅  Portfolio value: $${Number(composition.totalPortfolioUsd).toLocaleString()}`);
  console.log(`   ↳  Stablecoin ratio: ${composition.stablecoinPct}%`);

  // 4. Print the last 5 swaps so you can see what GoldRush gives you
  console.log('\n📊  Last 5 DEX Swaps:');
  console.log('─'.repeat(50));
  swaps.slice(0, 5).forEach((s, i) => {
    const date = new Date(s.timestamp).toLocaleDateString();
    const usd = s.usdValueAtTime ? `$${Number(s.usdValueAtTime).toLocaleString()}` : 'n/a';
    console.log(`${i + 1}. [${date}]  ${s.fromToken} → ${s.toToken}  (${usd})  via ${s.dex}`);
  });

  // 5. Print bridge events
  if (bridges.length > 0) {
    console.log('\n🌉  Bridge Events:');
    console.log('─'.repeat(50));
    bridges.slice(0, 5).forEach((b, i) => {
      const date = new Date(b.timestamp).toLocaleDateString();
      const usd = b.usdValueAtTime ? `$${Number(b.usdValueAtTime).toLocaleString()}` : 'n/a';
      console.log(`${i + 1}. [${date}]  ${b.fromChain} → ${b.toChain}  ${b.token}  (${usd})`);
    });
  }

  // 6. Top holdings
  console.log('\n💼  Top Holdings:');
  console.log('─'.repeat(50));
  composition.topHoldings.forEach((h) => {
    const usd = `$${Number(h.usdValue).toLocaleString()}`.padStart(12);
    console.log(`  ${h.symbol.padEnd(10)} ${usd}`);
  });

  console.log('\n✅  Step 1 complete. GoldRush data is flowing.');
  console.log('   Next: feed this into the Genome AI engine.\n');
} catch (err) {
  console.error('\n❌  Error:', err.message);
  if (err.message.includes('401')) {
    console.error('   → Check your GOLDRUSH_API_KEY in .env');
  }
  process.exit(1);
}