import { auth } from "@/lib/auth";
import { updateMemberPackage } from "@/lib/supabase";
import { PACKAGES } from "@/types";
import type { PackageType } from "@/types";
import { NextResponse } from "next/server";


// DELETE: cascade delete all member data
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
  if (!adminEmails.includes(session.user.email)) return NextResponse.json({ error: "admin only" }, { status: 403 });
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
    const { deleteMemberCascade } = await import("@/lib/supabase");
    const r = await deleteMemberCascade(email);
    return NextResponse.json({ success: true, deleted: r.deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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