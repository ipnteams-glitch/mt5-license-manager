import { findPortByAccount, getMemberByEmail, getAllWhitelist, checkWhitelist, getAllPorts } from "@/lib/supabase";
import { PACKAGES } from "@/types";
import { NextResponse } from "next/server";

// GET /api/verify-port?account=12345678&name=xxx&broker=yyy
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const account = searchParams.get("account");
  const name = searchParams.get("name") || "";
  const broker = searchParams.get("broker") || "";

  if (!account) {
    return NextResponse.json({ valid: false, reason: "ต้องระบุ account number" }, { status: 400 });
  }

  // Whitelist — ไม่จำกัดพอร์ต ไม่หมดอายุ
  if (name && broker) {
    const whitelist = await getAllWhitelist();
    if (checkWhitelist(whitelist, name, broker)) {
      return NextResponse.json({
        valid: true,
        email: "whitelist",
        package: "Whitelist VIP",
        package_key: "whitelist",
        expiry_date: "2099-12-31",
        days_left: 9999,
      });
    }
  }

  try {
    const port = await findPortByAccount(account, broker || undefined);

    if (!port) {
      return NextResponse.json({
        valid: false,
        reason: "ไม่พบพอร์ตนี้ในระบบ",
      });
    }

    // เช็คแพคเกจสมาชิก
    const member = await getMemberByEmail(port.member_email);
    if (!member) {
      return NextResponse.json({
        valid: false,
        reason: "ไม่พบข้อมูลสมาชิก",
      });
    }

    // เช็คแพคเกจ
    if (member.package === "none" || member.max_ports <= 0) {
      return NextResponse.json({
        valid: false,
        email: member.email,
        package: member.package,
        reason: "สมาชิกไม่มีแพคเกจ",
      });
    }

    // คำนวณวันหมดอายุ
    let daysLeft = 0;
    if (member.expiry_date) {
      const expiry = new Date(member.expiry_date);
      const now = new Date();
      daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // หาพอร์ตที่ active ของสมาชิกนี้ เรียงตามวันที่สร้าง (เก่าสุด = index 0)
    const allPorts = await getAllPorts();
    const memberPorts = allPorts
      .filter(p => p.member_email === member.email && p.status === "active")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const portIndex = memberPorts.findIndex(p => p.mt5_account === account);
    const isFirstPort = portIndex === 0;

    // ── หลังหมดอายุ → พอร์ตแรกใช้ได้ถาวร, พอร์ตอื่นถูกปฏิเสธ ──
    if (daysLeft <= 0 && member.package !== "free_ib" && member.package !== "live_with_us") {
      if (isFirstPort) {
        daysLeft = 9999; // พอร์ตแรก: ผ่าน (ถาวร)
      } else {
        return NextResponse.json({
          valid: false,
          email: member.email,
          package: member.package,
          package_key: member.package,
          expiry_date: member.expiry_date,
          days_left: 0,
          reason: "แพคเกจหมดอายุ — พอร์ตแรกใช้ฟรีถาวร ต้องการเพิ่มพอร์ต กรุณาต่ออายุ",
        });
      }
    }

    // ── ตรวจสอบโควต้าพอร์ต: ไม่อนุญาตเกิน max_ports ──
    if (portIndex >= member.max_ports) {
      return NextResponse.json({
        valid: false,
        email: member.email,
        package: member.package,
        package_key: member.package,
        expiry_date: member.expiry_date,
        days_left: daysLeft,
        reason: "เกินโควต้าพอร์ต — แพคเกจของคุณใช้ได้ " + member.max_ports + " พอร์ต กรุณาอัปเกรดเพื่อเพิ่มพอร์ต",
      });
    }

    // ผ่านทุกเงื่อนไข
    const pkgInfo = PACKAGES[member.package];
    return NextResponse.json({
      valid: true,
      email: member.email,
      package: pkgInfo?.name_en || member.package,
      package_key: member.package,
      // ponytail: first port is always permanent — show "LifeTime"
      expiry_date: isFirstPort ? "LifeTime" : (member.expiry_date || ""),
      days_left: daysLeft,
    });
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, reason: `Server error: ${err.message}` },
      { status: 500 }
    );
  }
}