// ── Crypto Payments — Google Sheets wrapper (separate from sheets.ts) ──
// ponytail: duplicate getAuth/getSheets/sheetId to avoid refactoring sheets.ts
import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";
import type { CryptoPayment, CryptoNetwork, PackageType } from "@/types";
import { PACKAGES } from "@/types";
import { getCache, setCache, invalidateCache } from "./cache";
import {
  canUpgrade,
  calculateNewExpiry,
  getAllMembers,
} from "./sheets";
import { sendPaymentSuccessEmail } from "./mail";
import { notifyVpsOrder } from "./notify";

const CRYPTO_PAYMENTS_SHEET = "crypto_payments";

// ── Auth (duplicated from sheets.ts — stable, minimal) ──
function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!key || !email) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_EMAIL");
  try {
    return new google.auth.GoogleAuth({
      credentials: JSON.parse(key),
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });
  } catch {
    return new google.auth.GoogleAuth({
      keyFile: key,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });
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

// ── Row Helpers ──
function cryptoPaymentFromRow(row: string[]): CryptoPayment {
  return {
    id: row[0] || "",
    email: row[1] || "",
    package: (row[2] as PackageType) || "none",
    amount_thb: parseFloat(row[3]) || 0,
    amount_usdt: parseFloat(row[4]) || 0,
    network: (row[5] as CryptoNetwork) || "trc20",
    wallet_address: row[6] || "",
    txid: row[7] || "",
    status: (row[8] as "pending" | "paid" | "failed") || "pending",
    created_at: row[9] || "",
    paid_at: row[10] || "",
    rate_thb_usd: parseFloat(row[11]) || 0,
  };
}

function cryptoPaymentToRow(p: CryptoPayment): string[] {
  return [
    p.id,
    p.email,
    p.package,
    String(p.amount_thb),
    String(p.amount_usdt),
    p.network,
    p.wallet_address,
    p.txid,
    p.status,
    p.created_at,
    p.paid_at || "",
    String(p.rate_thb_usd),
  ];
}

// ── Init Sheet (auto-create if missing) ──
async function initCryptoPaymentsSheet(): Promise<void> {
  const sheets = await getSheets();
  const sid = sheetId();
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: sid,
      range: `${CRYPTO_PAYMENTS_SHEET}!A1`,
    });
  } catch {
    // Sheet doesn't exist → create it
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sid });
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sid,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: CRYPTO_PAYMENTS_SHEET },
            },
          },
        ],
      },
    });
    // Write header
    await sheets.spreadsheets.values.append({
      spreadsheetId: sid,
      range: `${CRYPTO_PAYMENTS_SHEET}!A:L`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          "id", "email", "package", "amount_thb", "amount_usdt",
          "network", "wallet_address", "txid", "status",
          "created_at", "paid_at", "rate_thb_usd",
        ]],
      },
    });
  }
}

// ── Get All Crypto Payments ──
export async function getAllCryptoPayments(): Promise<CryptoPayment[]> {
  const cached = getCache<CryptoPayment[]>("crypto_payments", 30_000);
  if (cached) return cached;

  await initCryptoPaymentsSheet();
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${CRYPTO_PAYMENTS_SHEET}!A:L`,
  });
  const rows = res.data.values;
  if (!rows || rows.length <= 1) return [];
  const payments = rows.slice(1).map(cryptoPaymentFromRow);
  setCache("crypto_payments", payments);
  return payments;
}

// ── Get Pending Crypto Payments (for polling) ──
export async function getPendingCryptoPayments(): Promise<CryptoPayment[]> {
  const all = await getAllCryptoPayments();
  return all.filter((p) => p.status === "pending");
}

// ── Get Crypto Payment by ID ──
export async function getCryptoPaymentById(id: string): Promise<CryptoPayment | null> {
  const all = await getAllCryptoPayments();
  return all.find((p) => p.id === id) || null;
}

// ── Get Pending Crypto Payment by Email ──
export async function getPendingCryptoPaymentByEmail(email: string): Promise<CryptoPayment | null> {
  const all = await getAllCryptoPayments();
  const now = new Date();
  return all.find(
    (p) =>
      p.email === email &&
      p.status === "pending" &&
      new Date(p.created_at).getTime() + 30 * 60 * 1000 > now.getTime(),
  ) || null;
}

// ── Create Crypto Payment ──
export async function createCryptoPayment(
  email: string,
  pkg: PackageType,
  amountThb: number,
  amountUsdt: number,
  network: CryptoNetwork,
  walletAddress: string,
  rateThbUsd: number,
): Promise<CryptoPayment> {
  const payment: CryptoPayment = {
    id: uuidv4(),
    email,
    package: pkg,
    amount_thb: amountThb,
    amount_usdt: amountUsdt,
    network,
    wallet_address: walletAddress,
    txid: "",
    status: "pending",
    created_at: new Date().toISOString(),
    paid_at: "",
    rate_thb_usd: rateThbUsd,
  };

  await initCryptoPaymentsSheet();
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId(),
    range: `${CRYPTO_PAYMENTS_SHEET}!A:L`,
    valueInputOption: "RAW",
    requestBody: { values: [cryptoPaymentToRow(payment)] },
  });
  invalidateCache("crypto_payments");
  return payment;
}

// ── Mark Crypto Payment as Paid ──
export async function markCryptoPaymentPaid(id: string, txid: string): Promise<CryptoPayment> {
  const all = await getAllCryptoPayments();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Crypto payment not found");
  if (all[idx].status !== "pending") throw new Error("Payment already processed");

  all[idx].status = "paid";
  all[idx].txid = txid;
  all[idx].paid_at = new Date().toISOString();

  const sheets = await getSheets();
  const sid = sheetId();
  // Row in sheet = idx + 2 (header + 0-based)
  await sheets.spreadsheets.values.update({
    spreadsheetId: sid,
    range: `${CRYPTO_PAYMENTS_SHEET}!A${idx + 2}:L${idx + 2}`,
    valueInputOption: "RAW",
    requestBody: { values: [cryptoPaymentToRow(all[idx])] },
  });
  invalidateCache("crypto_payments");
  return all[idx];
}

// ── Mark Crypto Payment as Failed ──
export async function markCryptoPaymentFailed(id: string): Promise<void> {
  const all = await getAllCryptoPayments();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return;

  all[idx].status = "failed";

  const sheets = await getSheets();
  const sid = sheetId();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sid,
    range: `${CRYPTO_PAYMENTS_SHEET}!A${idx + 2}:L${idx + 2}`,
    valueInputOption: "RAW",
    requestBody: { values: [cryptoPaymentToRow(all[idx])] },
  });
  invalidateCache("crypto_payments");
}

// ── Upgrade Member (crypto version — same logic as approvePaymentAndUpgrade but from crypto_payments sheet) ──
export async function approveCryptoPaymentAndUpgrade(cryptoPaymentId: string): Promise<{
  memberEmail: string;
  memberName: string;
  packageLabel: string;
  expiryDate: string;
}> {
  const [payment, members, sheets] = await Promise.all([
    getCryptoPaymentById(cryptoPaymentId),
    getAllMembers(),
    getSheets(),
  ]);

  if (!payment) throw new Error("Crypto payment not found");
  if (payment.status !== "pending") throw new Error("Payment already processed");

  const email = payment.email;
  const pkg = payment.package;
  const pkgInfo = PACKAGES[pkg];

  const memIdx = members.findIndex((m) => m.email === email);
  if (memIdx < 0) throw new Error("Member not found");

  const member = members[memIdx];
  const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;

  // 1) Mark crypto payment as paid
  await markCryptoPaymentPaid(cryptoPaymentId, payment.txid || "");

  // 2) Upgrade member
  const sid = sheetId();

  // IB+VPS is an add-on
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
            range: `members!H${memIdx + 2}`,
            values: [[expiryStr]],
          },
        ],
        valueInputOption: "RAW",
      },
    });
    invalidateCache("members");

    return {
      memberEmail: email,
      memberName: members[memIdx].name,
      packageLabel: pkgInfo.label,
      expiryDate: expiryStr,
    };
  }

  // Normal package upgrade
  const { allowed, reason } = canUpgrade(member.package, pkg, isExpired);
  if (!allowed) throw new Error(reason || "Cannot upgrade");

  const { expiry, maxPorts } = calculateNewExpiry(member, pkg);
  members[memIdx].package = pkg;
  members[memIdx].max_ports = maxPorts;
  members[memIdx].expiry_date = expiry;

  // Write back to members sheet
  // Row = memIdx + 2 (header offset)
  await sheets.spreadsheets.values.update({
    spreadsheetId: sid,
    range: `members!A${memIdx + 2}:I${memIdx + 2}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        members[memIdx].email,
        members[memIdx].name,
        members[memIdx].package,
        String(members[memIdx].max_ports),
        members[memIdx].expiry_date,
        members[memIdx].role,
        members[memIdx].created_at,
        members[memIdx].addon_ib_vps_expiry || "",
        members[memIdx].ib_vps_choice || "",
      ]],
    },
  });
  invalidateCache("members");

  // Send email
  sendPaymentSuccessEmail(email, members[memIdx].name, pkgInfo.label, expiry)
    .catch((e) => console.error("Crypto email failed:", e));

  // Notify VPS order
  if (pkg === "ib_vps_2200") {
    notifyVpsOrder(email, members[memIdx].name, pkgInfo.label, expiry, cryptoPaymentId)
      .catch(() => {});
  }

  return {
    memberEmail: email,
    memberName: members[memIdx].name,
    packageLabel: pkgInfo.label,
    expiryDate: expiry,
  };
}
