// POST /api/payment/crypto-cancel — ยกเลิกรายการคริปโต
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getCryptoPaymentById, markCryptoPaymentFailed } from "@/lib/crypto-payments";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "กรุณาล็อคอินก่อน" }, { status: 401 });

  try {
    const { payment_id } = await req.json();
    if (!payment_id)
      return NextResponse.json({ error: "ต้องระบุ payment_id" }, { status: 400 });

    const payment = await getCryptoPaymentById(payment_id);
    if (!payment)
      return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });

    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
    const isAdmin = adminEmails.includes(session.user.email);
    if (payment.email !== session.user.email && !isAdmin)
      return NextResponse.json({ error: "ไม่ใช่รายการของคุณ" }, { status: 403 });

    if (payment.status !== "pending")
      return NextResponse.json({ error: "รายการนี้ไม่สามารถยกเลิกได้" }, { status: 400 });

    await markCryptoPaymentFailed(payment_id);

    return NextResponse.json({ success: true, message: "ยกเลิกรายการแล้ว" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
