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
        action: "list",
        api_key: apiKey,
        type: "PROMPTPAY",
        limit: 20,
      }),
    });

    const listData = await checkRes.json();
    console.log("[EasySlip list] status:", checkRes.status, "full:", JSON.stringify(listData).slice(0, 500));

    // มองหาธุรกรรมที่ยอดตรงกัน ±5 นาทีจากตอนสร้าง payment
    let matched = false;
    const paymentTime = new Date(payment.created_at);
    const windowMs = 5 * 60 * 1000;
    if (listData.data && Array.isArray(listData.data)) {
      for (const txn of listData.data) {
        const txnAmount = parseFloat(txn.amount || txn.transaction_amount || "0");
        const txnTime = txn.date || txn.transaction_date || txn.created_at;
        if (txnAmount && txnTime) {
          const txnDate = new Date(txnTime);
          if (
            Math.abs(txnAmount - payment.amount) < 0.05 &&
            Math.abs(txnDate.getTime() - paymentTime.getTime()) < windowMs
          ) {
            matched = true;
            console.log("[EasySlip] matched:", txnAmount, txnTime);
            break;
          }
        }
      }
    }

    if (matched) {
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
