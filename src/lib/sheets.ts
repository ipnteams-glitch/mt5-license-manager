import { google } from "googleapis";
import { getCache, setCache } from "./cache";

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

// ── EasySlip API Key (env-first, fallback to Sheet) ──
export async function getEasySlipApiKey(): Promise<string> {
  // ponytail: env first — avoids Sheets API call on most requests
  const envKey = process.env.EASYSLIP_API_KEY;
  if (envKey) return envKey;

  try {
    const sheets = await getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId(),
      range: "API_KEY!A2",
    });
    return res.data.values?.[0]?.[0] || "";
  } catch {
    return "";
  }
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
// ===== Old Sheets database code removed — migrated to Supabase =====
