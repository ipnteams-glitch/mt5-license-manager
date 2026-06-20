import { getEaVersion } from "@/lib/sheets";
import { NextResponse } from "next/server";

// GET /api/ea-version — ดูเวอร์ชั่น EA ล่าสุดจาก Google Drive
export async function GET() {
  try {
    const version = await getEaVersion();
    return NextResponse.json({ version });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
