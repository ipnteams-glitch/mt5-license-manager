// POST /api/crypto/purchase — ซื้อแพ็คเกจด้วย USDT (ตัดเงินจาก wallet)
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { PACKAGES, BUYABLE_PACKAGES, TEST_PACKAGES } from "@/types";
import type { PackageType } from "@/types";
import { purchasePackage, getWallet } from "@/lib/crypto-wallets";
import { hasBoughtPaidPackage } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  try {
    const { package: pkg, agent_code } = await req.json();
    const STARTUP_ALLOWED = (pkg as string) === "startup100";
    if (!BUYABLE_PACKAGES.includes(pkg as PackageType) && !TEST_PACKAGES.includes(pkg as PackageType) && !STARTUP_ALLOWED)
      return NextResponse.json({ error: "แพคเกจไม่ถูกต้อง" }, { status: 400 });

    if (TEST_PACKAGES.includes(pkg as PackageType) && session.user.email !== "ipnteams@gmail.com")
      return NextResponse.json({ error: "สำหรับทดสอบเท่านั้น" }, { status: 403 });

    // ponytail: startup100 — only for first-time buyers
    if (pkg === "startup100") {
      const alreadyBought = await hasBoughtPaidPackage(session.user.email);
      if (alreadyBought) return NextResponse.json({ error: "แพคเกจ StartUp100 สำหรับลูกค้าใหม่เท่านั้น" }, { status: 400 });
    }
    const result = await purchasePackage(session.user.email, pkg as PackageType, agent_code);
    const pkgInfo = PACKAGES[pkg as PackageType];
    revalidatePath("/dashboard");

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