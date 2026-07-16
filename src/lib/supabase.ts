// ── Supabase Queries — replaces sheets.ts ──
// Ponytail: SQL > row-by-row JS filtering. One query per function.
import { supabase } from "./supabase-client";
import { v4 as uuidv4 } from "uuid";
import type { Member, Port, Payment, PackageType, PortfolioAccount, PortSystem, Agent, AgentWithdrawal } from "@/types";
import { PACKAGES } from "@/types";

// ═══════════════════════════════════════════════════
// Members
// ═══════════════════════════════════════════════════

export async function getAllMembers(): Promise<Member[]> {
  const { data } = await supabase.from("members").select("*").order("created_at");
  return (data || []) as Member[];
}

export async function getMemberByEmail(email: string): Promise<Member | null> {
  const { data } = await supabase.from("members").select("*").eq("email", email).single();
  return data as Member | null;
}

export async function upsertMember(email: string, name: string): Promise<void> {
  const existing = await getMemberByEmail(email);
  if (existing) return;
  await supabase.from("members").insert({ email, name, role: "user" });
}

export async function updateMemberPackage(email: string, pkg: PackageType, maxPorts: number, expiryDate: string): Promise<void> {
  await supabase.from("members").update({ package: pkg, max_ports: maxPorts, expiry_date: expiryDate || null }).eq("email", email);
}

export async function setAddonIbVpsExpiry(email: string, expiry: string): Promise<void> {
  await supabase.from("members").update({ addon_ib_vps_expiry: expiry }).eq("email", email);
}

export async function setIbVpsChoice(email: string, choice: string): Promise<void> {
  await supabase.from("members").update({ ib_vps_choice: choice }).eq("email", email);
}

export async function canUpgrade(currentPkg: PackageType, newPkg: PackageType, isExpired: boolean): Promise<{ allowed: boolean; reason?: string }> {
  if (currentPkg === "free_ib" || currentPkg === "live_with_us") return { allowed: false, reason: "Already on lifetime plan" };
  if (newPkg === "ib_vps_2200") {
    if (!["live_with_us", "free_ib"].includes(currentPkg) && !isExpired && !["4900_1y"].includes(currentPkg)) {
      return { allowed: false, reason: "VIP only" };
    }
    return { allowed: true };
  }
  const currentRank = PACKAGES[currentPkg]?.rank || 0;
  const newRank = PACKAGES[newPkg]?.rank || 0;
  if (isExpired) return { allowed: true };
  if (newRank <= currentRank) return { allowed: false, reason: "Cannot downgrade" };
  return { allowed: true };
}

export function calculateNewExpiry(member: Member, pkg: PackageType): { expiry: string; maxPorts: number } {
  const pkgInfo = PACKAGES[pkg];
  const now = new Date();
  const isExpired = member.expiry_date ? new Date(member.expiry_date) <= now : false;
  if (isExpired || !member.expiry_date) {
    now.setDate(now.getDate() + pkgInfo.duration_days);
  } else {
    now.setTime(new Date(member.expiry_date).getTime());
    now.setDate(now.getDate() + pkgInfo.duration_days);
  }
  return { expiry: now.toISOString(), maxPorts: pkgInfo.max_ports };
}

// ═══════════════════════════════════════════════════
// Ports
// ═══════════════════════════════════════════════════

export async function getAllPorts(): Promise<Port[]> {
  const { data } = await supabase.from("ports").select("*").order("created_at");
  return (data || []) as Port[];
}

export async function addPort(email: string, account: string, broker: string): Promise<Port> {
  const { data } = await supabase.from("ports").insert({ member_email: email, mt5_account: account, mt5_broker: broker }).select().single();
  return data as Port;
}

export async function deletePort(id: string, email: string): Promise<void> {
  await supabase.from("ports").delete().eq("id", id).eq("member_email", email);
}

export async function removePort(id: string): Promise<void> {
  await supabase.from("ports").update({ status: "removed" }).eq("id", id);
}

export async function findPortByAccount(account: string, broker?: string): Promise<Port | null> {
  const query = supabase.from("ports").select("*").eq("mt5_account", account);
  if (broker) query.eq("mt5_broker", broker);
  const { data } = await query.limit(1);
  return (data?.[0] as Port) || null;
}

// ═══════════════════════════════════════════════════
// Payments
// ═══════════════════════════════════════════════════

export async function getAllPayments(): Promise<Payment[]> {
  const { data } = await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(200);
  return (data || []) as Payment[];
}

export async function createPayment(email: string, pkg: PackageType, amount: number, qrPayload?: string, agentCode?: string, agentCommission?: number): Promise<Payment> {
  const { data } = await supabase.from("payments").insert({
    email, package: pkg, amount, satang: 0,
    qr_payload: qrPayload || null,
    agent_code: agentCode || null,
    agent_commission: agentCommission || null,
  }).select().single();
  return data as Payment;
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const { data } = await supabase.from("payments").select("*").eq("id", id).single();
  return data as Payment | null;
}

export async function markPaymentPaid(id: string): Promise<void> {
  await supabase.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
}

export async function cancelPayment(id: string): Promise<void> {
  await supabase.from("payments").update({ status: "failed" }).eq("id", id);
}

export async function getPaymentsByEmail(email: string): Promise<Payment[]> {
  const { data } = await supabase.from("payments").select("*").eq("email", email).order("created_at", { ascending: false });
  return (data || []) as Payment[];
}

// ═══════════════════════════════════════════════════
// Whitelist
// ═══════════════════════════════════════════════════

export async function getAllWhitelist(): Promise<{ name: string; broker: string; created_at: string }[]> {
  const { data } = await supabase.from("whitelist").select("*").order("created_at");
  return (data || []) as { name: string; broker: string; created_at: string }[];
}

export function checkWhitelist(wl: { name: string; broker: string }[], name: string, broker: string): boolean {
  return wl.some(w => w.name === name && w.broker === broker);
}

export async function addWhitelist(name: string, broker: string): Promise<void> {
  await supabase.from("whitelist").insert({ name, broker });
}

export async function removeWhitelist(idx: number): Promise<void> {
  const all = await getAllWhitelist();
  if (idx >= 0 && idx < all.length) {
    await supabase.from("whitelist").delete().eq("name", all[idx].name).eq("broker", all[idx].broker);
  }
}

// ═══════════════════════════════════════════════════
// Portfolio
// ═══════════════════════════════════════════════════

export async function getPortfolioByEmail(email: string): Promise<PortfolioAccount[]> {
  const { data } = await supabase.from("portfolio").select("*").eq("member_email", email).order("created_at");
  return (data || []) as PortfolioAccount[];
}

export async function addPortfolioAccount(email: string, mt5Account: string, broker: string): Promise<PortfolioAccount> {
  const { data } = await supabase.from("portfolio").insert({ member_email: email, mt5_account: mt5Account, broker }).select().single();
  return data as PortfolioAccount;
}

export async function deletePortfolioAccount(id: string, email: string): Promise<void> {
  await supabase.from("portfolio").delete().eq("id", id).eq("member_email", email);
}

export async function updatePortfolioBalance(id: string, balance: number, floatingPl: number, totalProfit: number): Promise<void> {
  await supabase.from("portfolio").update({ balance, floating_pl: floatingPl, total_profit: totalProfit, last_updated: new Date().toISOString() }).eq("id", id);
}

// ═══════════════════════════════════════════════════
// Brokers
// ═══════════════════════════════════════════════════

export async function getAllBrokers(): Promise<string[]> {
  const { data } = await supabase.from("brokers").select("broker").order("broker");
  return (data || []).map((r: any) => r.broker);
}

// ═══════════════════════════════════════════════════
// Agents
// ═══════════════════════════════════════════════════

export async function getAllAgents(): Promise<Agent[]> {
  const { data } = await supabase.from("agents").select("*").order("created_at");
  return (data || []) as Agent[];
}

export async function getAgentByCode(code: string): Promise<Agent | null> {
  const { data } = await supabase.from("agents").select("*").ilike("agent_code", code.trim()).single();
  return data as Agent | null;
}

export async function getAgentByEmail(email: string): Promise<Agent | null> {
  const { data } = await supabase.from("agents").select("*").eq("email", email).single();
  return data as Agent | null;
}

export async function saveAgent(agent: Agent): Promise<void> {
  await supabase.from("agents").upsert(agent);
}

export async function deleteAgent(code: string): Promise<void> {
  await supabase.from("agents").delete().eq("agent_code", code);
}

export async function addAgentCommission(code: string, amount: number): Promise<void> {
  const agent = await getAgentByCode(code);
  if (!agent) return;
  const newEarned = agent.commission_earned + amount;
  await supabase.from("agents").update({ commission_earned: newEarned }).eq("agent_code", code);
}

export async function markAgentCommissionPaid(code: string): Promise<void> {
  const agent = await getAgentByCode(code);
  if (!agent) throw new Error("Agent not found");
  await supabase.from("agents").update({ commission_paid: agent.commission_earned }).eq("agent_code", code);
}

export async function getPaymentsByAgentCode(code: string): Promise<Payment[]> {
  const { data } = await supabase.from("payments").select("*").ilike("agent_code", code).eq("status", "paid").order("created_at", { ascending: false });
  return (data || []) as Payment[];
}

export async function reconcileAgentCommission(code: string): Promise<void> {
  const { data: payments } = await supabase.from("payments").select("agent_commission").eq("status", "paid").ilike("agent_code", code);
  const earned = (payments || []).reduce((s, p) => s + (p.agent_commission || 0), 0);

  const { data: wds } = await supabase.from("agent_withdrawals").select("amount").eq("agent_code", code).eq("status", "paid");
  const paid = (wds || []).reduce((s, w) => s + (w.amount || 0), 0);

  await supabase.from("agents").update({ commission_earned: earned, commission_paid: paid }).eq("agent_code", code);
}

// ═══════════════════════════════════════════════════
// Agent Withdrawals
// ═══════════════════════════════════════════════════

export async function createWithdrawal(agent: Agent, amount: number): Promise<AgentWithdrawal> {
  const { data: pendingWds } = await supabase.from("agent_withdrawals").select("amount").eq("agent_code", agent.agent_code).eq("status", "pending");
  const pendingSum = (pendingWds || []).reduce((s, w) => s + (w.amount || 0), 0);
  const avail = agent.commission_earned - agent.commission_paid - pendingSum;
  if (amount <= 0 || amount > avail) throw new Error("ยอดถอนไม่ถูกต้อง (คงเหลือ " + avail.toFixed(2) + ")");

  const { data } = await supabase.from("agent_withdrawals").insert({
    id: uuidv4(), agent_code: agent.agent_code, amount, status: "pending",
    bank_name: agent.bank_name, bank_account: agent.bank_account,
  }).select().single();
  return data as AgentWithdrawal;
}

export async function getWithdrawals(agent_code: string): Promise<AgentWithdrawal[]> {
  const { data } = await supabase.from("agent_withdrawals").select("*").eq("agent_code", agent_code).order("created_at", { ascending: false });
  return (data || []) as AgentWithdrawal[];
}

export async function getAllWithdrawals(): Promise<AgentWithdrawal[]> {
  const { data } = await supabase.from("agent_withdrawals").select("*").order("created_at", { ascending: false });
  return (data || []) as AgentWithdrawal[];
}

export async function markWithdrawalPaid(wdId: string): Promise<void> {
  const { data: wd } = await supabase.from("agent_withdrawals").select("*").eq("id", wdId).single();
  if (!wd) throw new Error("Not found");

  await supabase.from("agent_withdrawals").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", wdId);

  const { data: agent } = await supabase.from("agents").select("commission_paid").eq("agent_code", wd.agent_code).single();
  if (agent) {
    await supabase.from("agents").update({ commission_paid: agent.commission_paid + wd.amount }).eq("agent_code", wd.agent_code);
  }
}

// ═══════════════════════════════════════════════════
// Crypto Wallets & Topups
// ═══════════════════════════════════════════════════

export async function getWallet(email: string): Promise<{ email: string; usdt_balance: number; updated_at: string }> {
  const { data } = await supabase.from("crypto_wallets").select("*").eq("email", email).single();
  if (data) return data as any;
  const w = { email, usdt_balance: 0, updated_at: new Date().toISOString() };
  await supabase.from("crypto_wallets").insert(w);
  return w;
}

export async function creditBalance(email: string, amount: number): Promise<number> {
  const w = await getWallet(email);
  const newBal = w.usdt_balance + amount;
  await supabase.from("crypto_wallets").update({ usdt_balance: newBal, updated_at: new Date().toISOString() }).eq("email", email);
  return newBal;
}

export async function deductBalance(email: string, amount: number): Promise<number> {
  const w = await getWallet(email);
  if (w.usdt_balance < amount) throw new Error("ยอดเงินไม่พอ");
  const newBal = w.usdt_balance - amount;
  await supabase.from("crypto_wallets").update({ usdt_balance: newBal, updated_at: new Date().toISOString() }).eq("email", email);
  return newBal;
}

export async function getAllTopups(): Promise<any[]> {
  const { data } = await supabase.from("crypto_topups").select("*").order("created_at", { ascending: false });
  return data || [];
}

export async function createTopup(email: string, network: string, walletAddress: string, amount: number, expiresAt: string): Promise<any> {
  const { data } = await supabase.from("crypto_topups").insert({
    id: uuidv4(), email, network, wallet_address: walletAddress, amount, expires_at: expiresAt,
  }).select().single();
  return data;
}

export async function markTopupPaid(id: string, txid: string): Promise<void> {
  await supabase.from("crypto_topups").update({ status: "paid", txid, paid_at: new Date().toISOString() }).eq("id", id);
}

export async function cancelTopup(id: string): Promise<void> {
  await supabase.from("crypto_topups").update({ status: "failed" }).eq("id", id);
}

export async function purchasePackage(email: string, pkg: PackageType, agent_code?: string): Promise<{ memberName: string; packageLabel: string; expiryDate: string; newBalance: number }> {
  let price = (PACKAGES as any).PACKAGE_USDT_PRICES?.[pkg] || 0;

  let agentCommission = 0;
  if (agent_code) {
    const agent = await getAgentByCode(agent_code);
    if (agent) {
      const isVps = pkg === "ib_vps_2200";
      const discountPct = isVps ? agent.discount_vps_percent : agent.discount_percent;
      const commissionPct = isVps ? agent.commission_vps_percent : agent.commission_percent;
      price = Math.round(price * (1 - discountPct / 100) * 100) / 100;
      agentCommission = Math.round(price * (commissionPct / 100) * 100) / 100;
    }
  }

  const newBalance = await deductBalance(email, price);
  const member = await getMemberByEmail(email);
  if (!member) throw new Error("Member not found");

  const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;
  const { allowed, reason } = await canUpgrade(member.package, pkg, isExpired);
  if (!allowed) throw new Error(reason || "Cannot upgrade");

  const { expiry, maxPorts } = calculateNewExpiry(member, pkg);
  const pkgInfo = PACKAGES[pkg];

  if (pkg === "ib_vps_2200") {
    const addonExpiry = new Date(); addonExpiry.setFullYear(addonExpiry.getFullYear() + 1);
    await setAddonIbVpsExpiry(email, addonExpiry.toISOString());
    if (agentCommission > 0 && agent_code) {
      await addAgentCommission(agent_code, agentCommission);
    }
    return { memberName: member.name, packageLabel: pkgInfo.label, expiryDate: addonExpiry.toISOString(), newBalance };
  }

  await updateMemberPackage(email, pkg, maxPorts, expiry);
  if (agentCommission > 0 && agent_code) {
    await addAgentCommission(agent_code, agentCommission);
  }
  return { memberName: member.name, packageLabel: pkgInfo.label, expiryDate: expiry, newBalance };
}

// ═══════════════════════════════════════════════════
// Port Systems
// ═══════════════════════════════════════════════════

export async function getAllPortSystems(): Promise<PortSystem[]> {
  const { data } = await supabase.from("port_systems").select("*").order("created_at");
  return (data || []) as PortSystem[];
}

export async function savePortSystem(sys: PortSystem): Promise<void> {
  const existing = (await getAllPortSystems()).find(s => s.port_id === sys.port_id);
  if (existing) {
    await supabase.from("port_systems").update(sys).eq("id", existing.id);
  } else {
    await supabase.from("port_systems").insert(sys);
  }
}

export async function getSystemsByPort(portId: string): Promise<PortSystem | null> {
  const { data } = await supabase.from("port_systems").select("*").eq("port_id", portId).single();
  return (data as PortSystem) || null;
}

// ═══════════════════════════════════════════════════
// EA Version (Google Drive — keep for now)
// ═══════════════════════════════════════════════════

export async function getEaVersion(): Promise<string | null> {
  // ponytail: EA version still from Google Drive, unchanged
  const { getEaVersion: sheetsGetEaVersion } = await import("./sheets");
  return sheetsGetEaVersion();
}

// ═══════════════════════════════════════════════════
// EasySlip (Google Sheets — keep for now)
// ═══════════════════════════════════════════════════

export async function getEasySlipApiKey(): Promise<string> {
  const { getEasySlipApiKey: sheetsGetKey } = await import("./sheets");
  return sheetsGetKey();
}

// ═══════════════════════════════════════════════════
// Missing functions (aliases + complex flows)
// ═══════════════════════════════════════════════════

export async function getPortsByEmail(email: string): Promise<Port[]> {
  const { data } = await supabase.from("ports").select("*").eq("member_email", email).order("created_at");
  return (data || []) as Port[];
}

export async function markPaymentFailed(txnId: string): Promise<Payment> {
  const payment = await getPaymentById(txnId);
  if (!payment) throw new Error("Payment not found");
  await supabase.from("payments").update({ status: "failed" }).eq("id", txnId);
  return payment;
}

// ponytail: alias for backward compat
export const getPortSystems = getSystemsByPort;

export async function setPortSystems(
  portId: string, memberEmail: string, mt5Account: string, broker: string,
  systems: string, password?: string, multiplier?: string, vpsId?: string
): Promise<PortSystem> {
  const existing = await getSystemsByPort(mt5Account);
  const sys: PortSystem = {
    id: existing?.id || uuidv4(),
    port_id: portId, member_email: memberEmail, mt5_account: mt5Account,
    broker: broker || "", systems, password: password || "",
    multiplier: multiplier || "1.0", vps_id: vpsId || "",
    status: "active", heartbeat: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_at: existing?.created_at || new Date().toISOString(),
  };
  await savePortSystem(sys);
  return sys;
}

export async function approvePaymentAndUpgrade(txnId: string): Promise<{
  memberEmail: string; memberName: string; packageLabel: string; expiryDate: string;
}> {
  const payment = await getPaymentById(txnId);
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "pending") throw new Error("Payment already processed");

  const member = await getMemberByEmail(payment.email);
  if (!member) throw new Error("Member not found");

  const pkg = payment.package as PackageType;
  const pkgInfo = PACKAGES[pkg];

  // 1) mark paid
  await markPaymentPaid(txnId);

  // 2) upgrade
  if (pkg === "ib_vps_2200") {
    const addonExpiry = new Date(); addonExpiry.setFullYear(addonExpiry.getFullYear() + 1);
    const expiryStr = addonExpiry.toISOString();
    await setAddonIbVpsExpiry(payment.email, expiryStr);
    if (payment.agent_code && payment.agent_commission && payment.agent_commission > 0) {
      await addAgentCommission(payment.agent_code, payment.agent_commission);
    }
    const { sendPaymentSuccessEmail } = await import("./mail");
    const { notifyVpsOrder } = await import("./notify");
    sendPaymentSuccessEmail(payment.email, member.name, pkgInfo.label, expiryStr).catch(() => {});
    notifyVpsOrder(payment.email, member.name, pkgInfo.label, expiryStr, txnId).catch(() => {});
    return { memberEmail: payment.email, memberName: member.name, packageLabel: pkgInfo.label, expiryDate: expiryStr };
  }

  const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;
  const { expiry, maxPorts } = calculateNewExpiry(member, pkg);
  await updateMemberPackage(payment.email, pkg, maxPorts, expiry);

  if (payment.agent_code && payment.agent_commission && payment.agent_commission > 0) {
    await addAgentCommission(payment.agent_code, payment.agent_commission);
  }

  const { sendPaymentSuccessEmail } = await import("./mail");
  sendPaymentSuccessEmail(payment.email, member.name, pkgInfo.label, expiry).catch(() => {});

  return { memberEmail: payment.email, memberName: member.name, packageLabel: pkgInfo.label, expiryDate: expiry };
}