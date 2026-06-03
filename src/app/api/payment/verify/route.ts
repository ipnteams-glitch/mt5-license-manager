import { auth } from "@/lib/auth";
import { getPaymentById } from "@/lib/sheets";
import { NextResponse } from "next/server";

// POST /api/payment/verify — ตรวจสอบสถานะการจ่าย
// EasySlip ไม่รองรับ auto-verify PromptPay (ใช้ตรวจสอบสลิปเท่านั้น)
// → ลูกค้าสแกนจ่าย → แอดมินกดยืนยันที่ /admin
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  try {
    const { txn_id } = await req.json();
    if (!txn_id) return NextResponse.json({ error: "ต้องระบุ txn_id" }, { status: 400 });

    const payment = await getPaymentById(txn_id);
    if (!payment) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
    if (payment.status === "paid") return NextResponse.json({ success: true, message: "ชำระเงินสำเร็จแล้ว" });

    return NextResponse.json({ success: false, message: "รอแอดมินยืนยันการชำระเงิน" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
