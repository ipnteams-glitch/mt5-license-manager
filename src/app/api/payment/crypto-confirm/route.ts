// POST /api/payment/crypto-confirm — Admin force-verify crypto payment
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getCryptoPaymentById, approveCryptoPaymentAndUpgrade } from "@/lib/crypto-payments";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(session.user.email))
    return NextResponse.json({ error: "เฉพาะแอดมินเท่านั้น" }, { status: 403 });

  try {
    const { payment_id } = await req.json();
    if (!payment_id)
      return NextResponse.json({ error: "ต้องระบุ payment_id" }, { status: 400 });

    const payment = await getCryptoPaymentById(payment_id);
    if (!payment)
      return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
    if (payment.status === "paid")
      return NextResponse.json({ success: false, message: "รายการนี้จ่ายแล้ว" });

    const result = await approveCryptoPaymentAndUpgrade(payment_id);

    return NextResponse.json({
      success: true,
      message: `[ADMIN] อนุมัติสำเร็จ — ${result.packageLabel}`,
      package: payment.package,
      expiry_date: result.expiryDate,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
