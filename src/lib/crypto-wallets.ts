// ── Crypto Wallets & Topups — Supabase CRUD ──
import { v4 as uuidv4 } from "uuid";
import type { CryptoWallet, CryptoTopup, CryptoNetwork, PackageType } from "@/types";
import { PACKAGES, PACKAGE_USDT_PRICES } from "@/types";
import { supabase } from "./supabase-client";
import {
  canUpgrade, calculateNewExpiry, getMemberByEmail, updateMemberPackage,
  setAddonIbVpsExpiry, getAgentByCode, addAgentCommission, distributeCommission,
} from "./supabase";
import { sendPaymentSuccessEmail } from "./mail";
import { notifyVpsOrder } from "./notify";

// ── Exchange Rate (USD → THB) ──
let _usdThbRate: number | null = null;
let _usdThbRateFetched = 0;

async function getUsdThbRate(): Promise<number> {
  // ponytail: cache 1 hour — free API, don't hammer it
  if (_usdThbRate !== null && Date.now() - _usdThbRateFetched < 3_600_000) return _usdThbRate;
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const json = await res.json() as { rates: { THB: number } };
    _usdThbRate = json.rates.THB - 1; // ponytail: หัก 1 บาท เผื่อส่วนต่าง USDT→บาท
    _usdThbRateFetched = Date.now();
    return _usdThbRate;
  } catch {
    // ponytail: fallback to cached or approximate
    return _usdThbRate ?? 34;
  }
}

// ── Row Mappers (DB → app types; แปลง null → "" ให้ตรง type เดิม) ──
/* eslint-disable @typescript-eslint/no-explicit-any */
function mapWallet(r: any): CryptoWallet {
  return { email: r.email, usdt_balance: Number(r.usdt_balance) || 0, updated_at: r.updated_at || "" };
}

function mapTopup(r: any): CryptoTopup {
  return {
    id: r.id, email: r.email, network: (r.network as CryptoNetwork) || "trc20",
    wallet_address: r.wallet_address || "", txid: r.txid || "", amount: Number(r.amount) || 0,
    status: (r.status as "pending" | "paid" | "failed") || "pending",
    created_at: r.created_at || "", paid_at: r.paid_at || "", expires_at: r.expires_at || "",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Wallets ──
export async function getWallet(email: string): Promise<CryptoWallet> {
  const { data } = await supabase.from("crypto_wallets").select("*").eq("email", email).maybeSingle();
  if (data) return mapWallet(data);
  // Auto-create
  const w: CryptoWallet = { email, usdt_balance: 0, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("crypto_wallets").insert(w);
  if (error && error.code !== "23505") throw new Error(`สร้างกระเป๋าไม่สำเร็จ: ${error.message}`); // 23505 = มีอยู่แล้ว (race)
  return w;
}

export async function creditBalance(email: string, amount: number): Promise<number> {
  const wallet = await getWallet(email);
  const bal = wallet.usdt_balance + amount;
  const { error } = await supabase.from("crypto_wallets")
    .update({ usdt_balance: bal, updated_at: new Date().toISOString() }).eq("email", email);
  if (error) throw new Error(`เติมเงินไม่สำเร็จ: ${error.message}`);
  return bal;
}

export async function deductBalance(email: string, amount: number): Promise<number> {
  const wallet = await getWallet(email);
  if (wallet.usdt_balance < amount) throw new Error(`ยอดเงินไม่พอ: มี ${wallet.usdt_balance} USDT ต้องใช้ ${amount} USDT`);
  const newBal = wallet.usdt_balance - amount;
  const { error } = await supabase.from("crypto_wallets")
    .update({ usdt_balance: newBal, updated_at: new Date().toISOString() }).eq("email", email);
  if (error) throw new Error(`ตัดเงินไม่สำเร็จ: ${error.message}`);
  return newBal;
}

// ── Topups ──
export async function createTopup(email: string, network: CryptoNetwork, walletAddress: string): Promise<CryptoTopup> {
  const now = new Date();
  const t: CryptoTopup = {
    id: uuidv4(), email, network, wallet_address: walletAddress, txid: "", amount: 0,
    status: "pending", created_at: now.toISOString(), paid_at: "",
    expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
  };
  const { error } = await supabase.from("crypto_topups").insert({
    id: t.id, email: t.email, network: t.network, wallet_address: t.wallet_address,
    txid: t.txid, amount: t.amount, status: t.status,
    created_at: t.created_at, expires_at: t.expires_at, // ponytail: ไม่ส่ง paid_at — timestamptz รับ "" ไม่ได้
  });
  if (error) throw new Error(`สร้างรายการเติมเงินไม่สำเร็จ: ${error.message}`);
  return t;
}

export async function getTopupById(id: string): Promise<CryptoTopup | null> {
  const { data } = await supabase.from("crypto_topups").select("*").eq("id", id).maybeSingle();
  return data ? mapTopup(data) : null;
}

export async function getPendingTopupByEmail(email: string): Promise<CryptoTopup | null> {
  const { data } = await supabase.from("crypto_topups").select("*")
    .eq("email", email).eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  return data ? mapTopup(data) : null;
}

export async function getPendingTopupsByWallet(network: CryptoNetwork, walletAddress: string): Promise<CryptoTopup[]> {
  const { data } = await supabase.from("crypto_topups").select("*")
    .eq("network", network).eq("wallet_address", walletAddress).eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true }); // FIFO
  return (data || []).map(mapTopup);
}

export async function markTopupPaid(id: string, txid: string, amount: number): Promise<CryptoTopup> {
  // ponytail: .neq("status","paid") กัน double-credit จาก poll ซ้อนกัน
  const { data, error } = await supabase.from("crypto_topups")
    .update({ status: "paid", txid, amount, paid_at: new Date().toISOString() })
    .eq("id", id).neq("status", "paid").select().maybeSingle();
  if (error) throw new Error(`บันทึกการเติมเงินไม่สำเร็จ: ${error.message}`);
  if (!data) {
    const existing = await getTopupById(id);
    if (!existing) throw new Error("Topup not found");
    throw new Error("Topup already paid"); // มีคน mark ไปแล้ว — ห้าม credit ซ้ำ
  }
  return mapTopup(data);
}

export async function markTopupFailed(id: string): Promise<void> {
  // ponytail: ห้ามล้มรายการที่ paid ไปแล้ว
  await supabase.from("crypto_topups").update({ status: "failed" }).eq("id", id).neq("status", "paid");
}

// ── Purchase (ตัดเงิน + อัปเกรด) ──
export async function purchasePackage(email: string, pkg: PackageType, agent_code?: string): Promise<{
  memberName: string; packageLabel: string; expiryDate: string; newBalance: number;
}> {
  let price = PACKAGE_USDT_PRICES[pkg];

  // ponytail: agent discount
  let agentCommission = 0;
  let rate = 34; // ponytail: default THB rate, fetched once for MLM
  if (agent_code) {
    const agent = await getAgentByCode(agent_code);
    if (agent) {
      const isVps = pkg === "ib_vps_2200";
      const discountPct = isVps ? agent.discount_vps_percent : agent.discount_percent;
      const commissionPct = isVps ? agent.commission_vps_percent : agent.commission_percent;
      price = Math.round(price * (1 - discountPct / 100) * 100) / 100;
      agentCommission = Math.round(price * (commissionPct / 100) * 100) / 100;
      // ponytail: convert USDT commission to THB for agent bookkeeping
      if (agentCommission > 0) {
        rate = await getUsdThbRate();
        agentCommission = Math.round(agentCommission * rate * 100) / 100;
        // ponytail: record payment row for agent/admin visibility
        supabase.from("payments").insert({
          email, package: pkg, amount: price, satang: 0,
          status: "paid", paid_at: new Date().toISOString(),
          agent_code: agent_code || null, agent_commission: agentCommission,
          qr_payload: JSON.stringify({ method: "crypto", usdt: price, rate, thb: agentCommission }),
        }).then(
          () => console.log("[crypto] payment recorded in Supabase"),
          (e: unknown) => console.error("[crypto] Supabase payment insert failed:", e)
        );
      }
    }
  }
  if (!price) throw new Error("ราคา USDT ไม่ถูกต้อง");

  const wallet = await getWallet(email);
  if (wallet.usdt_balance < price) throw new Error(`ยอดเงินไม่พอ: มี ${wallet.usdt_balance} USDT ต้องการ ${price} USDT`);

  // Deduct balance
  const newBalance = await deductBalance(email, price);

  // Upgrade member
  const member = await getMemberByEmail(email);
  if (!member) throw new Error("Member not found");

  const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;
  const { allowed, reason } = canUpgrade(member.package, pkg, isExpired);
  if (!allowed) throw new Error(reason || "Cannot upgrade");

  const { expiry, maxPorts } = calculateNewExpiry(member, pkg);
  const pkgInfo = PACKAGES[pkg];

  // IB+VPS addon
  if (pkg === "ib_vps_2200") {
    const addonExpiry = new Date(); addonExpiry.setFullYear(addonExpiry.getFullYear() + 1);
    const expiryStr = addonExpiry.toISOString();
    await setAddonIbVpsExpiry(email, expiryStr);
    sendPaymentSuccessEmail(email, member.name, pkgInfo.label, expiryStr).catch(() => {});
    notifyVpsOrder(email, member.name, pkgInfo.label, expiryStr, "").catch(() => {});
    // ponytail: credit agent commission
    if (agentCommission > 0 && agent_code) {
      addAgentCommission(agent_code, agentCommission).catch((e: unknown) => console.error("Agent commission failed:", e));
      // ponytail: MLM upline commission (convert USDT → THB)
      const saleTHB = Math.round(price * rate * 100) / 100;
      distributeCommission(saleTHB, agent_code, true, member.package === "none").catch(e => console.error("[MLM] crypto distribute failed:", e));
    }
    return { memberName: member.name, packageLabel: pkgInfo.label, expiryDate: expiryStr, newBalance };
  }

  // Normal upgrade
  await updateMemberPackage(email, pkg, maxPorts, expiry);

  sendPaymentSuccessEmail(email, member.name, pkgInfo.label, expiry).catch(() => {});
  // ponytail: credit agent commission
  if (agentCommission > 0 && agent_code) {
    addAgentCommission(agent_code, agentCommission).catch((e: unknown) => console.error("Agent commission failed:", e));
    // ponytail: MLM upline commission (convert USDT → THB)
    const saleTHB = Math.round(price * rate * 100) / 100;
    distributeCommission(saleTHB, agent_code, pkg === "ib_vps_2200", member.package === "none").catch(e => console.error("[MLM] crypto distribute failed:", e));
  }
  return { memberName: member.name, packageLabel: pkgInfo.label, expiryDate: expiry, newBalance };
}
