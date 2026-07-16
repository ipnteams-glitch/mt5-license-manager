// GET /api/debug/agents-raw — dump raw agents sheet data
import { auth } from "@/lib/auth";
import { google } from "googleapis";
import { NextResponse } from "next/server";

function getSheetsAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!key || !email) throw new Error("Missing env");
  try {
    return new google.auth.GoogleAuth({ credentials: JSON.parse(key), scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  } catch {
    return new google.auth.GoogleAuth({ keyFile: key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
  if (!adminEmails.includes(session.user.email)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const sid = process.env.GOOGLE_SHEET_ID;
  if (!sid) return NextResponse.json({ error: "Missing sheet ID" }, { status: 500 });

  const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });
  
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sid,
      range: "agents!A1:L",
    });
    
    const rows = res.data.values || [];
    return NextResponse.json({
      total_rows: rows.length,
      header: rows[0] || null,
      column_count: rows[0]?.length || 0,
      rows: rows.slice(1).map((r, i) => ({
        index: i + 2, // sheet row number
        cells: r,
        cell_count: r.length,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
