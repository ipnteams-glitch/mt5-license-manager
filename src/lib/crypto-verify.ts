// ── On-chain Crypto Payment Verification ──
// ponytail: 3 free API adapters — TronGrid (no key), BscScan/Etherscan (no key for low volume)

import type { CryptoNetwork } from "@/types";
import { USDT_CONTRACTS } from "@/types";

export interface Transfer {
  txid: string;
  from: string;
  to: string;
  amount: number; // human-readable USDT
  timestamp: number; // unix ms
  confirmations: number;
}

// ── TRC-20 (TronGrid) ──
async function fetchTrc20Transfers(
  wallet: string,
  sinceTimestamp: number,
): Promise<Transfer[]> {
  const contract = USDT_CONTRACTS.trc20;
  const url = `https://api.trongrid.io/v1/accounts/${wallet}/transactions/trc20` +
    `?contract_address=${contract}` +
    `&min_timestamp=${sinceTimestamp}` +
    `&limit=50&order_by=block_timestamp,desc`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error("[TronGrid] fetch failed:", res.status);
    return [];
  }
  const json = await res.json();
  const txs = json.data || [];
  return txs.map((tx: any) => ({
    txid: tx.transaction_id,
    from: tx.from,
    to: tx.to,
    amount: parseInt(tx.value || "0") / 1_000_000, // USDT TRC-20: 6 decimals
    timestamp: tx.block_timestamp,
    confirmations: 1, // TronGrid returns confirmed txs
  }));
}

// ── BEP-20 (BscScan) ──
async function fetchBep20Transfers(
  wallet: string,
  sinceTimestamp: number,
): Promise<Transfer[]> {
  const contract = USDT_CONTRACTS.bep20;
  const apiKey = process.env.BSCSCAN_API_KEY || "";
  const url = `https://api.bscscan.com/api` +
    `?module=account&action=tokentx` +
    `&address=${wallet}` +
    `&contractaddress=${contract}` +
    `&page=1&offset=50&sort=desc` +
    (apiKey ? `&apikey=${apiKey}` : "");

  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== "1") {
    console.error("[BscScan] fetch failed:", json.message);
    return [];
  }
  const txs = json.result || [];
  return txs
    .filter((tx: any) => parseInt(tx.timeStamp || "0") * 1000 >= sinceTimestamp)
    .map((tx: any) => ({
      txid: tx.hash,
      from: tx.from,
      to: tx.to,
      amount: parseInt(tx.value || "0") / 1e18, // USDT BEP-20: 18 decimals
      timestamp: parseInt(tx.timeStamp || "0") * 1000,
      confirmations: parseInt(tx.confirmations || "1"),
    }));
}

// ── ERC-20 (Etherscan) ──
async function fetchErc20Transfers(
  wallet: string,
  sinceTimestamp: number,
): Promise<Transfer[]> {
  const contract = USDT_CONTRACTS.erc20;
  const apiKey = process.env.ETHERSCAN_API_KEY || "";
  const url = `https://api.etherscan.io/api` +
    `?module=account&action=tokentx` +
    `&address=${wallet}` +
    `&contractaddress=${contract}` +
    `&page=1&offset=50&sort=desc` +
    (apiKey ? `&apikey=${apiKey}` : "");

  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== "1") {
    console.error("[Etherscan] fetch failed:", json.message);
    return [];
  }
  const txs = json.result || [];
  return txs
    .filter((tx: any) => parseInt(tx.timeStamp || "0") * 1000 >= sinceTimestamp)
    .map((tx: any) => ({
      txid: tx.hash,
      from: tx.from,
      to: tx.to,
      amount: parseInt(tx.value || "0") / 1_000_000, // USDT ERC-20: 6 decimals
      timestamp: parseInt(tx.timeStamp || "0") * 1000,
      confirmations: parseInt(tx.confirmations || "1"),
    }));
}

// ── Main: Fetch transfers for a given wallet + network ──
export async function fetchRecentTransfers(
  network: CryptoNetwork,
  wallet: string,
  sinceTimestamp: number,
): Promise<Transfer[]> {
  switch (network) {
    case "trc20":
      return fetchTrc20Transfers(wallet, sinceTimestamp);
    case "bep20":
      return fetchBep20Transfers(wallet, sinceTimestamp);
    case "erc20":
      return fetchErc20Transfers(wallet, sinceTimestamp);
    default:
      return [];
  }
}

// ── FIFO Match: Match pending payments against blockchain transfers ──
// ponytail: iterate pending (oldest first), match first transfer that covers amount
export interface MatchResult {
  status: "paid" | "mismatch" | "pending";
  txid?: string;
  actualAmount?: number;
}

export function matchTransfer(
  expectedAmount: number,
  transfers: Transfer[],
): MatchResult {
  // Check for exact match
  for (const tx of transfers) {
    if (Math.abs(tx.amount - expectedAmount) < 0.0001) {
      return { status: "paid", txid: tx.txid, actualAmount: tx.amount };
    }
  }

  // Check for partial payments (sent some but not enough)
  for (const tx of transfers) {
    if (tx.amount > 0) {
      return { status: "mismatch", txid: tx.txid, actualAmount: tx.amount };
    }
  }

  return { status: "pending" };
}

// ── FIFO global matcher across all pending payments ──
// Returns which payment got matched (if any), and the txid
export interface GlobalMatch {
  paymentId: string;
  txid: string;
  actualAmount: number;
  status: "paid" | "mismatch";
}

export function fifoMatchPayments(
  pendingPayments: { id: string; amount_usdt: number; network: CryptoNetwork; created_at: string }[],
  transfers: Transfer[],
): GlobalMatch[] {
  const results: GlobalMatch[] = [];
  // Sort payments oldest first
  const sorted = [...pendingPayments].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  // Clone transfers to avoid side effects
  const remaining = [...transfers];

  for (const payment of sorted) {
    const idx = remaining.findIndex(
      (tx) => Math.abs(tx.amount - payment.amount_usdt) < 0.0001,
    );
    if (idx >= 0) {
      const matched = remaining.splice(idx, 1)[0];
      results.push({
        paymentId: payment.id,
        txid: matched.txid,
        actualAmount: matched.amount,
        status: "paid",
      });
    } else {
      // Check for partial
      const partial = remaining.find((tx) => tx.amount > 0);
      if (partial) {
        remaining.splice(remaining.indexOf(partial), 1);
        results.push({
          paymentId: payment.id,
          txid: partial.txid,
          actualAmount: partial.amount,
          status: "mismatch",
        });
      }
    }
  }
  return results;
}
