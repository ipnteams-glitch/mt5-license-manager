import { auth } from "@/lib/auth";
import { getPaymentById, markPaymentPaid, getMemberByEmail, updateMemberPackage, getEasySlipApiKey } from "@/lib/sheets";
import { canUpgrade, calculateNewExpiry } from "@/lib/sheets";
import { PACKAGES } from "@/types";
import { NextResponse } from "next/server";
import { sendPaymentSuccessEmail } from "@/lib/mail";

// POST /api/payment/verify — ตรวจสอบการจ่าย
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  try {
    const { txn_id } = await req.json();
    if (!txn_id) return NextResponse.json({ error: "ต้องระบุ txn_id" }, { status: 400 });

    const payment = await getPaymentById(txn_id);
    if (!payment) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
    if (payment.status === "paid") return NextResponse.json({ success: false, message: "รายการนี้จ่ายแล้ว" });

    // ตรวจสอบกับ EasySlip
    const apiKey = await getEasySlipApiKey();
    // EasySlip verification: ตรวจสอบสลิป
    const now = new Date();
    // ลองเช็คโดยดึงรายการล่าสุด (simplified - EasySlip API อาจมีวิธีตรวจสอบต่างกัน)
    // ในที่นี้ใช้วิธีเทียบยอดจาก transaction list
    const checkRes = await fetch("https://bill-payment-api.easyslip.com/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "check",
        api_key: apiKey,
        type: "PROMPTPAY",
        amount: payment.amount,
      }),
    });

    const checkData = await checkRes.json();
    console.log("[EasySlip verify] amount:", payment.amount, "status:", checkRes.status, "data:", JSON.stringify(checkData));
    
    // ถ้า API ตอบว่ามีการจ่ายตรงกับยอด
    if (checkData.success || checkData.found) {
      // Mark as paid
      await markPaymentPaid(txn_id);

      // Upgrade member package
      const member = await getMemberByEmail(session.user.email);
      if (!member) return NextResponse.json({ success: false, message: "ไม่พบสมาชิก" });

      const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;
      const { allowed, reason } = canUpgrade(member.package, payment.package, isExpired);
      if (!allowed) return NextResponse.json({ success: false, message: reason || "ไม่สามารถอัปเกรดได้" });

      const { expiry, maxPorts } = calculateNewExpiry(member, payment.package);
      await updateMemberPackage(session.user.email, payment.package, maxPorts, expiry);

      const pkgInfo = PACKAGES[payment.package];

      // ส่ง Email แจ้งเตือน
      const updatedMember = await getMemberByEmail(session.user.email!);
      if (updatedMember) {
        sendPaymentSuccessEmail(
          session.user.email!,
          updatedMember.name,
          pkgInfo.label,
          expiry
        ).catch((e) => console.error("Email failed:", e));
      }

      return NextResponse.json({
        success: true,
        message: `ต่ออายุสำเร็จ — ${pkgInfo.label}`,
        package: payment.package,
        expiry_date: expiry,
      });
    }

    // ยังไม่พบการจ่าย
    return NextResponse.json({ success: false, message: "ยังไม่พบการจ่าย กรุณาลองใหม่" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
