import { getAllBrokers } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/brokers
export async function GET() {
  try {
    const brokers = await getAllBrokers();
    return NextResponse.json({ brokers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}