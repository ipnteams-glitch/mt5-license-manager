import { auth } from "@/lib/auth";
import { getPaymentById, markPaymentPaid, getMemberByEmail, updateMemberPackage, getEasySlipApiKey } from "@/lib/sheets";
import { canUpgrade, calculateNewExpiry } from "@/lib/sheets";
import { PACKAGES } from "@/types";
import { NextResponse } from "next/server";
import { sendPaymentSuccessEmail } from "@/lib/mail";
import { notifyVpsOrder } from "@/lib/notify";

// POST /api/payment/verify — ตรวจสอบการจ่าย
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  try {
    const { txn_id } = await req.json();
    if (!txn_id) return NextResponse.json({ error: "ต้องระบุ txn_id" }, { status: 400 });

    const payment = await getPaymentById(txn_id);
    if (!payment) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
    if (payment.status === "paid") return NextResponse.json({ success: true, message: "ชำระเงินสำเร็จแล้ว" });
    if (payment.status === "failed") return NextResponse.json({ success: false, cancelled: true, message: "รายการนี้ถูกยกเลิก" });

    // ถ้ามี qr_payload → ลอง verify ผ่าน EasySlip v2
    if (payment.qr_payload && payment.qr_payload.length > 10) {
      try {
        const apiKey = await getEasySlipApiKey();
        const v2Res = await fetch("https://api.easyslip.com/v2/verify/bank", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payload: payment.qr_payload,
            matchAmount: payment.amount,
          }),
        });

        const v2Data = await v2Res.json();
        console.log("[EasySlip v2] status:", v2Res.status, "success:", v2Data.success, "matched:", v2Data.data?.isAmountMatched);

        if (v2Data.success && v2Data.data?.isAmountMatched) {
          await completePayment(txn_id, session.user.email!, payment.package, payment.amount);
          return NextResponse.json({ success: true, message: "ชำระเงินสำเร็จ (auto)" });
        }
      } catch (e) {
        console.error("[EasySlip v2] error:", e);
      }
    }

    return NextResponse.json({ success: false, message: "รอแอดมินยืนยันการชำระเงิน" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

async function completePayment(txnId: string, email: string, pkg: string, amount: number) {
  await markPaymentPaid(txnId);

  const member = await getMemberByEmail(email);
  if (!member) return;

  const { allowed } = canUpgrade(member.package, pkg as any, false);
  if (!allowed) return;

  const { expiry, maxPorts } = calculateNewExpiry(member, pkg as any);
  await updateMemberPackage(email, pkg as any, maxPorts, expiry);

  const pkgInfo = PACKAGES[pkg as keyof typeof PACKAGES];
  const updatedMember = await getMemberByEmail(email);
  if (updatedMember && pkgInfo) {
    sendPaymentSuccessEmail(email, updatedMember.name, pkgInfo.label, expiry)
      .catch((e) => console.error("Email failed:", e));
  }
  if (pkg === "9990_1y") {
    notifyVpsOrder(email, updatedMember?.name || "", pkgInfo?.label || "", expiry, txnId).catch(() => {});
  }
}