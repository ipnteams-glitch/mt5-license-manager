import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const envContent = fs.readFileSync(path.join(__dirname, ".env.local"), "utf-8");
  const env: Record<string, string> = {};
  envContent.split("\n").forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  });

  const sheetId = env.GOOGLE_SHEET_ID;
  const keyPath = env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  console.log("📋 Config Check:\n");
  console.log("  Sheet ID:", sheetId || "MISSING");
  console.log("  Key Path:", keyPath || "MISSING");
  console.log("  SA Email:", email || "MISSING");

  if (!sheetId || !keyPath || !email) {
    console.log("\n❌ Config incomplete");
    process.exit(1);
  }

  const keyFullPath = path.join(__dirname, keyPath.startsWith("./") ? keyPath.slice(2) : keyPath);
  console.log("  Key Full Path:", keyFullPath);

  if (!fs.existsSync(keyFullPath)) {
    console.log("\n❌ Key file not found:", keyFullPath);
    process.exit(1);
  }

  const creds = JSON.parse(fs.readFileSync(keyFullPath, "utf-8"));
  console.log("  Key Project:", creds.project_id);

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  console.log("\n🔍 Read Sheet...");
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    console.log("  ✅ Connected! Title:", meta.data.properties?.title);
    const tabs = meta.data.sheets || [];
    tabs.forEach((s) => console.log("    📄", s.properties?.title));

    // Check members headers
    try {
      const r1 = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "members!A1:G1" });
      const h = r1.data.values?.[0] || [];
      console.log("\n  members headers:", h.join(" | ") || "EMPTY");
      const expected = ["email","name","package","max_ports","expiry_date","role","created_at"];
      console.log("  ✅" + (expected.every((e,i) => h[i]===e) ? "" : " ⚠️ mismatch"));
    } catch (e: any) {
      console.log("  ❌ members sheet:", e.message);
    }

    // Check ports headers
    try {
      const r2 = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "ports!A1:F1" });
      const h = r2.data.values?.[0] || [];
      console.log("\n  ports headers:", h.join(" | ") || "EMPTY");
      const expected = ["id","member_email","mt5_account","mt5_broker","status","created_at"];
      console.log("  ✅" + (expected.every((e,i) => h[i]===e) ? "" : " ⚠️ mismatch"));
    } catch (e: any) {
      console.log("  ❌ ports sheet:", e.message);
    }
  } catch (e: any) {
    console.log("  ❌ Failed:", e.message);
  }

  console.log("\n✅ Done");
}

main().catch(console.error);
