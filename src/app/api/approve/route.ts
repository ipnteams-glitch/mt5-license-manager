import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// GET /api/approve
export async function GET() {
  try {
    const filePath = join(process.cwd(), "approve.txt");
    if (!existsSync(filePath)) {
      return NextResponse.json({ text: "" });
    }
    const text = readFileSync(filePath, "utf-8");
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ text: "" });
  }
}
