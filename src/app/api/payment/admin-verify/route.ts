import { auth } from "@/lib/auth";
import { getPaymentById, markPaymentPaid, getMemberByEmail, updateMemberPackage, setAddonIbVpsExpiry, addAgentCommission, distributeCommission, canUpgrade, calculateNewExpiry } from "@/lib/supabase";
import { PACKAGES } from "@/types";
import { NextResponse } from "next/server";
import { sendPaymentSuccessEmail } from "@/lib/mail";
import { notifyVpsOrder } from "@/lib/notify";

// POST /api/payment/admin-verify â€” à¹à¸­à¸”à¸¡à¸´à¸™à¸šà¸±à¸‡à¸„à¸±à¸š verify à¸à¸²à¸£à¸ˆà¹ˆà¸²à¸¢ (à¸‚à¹‰à¸²à¸¡ EasySlip)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "à¸à¸£à¸¸à¸“à¸²à¸¥à¹‡à¸­à¸„à¸­à¸´à¸™" }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: "à¹€à¸‰à¸žà¸²à¸°à¹à¸­à¸”à¸¡à¸´à¸™à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™" }, { status: 403 });
  }

  try {
    const { txn_id } = await req.json();
    if (!txn_id) return NextResponse.json({ error: "à¸•à¹‰à¸­à¸‡à¸£à¸°à¸šà¸¸ txn_id" }, { status: 400 });

    const payment = await getPaymentById(txn_id);
    if (!payment) return NextResponse.json({ error: "à¹„à¸¡à¹ˆà¸žà¸šà¸£à¸²à¸¢à¸à¸²à¸£" }, { status: 404 });
    if (payment.status === "paid") return NextResponse.json({ success: false, message: "à¸£à¸²à¸¢à¸à¸²à¸£à¸™à¸µà¹‰à¸ˆà¹ˆà¸²à¸¢à¹à¸¥à¹‰à¸§" });

    // Mark as paid (à¸‚à¹‰à¸²à¸¡ EasySlip)
    await markPaymentPaid(txn_id);

    // Fetch member early for MLM isNewCustomer check
    const memberCheck = await getMemberByEmail(payment.email);
    const isNewCustomer = !memberCheck || memberCheck.package === "none";

    console.log("[admin-verify] payment.agent_code:", payment.agent_code, "agent_commission:", payment.agent_commission);
    // ponytail: credit agent commission
    if (payment.agent_code && payment.agent_commission && payment.agent_commission > 0) {
      console.log("[admin-verify] crediting agent commission:", payment.agent_code, payment.agent_commission);
      try {
        await addAgentCommission(payment.agent_code, payment.agent_commission);
        console.log("[admin-verify] addAgentCommission SUCCESS");
      // ponytail: MLM upline commission
      distributeCommission(payment.amount, payment.agent_code, payment.package === "ib_vps_2200", isNewCustomer).catch(e => console.error("[MLM] distribute failed:", e));
      } catch (e: any) {
        console.error("[admin-verify] addAgentCommission FAILED:", e.message || e);
      }
    } else {
      console.log("[admin-verify] SKIP agent commission â€” no agent_code or commission");
    }

    // IB+VPS is an add-on â€” handle before main package logic
    if (payment.package === "ib_vps_2200") {
      const addonExpiry = await setAddonIbVpsExpiry(payment.email);
      return NextResponse.json({
        success: true,
        message: "âœ… IB+VPS à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´ â€” à¹€à¸žà¸´à¹ˆà¸¡ VPS 1 à¸›à¸µ",
        addon_ib_vps_expiry: addonExpiry,
      });
    }

    // Upgrade member package
    const member = await getMemberByEmail(payment.email);
    if (!member) return NextResponse.json({ success: false, message: "à¹„à¸¡à¹ˆà¸žà¸šà¸ªà¸¡à¸²à¸Šà¸´à¸" });

    const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;
    const { allowed, reason } = canUpgrade(member.package, payment.package, isExpired);
    if (!allowed) return NextResponse.json({ success: false, message: reason || "à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸­à¸±à¸›à¹€à¸à¸£à¸”à¹„à¸”à¹‰" });

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
      message: `[ADMIN] à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸à¸ªà¸³à¹€à¸£à¹‡à¸ˆ â€” ${pkgInfo.label}`,
      package: payment.package,
      expiry_date: expiry,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
