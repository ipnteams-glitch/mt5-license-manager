// ── Crypto Wallets & Topups — Google Sheets CRUD ──
import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";
import type { CryptoWallet, CryptoTopup, CryptoNetwork, PackageType } from "@/types";
import { PACKAGES, PACKAGE_USDT_PRICES } from "@/types";
import { getCache, setCache, invalidateCache, invalidateCachePrefix } from "./cache";
import { canUpgrade, calculateNewExpiry, getAllMembers } from "./sheets";
import { sendPaymentSuccessEmail } from "./mail";
import { notifyVpsOrder } from "./notify";

const WALLETS_SHEET = "crypto_wallets";
const TOPUPS_SHEET = "crypto_topups";

// ── Exchange Rate (USD → THB) ──
let _usdThbRate: number | null = null;
let _usdThbRateFetched = 0;

async function getUsdThbRate(): Promise<number> {
  // ponytail: cache 1 hour — free API, don't hammer it
  if (_usdThbRate !== null && Date.now() - _usdThbRateFetched < 3_600_000) return _usdThbRate;
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const json = await res.json() as { rates: { THB: number } };
    _usdThbRate = json.rates.THB;
    _usdThbRateFetched = Date.now();
    return _usdThbRate;
  } catch {
    // ponytail: fallback to cached or approximate
    return _usdThbRate ?? 34;
  }
}

// ── Auth ──
function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const e = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!key || !e) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_EMAIL");
  try {
    return new google.auth.GoogleAuth({ credentials: JSON.parse(key), scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  } catch {
    return new google.auth.GoogleAuth({ keyFile: key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  }
}

async function getSheets() { return google.sheets({ version: "v4", auth: getAuth() }); }
function sid() { const id = process.env.GOOGLE_SHEET_ID; if (!id) throw new Error("Missing GOOGLE_SHEET_ID"); return id; }

// ── Row Helpers ──
function walletFromRow(r: string[]): CryptoWallet {
  return { email: r[0] || "", usdt_balance: parseFloat(r[1]) || 0, updated_at: r[2] || "" };
}
function walletToRow(w: CryptoWallet): string[] { return [w.email, String(w.usdt_balance), w.updated_at]; }

function topupFromRow(r: string[]): CryptoTopup {
  return {
    id: r[0] || "", email: r[1] || "", network: (r[2] as CryptoNetwork) || "trc20",
    wallet_address: r[3] || "", txid: r[4] || "", amount: parseFloat(r[5]) || 0,
    status: (r[6] as "pending" | "paid" | "failed") || "pending",
    created_at: r[7] || "", paid_at: r[8] || "", expires_at: r[9] || "",
  };
}
function topupToRow(t: CryptoTopup): string[] {
  return [t.id, t.email, t.network, t.wallet_address, t.txid, String(t.amount), t.status, t.created_at, t.paid_at || "", t.expires_at];
}

// ── Init Sheets ──
async function initSheet(title: string, header: string[]): Promise<void> {
  const sheets = await getSheets();
  try {
    await sheets.spreadsheets.values.get({ spreadsheetId: sid(), range: `${title}!A1` });
  } catch {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sid(),
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: sid(), range: `${title}!A:Z`, valueInputOption: "RAW",
      requestBody: { values: [header] },
    });
  }
}

// ── Wallets ──
export async function getWallet(email: string): Promise<CryptoWallet> {
  await initSheet(WALLETS_SHEET, ["email", "usdt_balance", "updated_at"]);
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sid(), range: `${WALLETS_SHEET}!A:C` });
  const rows = res.data.values || [];
  const existing = rows.slice(1).find(r => r[0] === email);
  if (existing) return walletFromRow(existing);
  // Auto-create
  const w: CryptoWallet = { email, usdt_balance: 0, updated_at: new Date().toISOString() };
  await sheets.spreadsheets.values.append({
    spreadsheetId: sid(), range: `${WALLETS_SHEET}!A:C`, valueInputOption: "RAW",
    requestBody: { values: [walletToRow(w)] },
  });
  return w;
}

export async function creditBalance(email: string, amount: number): Promise<number> {
  await initSheet(WALLETS_SHEET, ["email", "usdt_balance", "updated_at"]);
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sid(), range: `${WALLETS_SHEET}!A:C` });
  const rows = res.data.values || [];
  const idx = rows.findIndex(r => r[0] === email);
  const now = new Date().toISOString();
  if (idx >= 1) {
    const bal = parseFloat(rows[idx][1] || "0") + amount;
    rows[idx][1] = String(bal); rows[idx][2] = now;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sid(), range: `${WALLETS_SHEET}!B${idx + 1}:C${idx + 1}`,
      valueInputOption: "RAW", requestBody: { values: [[String(bal), now]] },
    });
    invalidateCachePrefix("wallet_balance");
    return bal;
  }
  // Not found → create
  await sheets.spreadsheets.values.append({
    spreadsheetId: sid(), range: `${WALLETS_SHEET}!A:C`, valueInputOption: "RAW",
    requestBody: { values: [[email, String(amount), now]] },
  });
  invalidateCachePrefix("wallet_balance");
  return amount;
}

export async function deductBalance(email: string, amount: number): Promise<number> {
  const wallet = await getWallet(email);
  if (wallet.usdt_balance < amount) throw new Error(`ยอดเงินไม่พอ: มี ${wallet.usdt_balance} USDT ต้องใช้ ${amount} USDT`);
  const newBal = wallet.usdt_balance - amount;
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sid(), range: `${WALLETS_SHEET}!A:C` });
  const rows = res.data.values || [];
  const idx = rows.findIndex(r => r[0] === email);
  if (idx >= 1) {
    rows[idx][1] = String(newBal); rows[idx][2] = new Date().toISOString();
    await sheets.spreadsheets.values.update({
      spreadsheetId: sid(), range: `${WALLETS_SHEET}!B${idx + 1}:C${idx + 1}`,
      valueInputOption: "RAW", requestBody: { values: [[String(newBal), rows[idx][2]]] },
    });
    invalidateCachePrefix("wallet_balance");
  }
  return newBal;
}

// ── Topups ──
export async function createTopup(email: string, network: CryptoNetwork, walletAddress: string): Promise<CryptoTopup> {
  await initSheet(TOPUPS_SHEET, ["id", "email", "network", "wallet_address", "txid", "amount", "status", "created_at", "paid_at", "expires_at"]);
  const now = new Date();
  const t: CryptoTopup = {
    id: uuidv4(), email, network, wallet_address: walletAddress, txid: "", amount: 0,
    status: "pending", created_at: now.toISOString(), paid_at: "", expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
  };
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sid(), range: `${TOPUPS_SHEET}!A:J`, valueInputOption: "RAW",
    requestBody: { values: [topupToRow(t)] },
  });
  invalidateCache("crypto_topups");
  return t;
}

export async function getTopupById(id: string): Promise<CryptoTopup | null> {
  const all = await getAllTopups();
  return all.find(t => t.id === id) || null;
}

export async function getPendingTopupByEmail(email: string): Promise<CryptoTopup | null> {
  const all = await getAllTopups();
  const now = new Date();
  return all.find(t => t.email === email && t.status === "pending" && new Date(t.expires_at).getTime() > now.getTime()) || null;
}

export async function getPendingTopupsByWallet(network: CryptoNetwork, walletAddress: string): Promise<CryptoTopup[]> {
  const all = await getAllTopups();
  const now = new Date();
  return all.filter(t => t.network === network && t.wallet_address === walletAddress && t.status === "pending" && new Date(t.expires_at).getTime() > now.getTime())
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // FIFO
}

async function getAllTopups(): Promise<CryptoTopup[]> {
  const cached = getCache<CryptoTopup[]>("crypto_topups", 30_000);
  if (cached) return cached;
  await initSheet(TOPUPS_SHEET, ["id", "email", "network", "wallet_address", "txid", "amount", "status", "created_at", "paid_at", "expires_at"]);
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sid(), range: `${TOPUPS_SHEET}!A:J` });
  const rows = res.data.values;
  if (!rows || rows.length <= 1) return [];
  const topups = rows.slice(1).map(topupFromRow);
  setCache("crypto_topups", topups);
  return topups;
}

export async function markTopupPaid(id: string, txid: string, amount: number): Promise<CryptoTopup> {
  const all = await getAllTopups();
  const idx = all.findIndex(t => t.id === id);
  if (idx < 0) throw new Error("Topup not found");
  all[idx].status = "paid"; all[idx].txid = txid; all[idx].amount = amount; all[idx].paid_at = new Date().toISOString();
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sid(), range: `${TOPUPS_SHEET}!A${idx + 2}:J${idx + 2}`,
    valueInputOption: "RAW", requestBody: { values: [topupToRow(all[idx])] },
  });
  invalidateCache("crypto_topups");
  return all[idx];
}

export async function markTopupFailed(id: string): Promise<void> {
  const all = await getAllTopups();
  const idx = all.findIndex(t => t.id === id);
  if (idx < 0) return;
  all[idx].status = "failed";
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sid(), range: `${TOPUPS_SHEET}!A${idx + 2}:J${idx + 2}`,
    valueInputOption: "RAW", requestBody: { values: [topupToRow(all[idx])] },
  });
  invalidateCache("crypto_topups");
}

// ── Purchase (ตัดเงิน + อัปเกรด) ──
export async function purchasePackage(email: string, pkg: PackageType, agent_code?: string): Promise<{
  memberName: string; packageLabel: string; expiryDate: string; newBalance: number;
}> {
  let price = PACKAGE_USDT_PRICES[pkg];

  // ponytail: agent discount
  let agentCommission = 0;
  if (agent_code) {
    const { getAgentByCode } = await import("./sheets");
    const agent = await getAgentByCode(agent_code);
    if (agent) {
      const isVps = pkg === "ib_vps_2200";
      const discountPct = isVps ? agent.discount_vps_percent : agent.discount_percent;
      const commissionPct = isVps ? agent.commission_vps_percent : agent.commission_percent;
      price = Math.round(price * (1 - discountPct / 100) * 100) / 100;
      agentCommission = Math.round(price * (commissionPct / 100) * 100) / 100;
      // ponytail: convert USDT commission to THB for agent bookkeeping
      if (agentCommission > 0) {
        const rate = await getUsdThbRate();
        agentCommission = Math.round(agentCommission * rate * 100) / 100;
        // ponytail: also record in Supabase for agent/admin visibility
        const { supabase } = await import("./supabase-client");
        supabase.from("payments").insert({
          email, package: pkg, amount: price, satang: 0,
          status: "paid", paid_at: new Date().toISOString(),
          agent_code: agent_code || null, agent_commission: agentCommission,
          qr_payload: JSON.stringify({ method: "crypto", usdt: price, rate, thb: agentCommission }),
        }).then(() => console.log("[crypto] payment recorded in Supabase"))
          .catch((e: any) => console.error("[crypto] Supabase payment insert failed:", e));
      }
    }
  }
  if (!price) throw new Error("ราคา USDT ไม่ถูกต้อง");

  const wallet = await getWallet(email);
  if (wallet.usdt_balance < price) throw new Error(`ยอดเงินไม่พอ: มี ${wallet.usdt_balance} USDT ต้องการ ${price} USDT`);

  // Deduct balance
  const newBalance = await deductBalance(email, price);

  // Upgrade member
  const members = await getAllMembers();
  const memIdx = members.findIndex(m => m.email === email);
  if (memIdx < 0) throw new Error("Member not found");

  const member = members[memIdx];
  const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;
  const { allowed, reason } = canUpgrade(member.package, pkg, isExpired);
  if (!allowed) throw new Error(reason || "Cannot upgrade");

  const { expiry, maxPorts } = calculateNewExpiry(member, pkg);
  const pkgInfo = PACKAGES[pkg];

  const sheets = await getSheets();
  const sheetId = sid();

  // IB+VPS addon
  if (pkg === "ib_vps_2200") {
    const addonExpiry = new Date(); addonExpiry.setFullYear(addonExpiry.getFullYear() + 1);
    const expiryStr = addonExpiry.toISOString();
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId, range: `members!H${memIdx + 2}`,
      valueInputOption: "RAW", requestBody: { values: [[expiryStr]] },
    });
    invalidateCache("members");
    sendPaymentSuccessEmail(email, member.name, pkgInfo.label, expiryStr).catch(() => {});
    notifyVpsOrder(email, member.name, pkgInfo.label, expiryStr, "").catch(() => {});
    // ponytail: credit agent commission
    if (agentCommission > 0 && agent_code) {
      const { addAgentCommission } = await import("./sheets");
      addAgentCommission(agent_code, agentCommission).catch(e => console.error("Agent commission failed:", e));
    }
    return { memberName: member.name, packageLabel: pkgInfo.label, expiryDate: expiryStr, newBalance };
  }

  // Normal upgrade
  members[memIdx].package = pkg; members[memIdx].max_ports = maxPorts; members[memIdx].expiry_date = expiry;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId, range: `members!A${memIdx + 2}:I${memIdx + 2}`,
    valueInputOption: "RAW",
    requestBody: { values: [[member.email, member.name, pkg, String(maxPorts), expiry, member.role, member.created_at, member.addon_ib_vps_expiry || "", member.ib_vps_choice || ""]] },
  });
  invalidateCache("members");

  sendPaymentSuccessEmail(email, member.name, pkgInfo.label, expiry).catch(() => {});
  // ponytail: credit agent commission
  if (agentCommission > 0 && agent_code) {
    const { addAgentCommission } = await import("./sheets");
    addAgentCommission(agent_code, agentCommission).catch(e => console.error("Agent commission failed:", e));
  }
  return { memberName: member.name, packageLabel: pkgInfo.label, expiryDate: expiry, newBalance };
}
