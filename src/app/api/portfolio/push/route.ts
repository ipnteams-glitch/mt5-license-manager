import { pushPortfolioData } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/portfolio/push?mt5_account=xxx&balance=xxx&floating_pl=xxx&total_profit=xxx
// สำหรับ EA ที่ใช้ GrabWeb (WinInet GET only)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mt5_account = searchParams.get("mt5_account");
    const balance = searchParams.get("balance");
    const floating_pl = searchParams.get("floating_pl");
    const total_profit = searchParams.get("total_profit");
    const broker = searchParams.get("broker") || "";

    if (!mt5_account) {
      return NextResponse.json({ error: "ต้องระบุ mt5_account" }, { status: 400 });
    }

    await pushPortfolioData(mt5_account, {
      balance: parseFloat(balance || "0"),
      floating_pl: parseFloat(floating_pl || "0"),
      total_profit: parseFloat(total_profit || "0"),
      broker: broker || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/portfolio/push — สำหรับเรียกแบบ JSON
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mt5_account, balance, floating_pl, total_profit, broker } = body;

    if (!mt5_account) {
      return NextResponse.json({ error: "ต้องระบุ mt5_account" }, { status: 400 });
    }

    await pushPortfolioData(mt5_account, {
      balance: typeof balance === "number" ? balance : parseFloat(balance) || 0,
      floating_pl: typeof floating_pl === "number" ? floating_pl : parseFloat(floating_pl) || 0,
      total_profit: typeof total_profit === "number" ? total_profit : parseFloat(total_profit) || 0,
      broker: broker || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}