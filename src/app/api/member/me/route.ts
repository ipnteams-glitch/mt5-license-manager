import { auth } from "@/lib/auth";
import { getMemberByEmail, portAddonEligible } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/member/me — ข้อมูลสมาชิกย่อ (ใช้ gate ปุ่มซื้อพอร์ตเพิ่ม)
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  const member = await getMemberByEmail(session.user.email);
  if (!member) return NextResponse.json({ error: "ไม่พบสมาชิก" }, { status: 404 });

  const days = member.expiry_date
    ? Math.floor((new Date(member.expiry_date).getTime() - Date.now()) / 86400000)
    : null;

  return NextResponse.json({
    package: member.package,
    expiry_date: member.expiry_date,
    max_ports: member.max_ports,
    days_left: days,
    addon_eligible: portAddonEligible(member),
  });
}
