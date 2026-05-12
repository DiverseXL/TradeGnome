// services/goldrush.js
// GoldRush's superpower: classified, decoded transaction data.
// No manual ABI decoding. No hex nonsense. Just clean structured events.

const BASE_URL = 'https://api.covalenthq.com/v1';


async function goldrushFetch(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GOLDRUSH_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GoldRush ${response.status}: ${body}`);
  }

  const json = await response.json();

  if (json.error) {
    throw new Error(`GoldRush error: ${json.error_message}`);
  }

  return json.data;
}

// ─── Transactions ───────────────────────────────────────────────────────────

/**
 * Pull ALL classified transactions for a wallet.
 * GoldRush auto-labels each tx: DEX_SWAP, BRIDGE, TRANSFER, NFT_SALE, etc.
 * This is the raw ingredient everything else is built from.
 */
async function getClassifiedTransactions(walletAddress, chainName = 'eth-mainnet') {
  try {
    const data = await goldrushFetch(
      `/${chainName}/address/${walletAddress}/transactions_v3/?no-spam=true`
    );
    return data.items ?? [];
  } catch (err) {
    if (err.message.includes('not supported') || err.message.includes('tier')) {
      console.warn(`⚠️  GoldRush TX Error: Chain not supported for transaction history on this API tier. Try an EVM chain (ETH/Polygon/BSC).`);
      return [];
    }
    throw err;
  }
}

// ─── Balances ────────────────────────────────────────────────────────────────

/**
 * Get current token balances with live USD prices.
 * Used to determine: stablecoin ratio, portfolio composition, total value.
 */
async function getWalletBalances(walletAddress, chainName = 'solana-mainnet') {
  const data = await goldrushFetch(
    `/${chainName}/address/${walletAddress}/balances_v2/?no-spam=true`
  );
  return data.items ?? [];
}

// ─── Classifiers ─────────────────────────────────────────────────────────────

/**
 * Extract DEX swaps from classified transactions.
 * GoldRush already decoded Orca/Raydium/Meteora router calls for us.
 */
function extractSwaps(transactions) {
  return transactions
    .filter((tx) => {
      const name = tx.decoded?.name ?? '';
      return (
        name === 'DEX_SWAP' ||
        tx.dex_details != null ||
        tx.log_events?.some((e) => e.decoded?.name?.toLowerCase().includes('swap'))
      );
    })
    .map((tx) => ({
      hash: tx.tx_hash,
      timestamp: tx.block_signed_at,
      blockHeight: tx.block_height,
      fromToken: tx.from_token_symbol ?? tx.dex_details?.from_token_symbol,
      toToken: tx.to_token_symbol ?? tx.dex_details?.to_token_symbol,
      fromAmount: tx.from_token_amount ?? tx.dex_details?.from_amount,
      toAmount: tx.to_token_amount ?? tx.dex_details?.to_amount,
      usdValueAtTime: tx.value_quote,
      dex: tx.dex_details?.dex_name ?? 'unknown',
      successful: tx.successful,
    }))
    .filter((s) => s.fromToken && s.toToken);
}

/**
 * Extract cross-chain bridge events.
 * These are the KEY signal for TGE-hunting strategies.
 */
function extractBridgeEvents(transactions) {
  return transactions
    .filter((tx) => {
      const name = tx.decoded?.name ?? '';
      return name === 'BRIDGE' || tx.bridge_details != null;
    })
    .map((tx) => ({
      hash: tx.tx_hash,
      timestamp: tx.block_signed_at,
      fromChain: tx.bridge_details?.from_chain ?? 'unknown',
      toChain: tx.bridge_details?.to_chain ?? 'unknown',
      token: tx.bridge_details?.token_symbol ?? tx.token_symbol,
      amount: tx.bridge_details?.amount,
      usdValueAtTime: tx.value_quote,
    }));
}

/**
 * Analyse wallet balance composition.
 * Is this wallet mostly stablecoins (surgical sniper) or 100% volatile (degen)?
 */
function analyseBalanceComposition(balances) {
  const STABLECOINS = new Set(['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'USDS']);

  let totalUsd = 0;
  let stableUsd = 0;
  const topHoldings = [];

  for (const item of balances) {
    const usd = item.quote ?? 0;
    totalUsd += usd;
    if (STABLECOINS.has(item.contract_ticker_symbol)) stableUsd += usd;
    topHoldings.push({
      symbol: item.contract_ticker_symbol,
      usdValue: usd,
      balance: item.balance,
    });
  }

  topHoldings.sort((a, b) => b.usdValue - a.usdValue);

  return {
    totalPortfolioUsd: totalUsd,
    stablecoinPct: totalUsd > 0 ? ((stableUsd / totalUsd) * 100).toFixed(1) : '0',
    topHoldings: topHoldings.slice(0, 10),
  };
}

module.exports = {
  getClassifiedTransactions,
  getWalletBalances,
  extractSwaps,
  extractBridgeEvents,
  analyseBalanceComposition,
};