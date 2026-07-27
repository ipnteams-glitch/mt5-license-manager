// ponytail: one regex + two special cases instead of a full broker registry.
// Upgrade path: if new brokers break the regex, add explicit rules here.

/**
 * Normalize a full MT5 broker server name to its base broker name.
 * "Exness-MT5Trial7" → "Exness-MT5"
 * "VTMarkets-Live 3" → "VTMarkets"
 * "ICMarketsSC-MT5-2" → "ICMarketsSC"
 */
export function normalizeBroker(broker: string): string {
  // KVB: two formats in our list — "KVBPrimeLimited-Real" and "KVB PRIME LIMITED DEMO"
  if (/^KVB\s*PRIME\s*LIMITED/i.test(broker)) return "KVBPrimeLimited";

  // Exness: Exness-MT5Trial / Exness-MT5Trial0-19 / Exness-MT5Real / Exness-MT5Real0-46
  if (/^Exness-MT5/i.test(broker)) return "Exness-MT5";

  // Strip common variant suffixes: -Demo, -Live, -Live 3, -Live2, -Server, -Online, -Real, -Pro, -ECN, -MT5-2
  return broker
    .replace(/\s*-(Demo|Live[\s-]?\d*|Server|Online|Real|Pro|ECN|MT5-\d+)\s*$/i, "")
    .trim();
}

/**
 * Derive unique base broker names from the full server list.
 * 96 servers → 17 base names.
 */
export function deriveBaseBrokers(servers: string[]): string[] {
  return [...new Set(servers.map(normalizeBroker))].sort();
}
