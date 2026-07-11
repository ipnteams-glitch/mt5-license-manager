// POST /api/crypto/topup-confirm — Admin force
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getTopupById, markTopupPaid, creditBalance } from "@/lib/crypto-wallets";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
  if (!adminEmails.includes(session.user.email)) return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });

  try {
    const { topup_id, amount, txid } = await req.json();
    if (!topup_id) return NextResponse.json({ error: "ต้องระบุ topup_id" }, { status: 400 });
    const topup = await getTopupById(topup_id);
    if (!topup) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
    if (topup.status === "paid") return NextResponse.json({ success: false, message: "รายการนี้เติมแล้ว" });

    const amt = parseFloat(amount) || 0;
    await markTopupPaid(topup_id, txid || "admin_manual", amt);
    const newBal = await creditBalance(topup.email, amt);
    return NextResponse.json({ success: true, message: `[ADMIN] อนุมัติ ${amt} USDT`, balance: newBal });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
