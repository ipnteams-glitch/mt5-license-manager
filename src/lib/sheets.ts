import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";
import type { Member, Port, Payment, PackageType, PortfolioAccount, PortSystem } from "@/types";
import { PACKAGES, BUYABLE_PACKAGES, TEST_PACKAGES } from "@/types";
import { getCache, setCache, invalidateCache, invalidateCachePrefix } from "./cache";

const MEMBERS_SHEET = "members";
const PORTS_SHEET = "ports";
const PAYMENTS_SHEET = "payments";
const WHITELIST_SHEET = "whitelist";
const PORTFOLIO_SHEET = "portfolio";

// ── Auth ──
function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!key || !email) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_EMAIL");
  try {
    return new google.auth.GoogleAuth({ credentials: JSON.parse(key), scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ] });
  } catch {
    return new google.auth.GoogleAuth({ keyFile: key, scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ] });
  }
}

async function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

function sheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("Missing GOOGLE_SHEET_ID in env");
  return id;
}

// ── EasySlip API Key (จากอีก Sheet) ──
export async function getEasySlipApiKey(): Promise<string> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: "1r7WhFV8Nl0kgtKiHMQYArjD8zWzXIHDMwWIO6IbTSj8",
    range: "A2",
  });
  return res.data.values?.[0]?.[0] || "";
}

// ── Row Helpers ──

function memberFromRow(row: string[]): Member {
  return {
    email: row[0] || "", name: row[1] || "",
    package: (row[2] as PackageType) || "none",
    max_ports: parseInt(row[3]) || 0, expiry_date: row[4] || "",
    role: (row[5] as "user" | "admin") || "user", created_at: row[6] || "",
    addon_ib_vps_expiry: row[7] || "",
    ib_vps_choice: row[8] || "",
  };
}
function memberToRow(m: Member): string[] {
  return [m.email, m.name, m.package, String(m.max_ports), m.expiry_date, m.role, m.created_at, m.addon_ib_vps_expiry || "", m.ib_vps_choice || ""];
}

function portFromRow(row: string[]): Port {
  return {
    id: row[0] || "", member_email: row[1] || "", mt5_account: row[2] || "",
    mt5_broker: row[3] || "", status: (row[4] as "active" | "removed") || "active", created_at: row[5] || "",
  };
}
function portToRow(p: Port): string[] {
  return [p.id, p.member_email, p.mt5_account, p.mt5_broker, p.status, p.created_at];
}

function paymentFromRow(row: string[]): Payment {
  return {
    id: row[0] || "", email: row[1] || "",
    package: (row[2] as PackageType) || "none",
    amount: parseFloat(row[3]) || 0, satang: parseFloat(row[4]) || 0,
    status: (row[5] as "pending" | "paid" | "failed") || "pending",
    created_at: row[6] || "", paid_at: row[7] || "",
    qr_payload: row[8] || "",
  };
}
function paymentToRow(p: Payment): string[] {
  return [p.id, p.email, p.package, String(p.amount), String(p.satang), p.status, p.created_at, p.paid_at || "", p.qr_payload || ""];
}

// ── Members ──

export async function getAllMembers(): Promise<Member[]> {
  const cached = getCache<Member[]>("members", 120_000);
  if (cached) return cached;
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId(), range: `${MEMBERS_SHEET}!A:I` });
  const rows = res.data.values; if (!rows || rows.length <= 1) return [];
  const members = rows.slice(1).map(memberFromRow);
  setCache("members", members);
  return members;
}

export async function getMemberByEmail(email: string): Promise<Member | null> {
  const members = await getAllMembers();
  return members.find((m) => m.email === email) || null;
}

export async function upsertMember(email: string, name: string): Promise<Member> {
  const members = await getAllMembers();
  const idx = members.findIndex((m) => m.email === email);
  if (idx >= 0) {
    members[idx].name = name || members[idx].name;
    const sheets = await getSheets();
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId(), range: `${MEMBERS_SHEET}!A${idx + 2}:I${idx + 2}`,
      valueInputOption: "RAW", requestBody: { values: [memberToRow(members[idx])] },
    });
    invalidateCache("members");
    return members[idx];
  } else {
    // สมาชิกใหม่ → ให้แพคเกจฟรี (ตาม duration_days ใน PACKAGES)
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + PACKAGES.free.duration_days);
    const member: Member = {
      email, name: name || email.split("@")[0],
      package: "free", max_ports: 1,
      expiry_date: expiry.toISOString(),
      role: "user", created_at: now.toISOString(),
    };
    const sheets = await getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId(), range: `${MEMBERS_SHEET}!A:I`,
      valueInputOption: "RAW", requestBody: { values: [memberToRow(member)] },
    });
    invalidateCache("members");
    return member;
  }
}

export async function updateMemberPackage(
  email: string, pkg: PackageType, maxPorts: number, expiryDate: string
): Promise<void> {
  // Read directly from sheet (no cache) to avoid Vercel serverless instance mismatch
  const sheets = await getSheets();
  const sid = sheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sid,
    range: `${MEMBERS_SHEET}!A:I`,
  });
  const rows = res.data.values || [];
  const idx = rows.slice(1).findIndex((r) => r[0] === email);
  if (idx === -1) throw new Error(`Member not found: ${email}`);
  const sheetRow = idx + 2; // 1-based + header
  const member = memberFromRow(rows[sheetRow - 1]);
  member.package = pkg;
  member.max_ports = maxPorts;
  member.expiry_date = expiryDate;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sid,
    range: `${MEMBERS_SHEET}!A${sheetRow}:I${sheetRow}`,
    valueInputOption: "RAW",
    requestBody: { values: [memberToRow(member)] },
  });
  invalidateCache("members");
}

// ── Upgrade Logic ──
// isExpired: true หากแพคเกจปัจจุบันหมดอายุแล้ว (ใช้ตรวจสอบ free→free)
export function canUpgrade(currentPkg: PackageType, newPkg: PackageType, isExpired?: boolean): { allowed: boolean; reason?: string } {
  if (!BUYABLE_PACKAGES.includes(newPkg) && !TEST_PACKAGES.includes(newPkg)) {
    return { allowed: false, reason: "แพคเกจไม่ถูกต้อง" };
  }

  // none → อะไรก็ได้
  if (currentPkg === "none") {
    return { allowed: true };
  }

  const current = PACKAGES[currentPkg];
  const next = PACKAGES[newPkg];

  // free → free: ได้เฉพาะตอนหมดอายุแล้ว
  if (currentPkg === "free" && newPkg === "free") {
    if (!isExpired) {
      return { allowed: false, reason: "แพคเกจฟรียังไม่หมดอายุ — รอให้หมดอายุก่อนจึงต่อฟรีได้อีกครั้ง" };
    }
    return { allowed: true };
  }

  // free → paid: ได้เสมอ
  if (currentPkg === "free" && next.rank > 1) {
    return { allowed: true };
  }

  // paid → free: ไม่อนุญาต
  if (currentPkg !== "free" && newPkg === "free") {
    return { allowed: false, reason: "ไม่สามารถเปลี่ยนเป็นแพคเกจฟรีได้ — กรุณาเลือกแพคเกจเสียเงิน" };
  }

  // แพคเกจเท่าเดิม → อนุญาต (เพิ่มวัน)

  if (currentPkg === newPkg) {
    return { allowed: true };
  }

  // แพคเกจต่ำกว่า → ไม่อนุญาต
  if (next.rank < current.rank) {
    return { allowed: false, reason: `คุณมีแพคเกจ ${current.name} อยู่แล้ว — กรุณาเลือกแพคเกจที่เท่ากันหรือสูงกว่า` };
  }

  // แพคเกจสูงกว่า → อนุญาต
  return { allowed: true };
}

export function calculateNewExpiry(currentMember: Member, newPkg: PackageType): { expiry: string; maxPorts: number } {
  const pkgInfo = PACKAGES[newPkg];
  const now = new Date();

  // free หรือ none → เริ่มนับวันใหม่ (แทนที่)
  if (currentMember.package === "none" || currentMember.package === "free") {
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + pkgInfo.duration_days);
    return { expiry: expiry.toISOString(), maxPorts: pkgInfo.max_ports };
  }

  // แพคเกจเท่าเดิมหรือสูงกว่า → บวกวันเพิ่ม
  // port count ตามแพคเกจใหม่
  let startDate: Date;
  if (currentMember.expiry_date) {
    const currentExpiry = new Date(currentMember.expiry_date);
    startDate = currentExpiry > now ? currentExpiry : now;
  } else {
    startDate = now;
  }

  const expiry = new Date(startDate);
  expiry.setDate(expiry.getDate() + pkgInfo.duration_days);
  return { expiry: expiry.toISOString(), maxPorts: pkgInfo.max_ports };
}

// ── Ports ──

export async function getPortsByEmail(email: string): Promise<Port[]> {
  const all = await getAllPorts();
  return all.filter((p) => p.member_email === email && p.status === "active");
}

export async function getAllPorts(): Promise<Port[]> {
  const cached = getCache<Port[]>("ports", 3_000);
  if (cached) return cached;
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId(), range: `${PORTS_SHEET}!A:F` });
  const rows = res.data.values; if (!rows || rows.length <= 1) return [];
  const ports = rows.slice(1).map(portFromRow);
  setCache("ports", ports);
  return ports;
}

export async function addPort(email: string, mt5Account: string, mt5Broker: string, maxPorts: number): Promise<Port> {
  const existing = await getPortsByEmail(email);
  if (existing.length >= maxPorts) throw new Error(`โควต้าเต็มแล้ว (${maxPorts} พอร์ต)`);
  if (existing.find((p) => p.mt5_account === mt5Account)) throw new Error(`พอร์ต ${mt5Account} มีในระบบแล้ว`);

  const port: Port = {
    id: uuidv4(), member_email: email, mt5_account: mt5Account,
    mt5_broker: mt5Broker, status: "active", created_at: new Date().toISOString(),
  };
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId(), range: `${PORTS_SHEET}!A:F`,
    valueInputOption: "RAW", requestBody: { values: [portToRow(port)] },
  });
  invalidateCache("ports");
  return port;
}

export async function deletePort(portId: string, email: string): Promise<{ deletedFromPortSystems: boolean; vpsId?: string; mt5Account: string }> {
  // Read directly from sheet (no cache) for immediate update
  const sheets = await getSheets();
  const sid = sheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sid, range: `${PORTS_SHEET}!A:F`,
  });
  const rows = res.data.values || [];
  const idx = rows.slice(1).findIndex((r) => r[0] === portId && r[1] === email);
  if (idx === -1) throw new Error("Port not found");
  const sheetIdx = idx + 2; // 1-based + header
  const all = rows.slice(1).map(portFromRow);
  const mt5Account = all[idx].mt5_account;
  all[idx].status = "removed";
  await sheets.spreadsheets.values.update({
    spreadsheetId: sid, range: `${PORTS_SHEET}!A${sheetIdx}:F${sheetIdx}`,
    valueInputOption: "RAW", requestBody: { values: [portToRow(all[idx])] },
  });
  // Cascade: also remove from port_systems if exists AND email matches
  let deletedFromPortSystems = false;
  let vpsId: string | undefined;
  try {
    const ps = await getPortSystems(mt5Account);
    if (ps && ps.member_email === email) {
      vpsId = ps.vps_id;
      const sheets2 = await getSheets();
      const sid2 = sheetId();
      const res2 = await sheets2.spreadsheets.values.get({
        spreadsheetId: sid2,
        range: `${PORT_SYSTEMS_SHEET}!A:J`,
      });
      const rows2 = res2.data.values || [];
      const idx2 = rows2.findIndex((r, i) => i > 0 && r[0] === mt5Account);
      if (idx2 >= 0) {
        const spreadsheet = await sheets2.spreadsheets.get({ spreadsheetId: sid2 });
        const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === PORT_SYSTEMS_SHEET);
        if (sheet?.properties?.sheetId) {
          await sheets2.spreadsheets.batchUpdate({
            spreadsheetId: sid2,
            requestBody: {
              requests: [{
                deleteDimension: {
                  range: { sheetId: sheet.properties.sheetId, dimension: "ROWS", startIndex: idx2, endIndex: idx2 + 1 },
                },
              }],
            },
          });
          deletedFromPortSystems = true;
        }
      }
    }
  } catch { /* ignore */ }
  invalidateCache("ports");
  invalidateCachePrefix("port_systems");
  return { deletedFromPortSystems, vpsId, mt5Account };
}

export async function findPortByAccount(mt5Account: string): Promise<Port | null> {
  const all = await getAllPorts();
  return all.find((p) => p.mt5_account === mt5Account && p.status === "active") || null;
}

// ── Payments ──

export async function getAllPayments(): Promise<Payment[]> {
  const cached = getCache<Payment[]>("payments", 30_000);
  if (cached) return cached;
  const sheets = await getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId(), range: `${PAYMENTS_SHEET}!A:I` });
    const rows = res.data.values; if (!rows || rows.length <= 1) return [];
    // ดึงเฉพาะ 200 รายการล่าสุด (ข้าม header แถวแรก)
    const dataRows = rows.slice(1);
    const payments = dataRows.slice(-200).map(paymentFromRow);
    setCache("payments", payments);
    return payments;
  } catch {
    // Sheet payments ยังไม่มี → return empty
    return [];
  }
}

export async function createPayment(email: string, pkg: PackageType, price: number, qrPayload?: string): Promise<Payment> {
  // จองสตางค์ — อ่าน pending เลือกค่าที่ไม่ซ้ำ
  const all = await getAllPayments();
  const now = new Date();
  const usedSatangs: number[] = [];
  for (const p of all) {
    if (p.status === "pending" && now.getTime() - new Date(p.created_at).getTime() < 15 * 60 * 1000) {
      usedSatangs.push(p.satang);
    }
  }
  let satang = 0;
  for (let attempt = 0; attempt < 50; attempt++) {
    const val = parseFloat((Math.random() * 0.99).toFixed(2));
    if (val > 0 && !usedSatangs.includes(val)) { satang = val; break; }
  }
  if (satang === 0) throw new Error("ระบบไม่ว่าง กรุณาลองใหม่");

  const totalAmount = price + satang;
  const payment: Payment = {
    id: uuidv4(), email, package: pkg, amount: totalAmount, satang,
    status: "pending", created_at: new Date().toISOString(),
    qr_payload: qrPayload || "",
  };
  const sheets = await getSheets();

  // เขียน payment ลง sheet (อาจต้องลองใหม่ถ้า sheet ยังไม่มี)
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId(), range: `${PAYMENTS_SHEET}!A:I`,
      valueInputOption: "RAW", requestBody: { values: [paymentToRow(payment)] },
    });
  } catch {
    // สร้าง sheet payments ถ้ายังไม่มี
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId(),
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: PAYMENTS_SHEET,
            },
          },
        }],
      },
    });
    // ใส่ header
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId(), range: `${PAYMENTS_SHEET}!A:I`,
      valueInputOption: "RAW",
      requestBody: { values: [["id", "email", "package", "amount", "satang", "status", "created_at", "paid_at", "qr_payload"]] },
    });
    // ลองเขียนอีกครั้ง
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId(), range: `${PAYMENTS_SHEET}!A:I`,
      valueInputOption: "RAW", requestBody: { values: [paymentToRow(payment)] },
    });
  }

  // Race-condition guard: ตรวจซ้ำหลังเขียนว่ามี pending อื่นใช้สตางค์เดียวกันหรือไม่
  const recheck = await getAllPayments();
  const dup = recheck.find(
    (p) => p.id !== payment.id && p.status === "pending" && p.satang === satang
  );
  if (dup) {
    // สตางค์ชน → สุ่มใหม่
    const usedSatangsFinal: number[] = [];
    for (const p of recheck) {
      if (p.status === "pending" && now.getTime() - new Date(p.created_at).getTime() < 15 * 60 * 1000) {
        usedSatangsFinal.push(p.satang);
      }
    }
    let newSatang = 0;
    for (let attempt = 0; attempt < 50; attempt++) {
      const val = parseFloat((Math.random() * 0.99).toFixed(2));
      if (val > 0 && !usedSatangsFinal.includes(val)) { newSatang = val; break; }
    }
    if (newSatang === 0) throw new Error("ระบบไม่ว่าง กรุณาลองใหม่");

    payment.satang = newSatang;
    payment.amount = price + newSatang;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId(),
      range: `${PAYMENTS_SHEET}!A${recheck.length + 1}:I${recheck.length + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [paymentToRow(payment)] },
    });
  }
  invalidateCache("payments");

  return payment;
}

export async function getPaymentById(txnId: string): Promise<Payment | null> {
  const all = await getAllPayments();
  return all.find((p) => p.id === txnId) || null;
}

export async function markPaymentPaid(txnId: string): Promise<Payment> {
  const all = await getAllPayments();
  const idx = all.findIndex((p) => p.id === txnId);
  if (idx === -1) throw new Error("Payment not found");
  all[idx].status = "paid";
  all[idx].paid_at = new Date().toISOString();
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(), range: `${PAYMENTS_SHEET}!A${idx + 2}:I${idx + 2}`,
    valueInputOption: "RAW", requestBody: { values: [paymentToRow(all[idx])] },
  });
  invalidateCache("payments");
  return all[idx];
}

export async function markPaymentFailed(txnId: string): Promise<Payment> {
  const all = await getAllPayments();
  const idx = all.findIndex((p) => p.id === txnId);
  if (idx === -1) throw new Error("Payment not found");
  all[idx].status = "failed";
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(), range: `${PAYMENTS_SHEET}!A${idx + 2}:I${idx + 2}`,
    valueInputOption: "RAW", requestBody: { values: [paymentToRow(all[idx])] },
  });
  invalidateCache("payments");
  return all[idx];
}

// ── Cleanup Old Payments (ลบ paid/failed เกิน 7 วัน, pending เก็บไว้) ──
export async function cleanupExpiredPayments(minutesOld: number = 10080): Promise<number> {
  const all = await getAllPayments();
  const now = new Date();
  const threshold = minutesOld * 60 * 1000;

  const toDelete: number[] = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i].status !== "pending") {
      const created = new Date(all[i].created_at);
      if (now.getTime() - created.getTime() > threshold) {
        toDelete.push(i);
      }
    }
  }

  if (toDelete.length === 0) return 0;

  const sheets = await getSheets();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId() });
  const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === PAYMENTS_SHEET);
  if (!sheet?.properties?.sheetId) return 0;
  const paymentsSheetId = sheet.properties.sheetId;

  const requests = toDelete.reverse().map((idx) => ({
    deleteDimension: {
      range: {
        sheetId: paymentsSheetId,
        dimension: "ROWS",
        startIndex: idx + 1,
        endIndex: idx + 2,
      },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId(),
    requestBody: { requests },
  });

  invalidateCache("payments");
  return toDelete.length;
}

// ── Reserve Satang (กันสตางค์ซ้ำ เหมือน payment.gs) ──
export async function reserveSatang(): Promise<number | null> {
  const all = await getAllPayments();
  const now = new Date();
  const usedSatangs: number[] = [];
  
  for (const p of all) {
    if (p.status === "pending") {
      const created = new Date(p.created_at);
      if (now.getTime() - created.getTime() < 15 * 60 * 1000) {
        usedSatangs.push(p.satang);
      }
    }
  }

  for (let i = 1; i <= 99; i++) {
    const val = parseFloat((i / 100).toFixed(2));
    if (!usedSatangs.includes(val)) return val;
  }
  return null;
}

export async function setAddonIbVpsExpiry(email: string): Promise<string> {
  const members = await getAllMembers();
  const idx = members.findIndex((m) => m.email === email);
  if (idx < 0) throw new Error("Member not found");
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);
  const expiryStr = expiry.toISOString();
  members[idx].addon_ib_vps_expiry = expiryStr;
  const sheets = await getSheets();
  const sid = sheetId();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sid,
    range: `${MEMBERS_SHEET}!H${idx + 2}`,
    valueInputOption: "RAW",
    requestBody: { values: [[expiryStr]] },
  });
  invalidateCache("members");
  return expiryStr;
}

// ── Whitelist (VIP ไม่จำกัดพอร์ต ไม่งดอายุ) ──

export async function getAllWhitelist(): Promise<{ name: string; broker: string; created_at: string }[]> {
  const cached = getCache<{ name: string; broker: string; created_at: string }[]>("whitelist", 120_000);
  if (cached) return cached;
  const sheets = await getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId(), range: `${WHITELIST_SHEET}!A:C` });
    const rows = res.data.values; if (!rows || rows.length <= 1) return [];
    const whitelist = rows.slice(1).slice(-100).map((r) => ({ name: r[0] || "", broker: r[1] || "", created_at: r[2] || "" }));
    setCache("whitelist", whitelist);
    return whitelist;
  } catch {
    return [];
  }
}

export async function addWhitelist(name: string, broker: string): Promise<void> {
  const sheets = await getSheets();
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId(), range: `${WHITELIST_SHEET}!A:C`,
      valueInputOption: "RAW",
      requestBody: { values: [[name, broker, new Date().toISOString()]] },
    });
  } catch {
    // สร้าง sheet whitelist
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId(),
      requestBody: { requests: [{ addSheet: { properties: { title: WHITELIST_SHEET } } }] },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId(), range: `${WHITELIST_SHEET}!A:C`,
      valueInputOption: "RAW",
      requestBody: { values: [["name", "broker", "created_at"]] },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId(), range: `${WHITELIST_SHEET}!A:C`,
      valueInputOption: "RAW",
      requestBody: { values: [[name, broker, new Date().toISOString()]] },
    });
  }
  invalidateCache("whitelist");
}

export async function removeWhitelist(index: number): Promise<void> {
  const all = await getAllWhitelist();
  if (index < 0 || index >= all.length) throw new Error("Invalid index");
  const sheets = await getSheets();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId() });
  const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === WHITELIST_SHEET);
  if (!sheet?.properties?.sheetId) throw new Error("Sheet not found");
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId(),
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId: sheet.properties.sheetId, dimension: "ROWS", startIndex: index + 1, endIndex: index + 2 },
        },
      }],
    },
  });
  invalidateCache("whitelist");
}

export function checkWhitelist(whitelist: { name: string; broker: string }[], name: string, broker: string): boolean {
  const inputWords = name.trim().toLowerCase().split(/\s+/).sort();
  const brokerLower = broker.trim().toLowerCase();
  return whitelist.some((w) => {
    const wlWords = w.name.trim().toLowerCase().split(/\s+/).sort();
    const nameMatch = inputWords.length === wlWords.length && inputWords.every((word, i) => word === wlWords[i]);
    const wlBroker = w.broker.trim().toLowerCase();
    const brokerMatch = brokerLower.includes(wlBroker) || wlBroker.includes(brokerLower);
    return nameMatch && brokerMatch;
  });
}


// ── Batch: อนุมัติ payment + อัปเกรด member ในขั้นตอนเดียว (ลด API calls) ──
export async function approvePaymentAndUpgrade(txnId: string): Promise<{
  memberEmail: string;
  memberName: string;
  packageLabel: string;
  expiryDate: string;
}> {
  // อ่าน payments + members พร้อมกัน
  const [payments, members, sheets] = await Promise.all([
    getAllPayments(),
    getAllMembers(),
    getSheets(),
  ]);

  const sid = sheetId();

  // 1) mark payment paid
  const payIdx = payments.findIndex((p) => p.id === txnId);
  if (payIdx < 0) throw new Error("Payment not found");
  if (payments[payIdx].status !== "pending") throw new Error("Payment already processed");
  payments[payIdx].status = "paid";
  payments[payIdx].paid_at = new Date().toISOString();

  // 2) upgrade member
  const email = payments[payIdx].email;
  const pkg = payments[payIdx].package;
  const memIdx = members.findIndex((m) => m.email === email);
  if (memIdx < 0) throw new Error("Member not found");

  const member = members[memIdx];
  const pkgInfo = PACKAGES[pkg];

  // IB+VPS is an add-on — don't change main package, only set VPS expiry
  if (pkg === "ib_vps_2200") {
    const addonExpiry = new Date();
    addonExpiry.setFullYear(addonExpiry.getFullYear() + 1);
    const expiryStr = addonExpiry.toISOString();
    members[memIdx].addon_ib_vps_expiry = expiryStr;

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sid,
      requestBody: {
        data: [
          {
            range: `${PAYMENTS_SHEET}!A${payIdx + 2}:I${payIdx + 2}`,
            values: [paymentToRow(payments[payIdx])],
          },
          {
            range: `${MEMBERS_SHEET}!H${memIdx + 2}`,
            values: [[expiryStr]],
          },
        ],
        valueInputOption: "RAW",
      },
    });
    invalidateCache("payments");
    invalidateCache("members");

    return {
      memberEmail: email,
      memberName: members[memIdx].name,
      packageLabel: pkgInfo.label,
      expiryDate: expiryStr,
    };
  }

  const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;
  const { allowed, reason } = canUpgrade(member.package, pkg, isExpired);
  if (!allowed) throw new Error(reason || "Cannot upgrade");

  const { expiry, maxPorts } = calculateNewExpiry(member, pkg);
  members[memIdx].package = pkg;
  members[memIdx].max_ports = maxPorts;
  members[memIdx].expiry_date = expiry;

  // เขียนทั้งสองแผ่นใน call เดียว (atomic — ป้องกัน payment ไม่ถูกอัปเดต)
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sid,
    requestBody: {
      data: [
        {
          range: `${PAYMENTS_SHEET}!A${payIdx + 2}:I${payIdx + 2}`,
          values: [paymentToRow(payments[payIdx])],
        },
        {
          range: `${MEMBERS_SHEET}!A${memIdx + 2}:H${memIdx + 2}`,
          values: [memberToRow(members[memIdx])],
        },
      ],
      valueInputOption: "RAW",
    },
  });
  invalidateCache("payments");
  invalidateCache("members");

  return {
    memberEmail: email,
    memberName: members[memIdx].name,
    packageLabel: pkgInfo.label,
    expiryDate: expiry,
  };
}


// ── Portfolio (MyPortfolio) ──

function portfolioFromRow(row: string[]): PortfolioAccount {
  return {
    id: row[0] || "",
    member_email: row[1] || "",
    mt5_account: row[2] || "",
    broker: row[3] || "",
    balance: parseFloat(row[4]) || 0,
    floating_pl: parseFloat(row[5]) || 0,
    total_profit: parseFloat(row[6]) || 0,
    last_updated: row[7] || "",
    created_at: row[8] || "",
  };
}
function portfolioToRow(p: PortfolioAccount): string[] {
  return [p.id, p.member_email, p.mt5_account, p.broker, String(p.balance), String(p.floating_pl), String(p.total_profit), p.last_updated, p.created_at];
}

async function initPortfolioSheet(): Promise<void> {
  const sheets = await getSheets();
  const sid = sheetId();
  try {
    await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: `${PORTFOLIO_SHEET}!A1` });
  } catch {
    // Sheet doesn't exist yet — create with header
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sid });
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sid,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: PORTFOLIO_SHEET },
          },
        }],
      },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: sid,
      range: `${PORTFOLIO_SHEET}!A:I`,
      valueInputOption: "RAW",
      requestBody: {
        values: [["id", "member_email", "mt5_account", "broker", "balance", "floating_pl", "total_profit", "last_updated", "created_at"]],
      },
    });
  }
}

export async function getPortfolioByEmail(email: string): Promise<PortfolioAccount[]> {
  const cacheKey = `portfolio:${email}`;
  const cached = getCache<PortfolioAccount[]>(cacheKey, 60_000);
  if (cached) return cached;
  await initPortfolioSheet();
  const sheets = await getSheets();
  const sid = sheetId();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: `${PORTFOLIO_SHEET}!A:I` });
  const rows = res.data.values;
  if (!rows || rows.length <= 1) return [];
  const accounts = rows.slice(1).map(portfolioFromRow).filter((p) => p.member_email === email);
  setCache(cacheKey, accounts);
  return accounts;
}

export async function addPortfolioAccount(email: string, mt5Account: string, broker: string): Promise<PortfolioAccount> {
  await initPortfolioSheet();
  const existing = await getPortfolioByEmail(email);
  if (existing.some((p) => p.mt5_account === mt5Account)) {
    throw new Error("หมายเลขพอร์ตนี้มีอยู่ในระบบแล้ว");
  }
  const now = new Date().toISOString();
  const account: PortfolioAccount = {
    id: uuidv4(),
    member_email: email,
    mt5_account: mt5Account,
    broker: broker || "",
    balance: 0,
    floating_pl: 0,
    total_profit: 0,
    last_updated: now,
    created_at: now,
  };
  const sheets = await getSheets();
  const sid = sheetId();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sid,
    range: `${PORTFOLIO_SHEET}!A:I`,
    valueInputOption: "RAW",
    requestBody: { values: [portfolioToRow(account)] },
  });
  invalidateCache(`portfolio:${email}`);
  return account;
}

export async function deletePortfolioAccount(id: string, email: string): Promise<void> {
  await initPortfolioSheet();
  const sheets = await getSheets();
  const sid = sheetId();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: `${PORTFOLIO_SHEET}!A:I` });
  const rows = res.data.values;
  if (!rows || rows.length <= 1) throw new Error("ไม่พบพอร์ตนี้");
  const idx = rows.findIndex((r) => r[0] === id && r[1] === email);
  if (idx < 0) throw new Error("ไม่พบพอร์ตนี้");

  // ตรวจสอบ port_system ก่อนลบ — ต้องมีพอร์ตใน port_system และอีเมลตรงกัน
  const mt5Account = rows[idx][2];
  const ps = await getPortSystems(mt5Account);
  if (!ps) throw new Error("ไม่พบพอร์ตนี้ใน port_system — กรุณาลงทะเบียนพอร์ตก่อนลบ");
  // skip ownership check

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sid });
  const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === PORTFOLIO_SHEET);
  if (!sheet?.properties?.sheetId) throw new Error("Sheet not found");
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sid,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId: sheet.properties.sheetId, dimension: "ROWS", startIndex: idx, endIndex: idx + 1 },
        },
      }],
    },
  });
  invalidateCache(`portfolio:${email}`);
}

export async function pushPortfolioData(mt5Account: string, data: { balance: number; floating_pl: number; total_profit: number }): Promise<void> {
  await initPortfolioSheet();
  const sheets = await getSheets();
  const sid = sheetId();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: `${PORTFOLIO_SHEET}!A:I` });
  const rows = res.data.values;
  if (!rows || rows.length <= 1) throw new Error("ไม่พบพอร์ตนี้");
  const idx = rows.findIndex((r) => r[2] === mt5Account);
  if (idx < 0) throw new Error("ไม่พบพอร์ตนี้");

  // Skip update if balance & total_profit unchanged (floating_pl ignored — changes every tick)
  const oldBalance = parseFloat(rows[idx][4]) || 0;
  const oldTotalProfit = parseFloat(rows[idx][6]) || 0;
  if (
    oldBalance === data.balance &&
    oldTotalProfit === data.total_profit
  ) {
    return; // no meaningful change, skip write
  }

  rows[idx][4] = String(data.balance);
  rows[idx][5] = String(data.floating_pl);
  rows[idx][6] = String(data.total_profit);
  rows[idx][7] = new Date().toISOString();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sid,
    range: `${PORTFOLIO_SHEET}!A${idx + 1}:I${idx + 1}`,
    valueInputOption: "RAW",
    requestBody: { values: [rows[idx]] },
  });
  invalidateCachePrefix("portfolio");
}

// ══════════════════════════════════════════════════════════
//  Port Systems (OneComplete — แยก sheet ไม่กระทบของเดิม)
// ══════════════════════════════════════════════════════════

const PORT_SYSTEMS_SHEET = "port_systems";

function portSystemFromRow(row: string[]): PortSystem {
  return {
    id: row[0] || "",
    port_id: row[3] || "",
    member_email: row[2] || "",
    mt5_account: row[1] || "",
    systems: row[4] || "",
    updated_at: row[5] || "",
    created_at: row[6] || "",
  };
}

function portSystemToRow(ps: PortSystem): string[] {
  return [
    ps.id,
    ps.mt5_account,
    ps.member_email,
    ps.port_id,
    ps.systems,
    ps.updated_at,
    ps.created_at,
  ];
}

async function initPortSystemsSheet(): Promise<void> {
  const sheets = await getSheets();
  const sid = sheetId();
  const NEW_HEADER = ["mt5_account", "member_email", "systems", "password", "broker", "vps_id", "status", "heartbeat", "updated_at", "multiplier"];
  try {
    // Check if sheet exists and has correct header
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sid,
      range: `${PORT_SYSTEMS_SHEET}!A1:J1`,
    });
    const header = res.data.values?.[0] || [];
    if (header[0] !== "mt5_account") {
      // Wrong header — clear and rewrite
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sid,
        range: `${PORT_SYSTEMS_SHEET}!A:Z`,
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sid,
        range: `${PORT_SYSTEMS_SHEET}!A1:J1`,
        valueInputOption: "RAW",
        requestBody: { values: [NEW_HEADER] },
      });
    }
  } catch {
    // Sheet doesn't exist — create
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sid });
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sid,
      requestBody: {
        requests: [{
          addSheet: { properties: { title: PORT_SYSTEMS_SHEET } },
        }],
      },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: sid,
      range: `${PORT_SYSTEMS_SHEET}!A:J`,
      valueInputOption: "RAW",
      requestBody: { values: [NEW_HEADER] },
    });
  }
}

export async function getPortSystems(mt5Account: string): Promise<PortSystem | null> {
  // Read all port_systems, cache the full data
  const CACHE_KEY = "port_systems";
  let rows: string[][] | null = getCache<string[][]>(CACHE_KEY, 3_000);
  if (!rows) {
    await initPortSystemsSheet();
    const sheets = await getSheets();
    const sid = sheetId();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sid,
      range: `${PORT_SYSTEMS_SHEET}!A:J`,
    });
    rows = res.data.values || [];
    setCache(CACHE_KEY, rows);
  }
  if (!rows || rows.length <= 1) return null;
  // Simple lookup: column A = mt5_account
  const row = rows.slice(1).find(r => r[0] === mt5Account);
  if (!row) return null;
  return {
    id: "",
    port_id: "",
    member_email: row[1] || "",
    mt5_account: row[0] || "",
    systems: row[2] || "",
    password: row[3] || "",
    broker: row[4] || "",
    vps_id: row[5] || "",
    status: row[6] || "pending",
    heartbeat: row[7] || "",
    updated_at: row[8] || "",
    multiplier: row[9] || "1",
    created_at: "",
  };
}

export async function setPortSystems(
  email: string,
  _portId: string,
  mt5Account: string,
  systems: string,
  password?: string,
  broker?: string,
  multiplier?: string,
): Promise<PortSystem> {
  await initPortSystemsSheet();
  // Read directly from sheet (no cache) for immediate update
  const psSheets = await getSheets();
  const psSid = sheetId();
  const psRes = await psSheets.spreadsheets.values.get({
    spreadsheetId: psSid,
    range: `${PORT_SYSTEMS_SHEET}!A:J`,
  });
  const psRows = psRes.data.values || [];
  const psRow = psRows.slice(1).find(r => r[0] === mt5Account);
  const existing: PortSystem | null = psRow ? {
    id: "", port_id: "",
    member_email: psRow[1] || "",
    mt5_account: psRow[0] || "",
    systems: psRow[2] || "",
    password: psRow[3] || "",
    broker: psRow[4] || "",
    vps_id: psRow[5] || "",
    status: psRow[6] || "pending",
    heartbeat: psRow[7] || "",
    updated_at: psRow[8] || "",
    multiplier: psRow[9] || "1",
    created_at: "",
  } : null;
  if (existing && existing.member_email !== email) {
    throw new Error("หมายเลขพอร์ตนี้ถูกใช้โดยสมาชิกอื่นแล้ว");
  }
  const now = new Date().toISOString();
  const ps: PortSystem = {
    id: "",
    port_id: "",
    member_email: email,
    mt5_account: mt5Account,
    systems,
    password: password || existing?.password || "",
    updated_at: now,
    created_at: existing?.created_at || now,
  };
  const sheets = await getSheets();
  const sid = sheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sid,
    range: `${PORT_SYSTEMS_SHEET}!A:J`,
  });
  const rows = res.data.values || [];
  // Find existing row by mt5_account (column A)
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === mt5Account);
  if (idx >= 0) {
    // Update
    rows[idx][2] = systems;
    if (password) rows[idx][3] = password;
    if (multiplier) rows[idx][9] = multiplier;
    if (broker) rows[idx][4] = broker;
    rows[idx][8] = now;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sid,
      range: `${PORT_SYSTEMS_SHEET}!A${idx + 1}:J${idx + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [rows[idx]] },
    });
  } else {
    // Append
    await sheets.spreadsheets.values.append({
      spreadsheetId: sid,
      range: `${PORT_SYSTEMS_SHEET}!A:J`,
      valueInputOption: "RAW",
      requestBody: { values: [[mt5Account, email, systems, password || "", broker || "", "", "pending", "", now, multiplier || "1"]] },
    });
  }
  invalidateCache("port_systems");
  return ps;
}

// Brokers

const BROKERS_SHEET = "brokers";

async function initBrokersSheet(): Promise<void> {
  const sheets = await getSheets();
  const sid = sheetId();
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: sid,
      range: `${BROKERS_SHEET}!A1`,
    });
  } catch {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sid });
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sid,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: BROKERS_SHEET },
          },
        }],
      },
    });
    const defaults = [
      ["Broker"],
      ["InterstellarFinancial-Demo"],
      ["InterstellarFinancial-Main"],
      ["TPTradesGroup-Demo"],
      ["VTMarkets-Demo"],
      ["VTMarkets-Live"],
      ["Exness-Real"],
      ["ICMarkets-Demo"],
      ["ICMarkets-Live"],
      ["Tickmill-Demo"],
      ["Pepperstone-Demo"],
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: sid,
      range: `${BROKERS_SHEET}!A:A`,
      valueInputOption: "RAW",
      requestBody: { values: defaults },
    });
  }
}

export async function getAllBrokers(): Promise<string[]> {
  const cached = getCache<string[]>("brokers", 600_000);
  if (cached) return cached;
  await initBrokersSheet();
  const sheets = await getSheets();
  const sid = sheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sid,
    range: `${BROKERS_SHEET}!A:A`,
  });
  const rows = res.data.values;
  let brokers: string[];
  if (!rows || rows.length <= 1) {
    // Fallback defaults
    brokers = [
      "InterstellarFinancial-Demo", "InterstellarFinancial-Main",
      "TPTradesGroup-Demo", "VTMarkets-Demo", "VTMarkets-Live",
      "Exness-Real", "ICMarkets-Demo", "ICMarkets-Live",
      "Tickmill-Demo", "Pepperstone-Demo",
    ];
  } else {
    brokers = rows.slice(1).map(r => r[0] || "").filter(Boolean);
  }
  setCache("brokers", brokers);
  return brokers;
}
// ── EA Version (Google Drive) ──
const EA_FOLDER_ID = "1fHBBjwddeBl1C501gFTPiyKdLGkugZlH";

export async function getEaVersion(): Promise<string | null> {
  // ponytail: cache 5 min -- Drive API calls are rate-limited
  const cached = getCache<string>("ea_version", 300_000);
  if (cached !== null) return cached;

  try {
    const drive = google.drive({ version: "v3", auth: getAuth() });
    const res = await drive.files.list({
      q: `'${EA_FOLDER_ID}' in parents and name contains '.ex5'`,
      orderBy: "modifiedTime desc",
      pageSize: 1,
      fields: "files(name)",
    });

    const fileName = res.data.files?.[0]?.name;
    if (!fileName) return null;

    // Extract version: "Harvest_Farm v4.3_Multi.ex5" -> "v4.3_Multi"
    const match = fileName.match(/v[\d.]+(?:_\w+)?/i);
    const version = match ? match[0] : fileName.replace(/\.ex5$/i, "");

    setCache("ea_version", version);
    return version;
  } catch (err) {
    console.error("Failed to fetch EA version:", err);
    return null;
  }
}
