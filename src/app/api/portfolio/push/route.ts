import { pushPortfolioData } from "@/lib/sheets";
import { NextResponse } from "next/server";

// POST /api/portfolio/push — EA ส่งข้อมูลขึ้น server (อ้างอิงด้วย mt5_account)
// No auth required — ระบุด้วยหมายเลขพอร์ต
// Body: { mt5_account: "12345678", balance: 1000, floating_pl: -50, total_profit: 320 }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mt5_account, balance, floating_pl, total_profit } = body;

    if (!mt5_account) {
      return NextResponse.json({ error: "ต้องระบุ mt5_account" }, { status: 400 });
    }

    await pushPortfolioData(mt5_account, {
      balance: typeof balance === "number" ? balance : parseFloat(balance) || 0,
      floating_pl: typeof floating_pl === "number" ? floating_pl : parseFloat(floating_pl) || 0,
      total_profit: typeof total_profit === "number" ? total_profit : parseFloat(total_profit) || 0,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
