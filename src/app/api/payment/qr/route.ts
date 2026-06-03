import { auth } from "@/lib/auth";
import { createPayment, getMemberByEmail, canUpgrade, cleanupExpiredPayments } from "@/lib/sheets";
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

    // ลบ pending เก่าที่เกิน 15 นาที (ไม่สแกนจ่าย)
    cleanupExpiredPayments().catch((e) => console.error("Cleanup failed:", e));

    // สร้าง payment (จองสตางค์ในตัว)
    const payment = await createPayment(session.user.email, pkg as PackageType, pkgInfo.price);

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
