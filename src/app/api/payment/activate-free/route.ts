import { auth } from "@/lib/auth";
import { getMemberByEmail, updateMemberPackage, canUpgrade, calculateNewExpiry } from "@/lib/sheets";
import { PACKAGES } from "@/types";
import { NextResponse } from "next/server";

// POST /api/payment/activate-free — เปิดใช้งานแพคเกจฟรี (ไม่ต้องจ่าย)
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  try {
    const member = await getMemberByEmail(session.user.email);
    if (!member) return NextResponse.json({ error: "ไม่พบสมาชิก" }, { status: 404 });

    const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : true;
    const { allowed, reason } = canUpgrade(member.package, "free", isExpired);
    if (!allowed) return NextResponse.json({ error: reason }, { status: 400 });

    const { expiry, maxPorts } = calculateNewExpiry(member, "free");
    await updateMemberPackage(session.user.email, "free", maxPorts, expiry);

    return NextResponse.json({
      success: true,
      message: "เปิดใช้งานแพคเกจฟรี 30 วัน สำเร็จ",
      package: "free",
      expiry_date: expiry,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}