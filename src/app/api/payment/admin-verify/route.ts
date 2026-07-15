import { auth } from "@/lib/auth";
import { getPaymentById, markPaymentPaid, getMemberByEmail, updateMemberPackage, setAddonIbVpsExpiry, addAgentCommission } from "@/lib/sheets";
import { canUpgrade, calculateNewExpiry } from "@/lib/sheets";
import { PACKAGES } from "@/types";
import { NextResponse } from "next/server";
import { sendPaymentSuccessEmail } from "@/lib/mail";
import { notifyVpsOrder } from "@/lib/notify";

// POST /api/payment/admin-verify — แอดมินบังคับ verify การจ่าย (ข้าม EasySlip)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: "เฉพาะแอดมินเท่านั้น" }, { status: 403 });
  }

  try {
    const { txn_id } = await req.json();
    if (!txn_id) return NextResponse.json({ error: "ต้องระบุ txn_id" }, { status: 400 });

    const payment = await getPaymentById(txn_id);
    if (!payment) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
    if (payment.status === "paid") return NextResponse.json({ success: false, message: "รายการนี้จ่ายแล้ว" });

    // Mark as paid (ข้าม EasySlip)
    await markPaymentPaid(txn_id);

    // ponytail: credit agent commission
    if (payment.agent_code && payment.agent_commission && payment.agent_commission > 0) {
      addAgentCommission(payment.agent_code, payment.agent_commission).catch(e => console.error("Agent commission failed:", e));
    }

    // IB+VPS is an add-on — handle before main package logic
    if (payment.package === "ib_vps_2200") {
      const addonExpiry = await setAddonIbVpsExpiry(payment.email);
      return NextResponse.json({
        success: true,
        message: "✅ IB+VPS อนุมัติ — เพิ่ม VPS 1 ปี",
        addon_ib_vps_expiry: addonExpiry,
      });
    }

    // Upgrade member package
    const member = await getMemberByEmail(payment.email);
    if (!member) return NextResponse.json({ success: false, message: "ไม่พบสมาชิก" });

    const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;
    const { allowed, reason } = canUpgrade(member.package, payment.package, isExpired);
    if (!allowed) return NextResponse.json({ success: false, message: reason || "ไม่สามารถอัปเกรดได้" });

    const { expiry, maxPorts } = calculateNewExpiry(member, payment.package);
    await updateMemberPackage(payment.email, payment.package, maxPorts, expiry);

    const pkgInfo = PACKAGES[payment.package];

    const updatedMember = await getMemberByEmail(payment.email);
    if (updatedMember) {
      sendPaymentSuccessEmail(payment.email, updatedMember.name, pkgInfo.label, expiry)
        .catch((e) => console.error("Email failed:", e));
    }

    return NextResponse.json({
      success: true,
      message: `[ADMIN] ต่ออายุสำเร็จ — ${pkgInfo.label}`,
      package: payment.package,
      expiry_date: expiry,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}