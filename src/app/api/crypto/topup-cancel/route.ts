// POST /api/crypto/topup-cancel — ยกเลิกเติมเงิน
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getTopupById, markTopupFailed } from "@/lib/crypto-wallets";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });
  try {
    const { topup_id } = await req.json();
    if (!topup_id) return NextResponse.json({ error: "ต้องระบุ topup_id" }, { status: 400 });
    const topup = await getTopupById(topup_id);
    if (!topup) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
    if (topup.email !== session.user.email) return NextResponse.json({ error: "ไม่ใช่รายการของคุณ" }, { status: 403 });
    if (topup.status !== "pending") return NextResponse.json({ error: "ไม่สามารถยกเลิกได้" }, { status: 400 });
    await markTopupFailed(topup_id);
    return NextResponse.json({ success: true, message: "ยกเลิกแล้ว" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
