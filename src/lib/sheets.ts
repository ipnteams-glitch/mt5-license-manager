import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";
import type { Member, Port, Payment, PackageType } from "@/types";
import { PACKAGES, BUYABLE_PACKAGES, TEST_PACKAGES } from "@/types";

const MEMBERS_SHEET = "members";
const PORTS_SHEET = "ports";
const PAYMENTS_SHEET = "payments";

// ── Auth ──
function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!key || !email) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_EMAIL");
  try {
    return new google.auth.GoogleAuth({ credentials: JSON.parse(key), scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  } catch {
    return new google.auth.GoogleAuth({ keyFile: key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
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
  };
}
function memberToRow(m: Member): string[] {
  return [m.email, m.name, m.package, String(m.max_ports), m.expiry_date, m.role, m.created_at];
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
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId(), range: `${MEMBERS_SHEET}!A:G` });
  const rows = res.data.values; if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map(memberFromRow);
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
      spreadsheetId: sheetId(), range: `${MEMBERS_SHEET}!A${idx + 2}:G${idx + 2}`,
      valueInputOption: "RAW", requestBody: { values: [memberToRow(members[idx])] },
    });
    return members[idx];
  } else {
    // สมาชิกใหม่ → ให้แพคเกจฟรี 7 วัน
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 7);
    const member: Member = {
      email, name: name || email.split("@")[0],
      package: "free", max_ports: 1,
      expiry_date: expiry.toISOString(),
      role: "user", created_at: now.toISOString(),
    };
    const sheets = await getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId(), range: `${MEMBERS_SHEET}!A:G`,
      valueInputOption: "RAW", requestBody: { values: [memberToRow(member)] },
    });
    return member;
  }
}

export async function updateMemberPackage(
  email: string, pkg: PackageType, maxPorts: number, expiryDate: string
): Promise<void> {
  const members = await getAllMembers();
  const idx = members.findIndex((m) => m.email === email);
  if (idx === -1) throw new Error(`Member not found: ${email}`);
  members[idx].package = pkg;
  members[idx].max_ports = maxPorts;
  members[idx].expiry_date = expiryDate;
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(), range: `${MEMBERS_SHEET}!A${idx + 2}:G${idx + 2}`,
    valueInputOption: "RAW", requestBody: { values: [memberToRow(members[idx])] },
  });
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
  // promo_69 → ซื้อได้ครั้งเดียว (ไม่ให้ต่ออายุ)
  if (currentPkg === "promo_69" && newPkg === "promo_69") {
    return { allowed: false, reason: "โปรโมชั่น 69 บาท ซื้อได้ครั้งเดียว — กรุณาเลือกแพคเกจอื่น" };
  }

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
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId(), range: `${PORTS_SHEET}!A:F` });
  const rows = res.data.values; if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map(portFromRow);
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
  return port;
}

export async function deletePort(portId: string, email: string): Promise<void> {
  const all = await getAllPorts();
  const idx = all.findIndex((p) => p.id === portId && p.member_email === email);
  if (idx === -1) throw new Error("Port not found");
  all[idx].status = "removed";
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(), range: `${PORTS_SHEET}!A${idx + 2}:F${idx + 2}`,
    valueInputOption: "RAW", requestBody: { values: [portToRow(all[idx])] },
  });
}

export async function findPortByAccount(mt5Account: string): Promise<Port | null> {
  const all = await getAllPorts();
  return all.find((p) => p.mt5_account === mt5Account && p.status === "active") || null;
}

// ── Payments ──

export async function getAllPayments(): Promise<Payment[]> {
  const sheets = await getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId(), range: `${PAYMENTS_SHEET}!A:I` });
    const rows = res.data.values; if (!rows || rows.length <= 1) return [];
    // ดึงเฉพาะ 200 รายการล่าสุด (ข้าม header แถวแรก)
    const dataRows = rows.slice(1);
    return dataRows.slice(-200).map(paymentFromRow);
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
  for (let i = 1; i <= 99; i++) {
    const val = parseFloat((i / 100).toFixed(2));
    if (!usedSatangs.includes(val)) { satang = val; break; }
  }
  if (satang === 0) throw new Error("ระบบไม่ว่าง กรุณาลองใหม่");

  const totalAmount = price + satang;
  const payment: Payment = {
    id: uuidv4(), email, package: pkg, amount: totalAmount, satang,
    status: "pending", created_at: new Date().toISOString(),
    qr_payload: qrPayload || "",
  };
  const sheets = await getSheets();
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
  return all[idx];
}

// ── Cleanup Expired Payments (ลบ pending ที่ทิ้งไว้เกินเวลา) ──
export async function cleanupExpiredPayments(minutesOld: number = 15): Promise<number> {
  const all = await getAllPayments();
  const now = new Date();
  const threshold = minutesOld * 60 * 1000;

  const toDelete: number[] = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i].status === "pending") {
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

  for (let i = 1; i <= 49; i++) {
    const val = parseFloat((i / 100).toFixed(2));
    if (!usedSatangs.includes(val)) return val;
  }
  return null;
}
