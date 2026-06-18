import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getAllMembers } from "@/lib/sheets";
import { invalidateCache } from "@/lib/cache";
import { google } from "googleapis";

function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!key || !email) throw new Error("Missing credentials");
  return new google.auth.GoogleAuth({ credentials: JSON.parse(key), scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
}

// POST /api/member/ib-vps-choice  { choice: "1" | "2" }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { choice } = await req.json();
    if (choice !== "1" && choice !== "2") {
      return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
    }

    const members = await getAllMembers();
    const idx = members.findIndex((m) => m.email === session.user!.email);
    if (idx < 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const sid = process.env.GOOGLE_SHEET_ID;
    if (!sid) throw new Error("Missing GOOGLE_SHEET_ID");

    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.update({
      spreadsheetId: sid,
      range: `members!I${idx + 2}`,
      valueInputOption: "RAW",
      requestBody: { values: [[choice]] },
    });

    invalidateCache("members");

    return NextResponse.json({ success: true, choice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
