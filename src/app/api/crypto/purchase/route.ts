// POST /api/crypto/purchase — ซื้อแพ็คเกจด้วย USDT (ตัดเงินจาก wallet)
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { PACKAGES, BUYABLE_PACKAGES, TEST_PACKAGES } from "@/types";
import type { PackageType } from "@/types";
import { purchasePackage, getWallet } from "@/lib/crypto-wallets";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  try {
    const { package: pkg } = await req.json();
    if (!BUYABLE_PACKAGES.includes(pkg as PackageType) && !TEST_PACKAGES.includes(pkg as PackageType))
      return NextResponse.json({ error: "แพคเกจไม่ถูกต้อง" }, { status: 400 });

    if (TEST_PACKAGES.includes(pkg as PackageType) && session.user.email !== "ipnteams@gmail.com")
      return NextResponse.json({ error: "สำหรับทดสอบเท่านั้น" }, { status: 403 });

    const result = await purchasePackage(session.user.email, pkg as PackageType);
    const pkgInfo = PACKAGES[pkg as PackageType];

    return NextResponse.json({
      success: true,
      message: `ซื้อ ${pkgInfo.name} สำเร็จ`,
      package: pkg,
      package_label: result.packageLabel,
      expiry_date: result.expiryDate,
      new_balance: result.newBalance,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
