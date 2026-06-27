import { auth } from "@/lib/auth";
import { updateMemberPackage } from "@/lib/sheets";
import { PACKAGES } from "@/types";
import type { PackageType } from "@/types";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอินก่อน" }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: "เฉพาะแอดมินเท่านั้น" }, { status: 403 });
  }

  try {
    const { email, package: pkg, expiry_date } = await req.json();
    if (!email) return NextResponse.json({ error: "ต้องระบุอีเมลสมาชิก" }, { status: 400 });

    const validPkgs: PackageType[] = ["free", "1000_2m", "3900_6m", "live_with_us", "ib_vps_2200", "none"];
    if (pkg && !validPkgs.includes(pkg)) return NextResponse.json({ error: "แพคเกจไม่ถูกต้อง" }, { status: 400 });

    const pkgInfo = PACKAGES[pkg as PackageType] || PACKAGES.none;
    await updateMemberPackage(email, pkg as PackageType, pkgInfo.max_ports, expiry_date || "");

    return NextResponse.json({ success: true, message: `อัปเดต ${email} เป็น ${pkgInfo.label}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}