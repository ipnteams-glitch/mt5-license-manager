import { auth } from "@/lib/auth";
import { createPayment, getMemberByEmail, canUpgrade } from "@/lib/sheets";
import { PACKAGES, BUYABLE_PACKAGES, TEST_PACKAGES } from "@/types";
import type { PackageType } from "@/types";
import { NextResponse } from "next/server";


// POST /api/payment/qr — สร้าง QR PromptPay
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  try {
    const { package: pkg } = await req.json();
    if (!BUYABLE_PACKAGES.includes(pkg as PackageType) && !TEST_PACKAGES.includes(pkg as PackageType)) {
      return NextResponse.json({ error: "แพคเกจไม่ถูกต้อง" }, { status: 400 });
    }

    // Test package — เฉพาะ ipnteams@gmail.com
    if (TEST_PACKAGES.includes(pkg as PackageType) && session.user.email !== "ipnteams@gmail.com") {
      return NextResponse.json({ error: "แพคเกจนี้สำหรับทดสอบเท่านั้น" }, { status: 403 });
    }

    const pkgInfo = PACKAGES[pkg as PackageType];
    const member = await getMemberByEmail(session.user.email);
    if (!member) return NextResponse.json({ error: "ไม่พบสมาชิก" }, { status: 404 });

    // ตรวจสอบสิทธิ์การอัปเกรด (ห้าม downgrade)
    const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;
    const { allowed, reason } = canUpgrade(member.package, pkg as PackageType, isExpired);
    if (!allowed) return NextResponse.json({ error: reason }, { status: 400 });

    // Promo: June 2026 50% off for 4 packages
    const promoPackages = ["1000_2m", "2490_3m", "4900_1y", "live_with_us"];
    const isPromo = body.promo === "june2026";
    const promoNow = new Date();
    const isJune2026 = promoNow.getFullYear() === 2026 && promoNow.getMonth() === 5;
    const finalPrice = (isPromo && isJune2026 && promoPackages.includes(pkg as PackageType))
      ? Math.round(pkgInfo.price * 0.5)
      : pkgInfo.price;

    // สร้าง payment
    const payment = await createPayment(session.user.email, pkg as PackageType, finalPrice);

    // สร้าง QR ผ่าน EasySlip
    const qrRes = await fetch("https://bill-payment-api.easyslip.com/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "PROMPTPAY", msisdn: "0954149282", amount: payment.amount }),
    });
    const qrData = await qrRes.json();
    if (!qrData.image_base64) throw new Error("สร้าง QR ไม่สำเร็จ");

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return NextResponse.json({
      success: true,
      qr_base64: `data:image/png;base64,${qrData.image_base64}`,
      amount: payment.amount,
      satang: payment.satang,
      txn_id: payment.id,
      expires_at: expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
