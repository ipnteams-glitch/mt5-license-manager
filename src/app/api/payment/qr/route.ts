import { auth } from "@/lib/auth";
import { createPayment, reserveSatang, getMemberByEmail, canUpgrade } from "@/lib/sheets";
import { PACKAGES, BUYABLE_PACKAGES } from "@/types";
import type { PackageType } from "@/types";
import { NextResponse } from "next/server";

// POST /api/payment/qr — สร้าง QR PromptPay
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  try {
    const { package: pkg } = await req.json();
    if (!BUYABLE_PACKAGES.includes(pkg as PackageType)) {
      return NextResponse.json({ error: "แพคเกจไม่ถูกต้อง" }, { status: 400 });
    }

    const pkgInfo = PACKAGES[pkg as PackageType];
    const member = await getMemberByEmail(session.user.email);
    if (!member) return NextResponse.json({ error: "ไม่พบสมาชิก" }, { status: 404 });

    // ตรวจสอบสิทธิ์การอัปเกรด (ห้าม downgrade)
    const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;
    const { allowed, reason } = canUpgrade(member.package, pkg as PackageType, isExpired);
    if (!allowed) return NextResponse.json({ error: reason }, { status: 400 });

    // Reserve satang
    const satang = await reserveSatang();
    if (satang === null) return NextResponse.json({ error: "ระบบไม่ว่าง กรุณาลองใหม่" }, { status: 503 });

    const totalAmount = pkgInfo.price + satang;

    // Create pending payment
    const payment = await createPayment(session.user.email, pkg as PackageType, totalAmount, satang);

    // Generate QR via EasySlip (no API key needed)
    const qrRes = await fetch("https://bill-payment-api.easyslip.com/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "PROMPTPAY",
        msisdn: "0954149282",
        amount: totalAmount,
      }),
    });

    const qrData = await qrRes.json();
    if (!qrData.image_base64) throw new Error("สร้าง QR ไม่สำเร็จ");

    return NextResponse.json({
      success: true,
      qr_base64: `data:image/png;base64,${qrData.image_base64}`,
      amount: totalAmount,
      satang,
      txn_id: payment.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
