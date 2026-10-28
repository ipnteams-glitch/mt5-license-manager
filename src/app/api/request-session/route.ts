// GET /api/request-session?account=12345678&ea=26&name=xxx&broker=yyy
//
// ออก session token (HMAC) ให้ EA เอาไปยืนยันตัวกับ socket server (server_v8.py)
// แทน static token "SuperCopy999" เดิม. EA ที่ไม่มี license ที่ถูกต้อง = ขอ token ไม่ได้ = ต่อ socket ไม่ได้
//
// Token: base64(`${account}:${ea}:${expires}:${hmac_sha256_hex}`)   (payload = account:ea:expires)
//   SESSION_SECRET (env) ต้องตรงกับ server_v8.py ที่ verify
//   expires = unix วินาที, อายุ 24 ชม.
//
// ด่านเช็ค license = เหมือน /api/verify-port (whitelist / port + member + expiry + permanent-first / quota)
// เพิ่ม/แก้เงื่อนไขตรงไหน ต้องแก้ทั้ง 2 ไฟล์ให้ตรงกัน

import { findPortByAccount, getMemberByEmail, getAllWhitelist, checkWhitelist, getAllPorts } from "@/lib/supabase";
import { hasPermanentPortEntitlement } from "@/types";
import { NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_TTL = 86400; // 24 ชม.

function issueToken(account: string, ea: string): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error("[request-session] SESSION_SECRET not set");
    return null;
  }
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const payload = `${account}:${ea}:${expires}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64");
}

function ok(account: string, ea: string) {
  const token = issueToken(account, ea);
  if (!token) {
    return NextResponse.json({ error: "server misconfigured (no SESSION_SECRET)" }, { status: 500 });
  }
  return NextResponse.json({ session_token: token, expires: Math.floor(Date.now() / 1000) + SESSION_TTL });
}

function deny(reason: string) {
  return NextResponse.json({ error: reason }, { status: 403 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const account = searchParams.get("account");
  const ea = searchParams.get("ea") || "0";
  const name = searchParams.get("name") || "";
  const broker = searchParams.get("broker") || "";

  if (!account) {
    return NextResponse.json({ error: "ต้องระบุ account number" }, { status: 400 });
  }

  // Whitelist — ไม่จำกัดพอร์ต ไม่หมดอายุ
  if (name && broker) {
    const whitelist = await getAllWhitelist();
    if (checkWhitelist(whitelist, name, broker)) {
      return ok(account, ea);
    }
  }

  try {
    const port = await findPortByAccount(account, broker || undefined);
    if (!port) return deny("ไม่พบพอร์ตนี้ในระบบ");

    const member = await getMemberByEmail(port.member_email);
    if (!member) return deny("ไม่พบข้อมูลสมาชิก");

    if (member.package === "none" || member.max_ports <= 0) {
      return deny("สมาชิกไม่มีแพคเกจ");
    }

    let daysLeft = 0;
    if (member.expiry_date) {
      const expiry = new Date(member.expiry_date);
      const now = new Date();
      daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    const allPorts = await getAllPorts();
    const memberPorts = allPorts
      .filter(p => p.member_email === member.email && p.status === "active")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const portIndex = memberPorts.findIndex(p => p.mt5_account === account);
    const isFirstPort = portIndex === 0;

    const isLifetimePkg =
      member.package === "admin" ||
      member.package === "free_ib" ||
      member.package === "live_with_us" ||
      member.package === "ib_folio";

    const permanentEntitled = hasPermanentPortEntitlement(member);
    if (daysLeft <= 0 && !isLifetimePkg) {
      if (permanentEntitled && isFirstPort) {
        // พอร์ตแรกถาวร: ผ่าน
      } else {
        return deny(permanentEntitled
          ? "แพคเกจหมดอายุ — พอร์ตแรกใช้ฟรีถาวร ต้องการเพิ่มพอร์ต กรุณาต่ออายุ"
          : "แพคเกจหมดอายุ — กรุณาต่ออายุเพื่อใช้งานต่อ");
      }
    }

    if (portIndex >= member.max_ports && member.package !== "admin") {
      return deny("เกินโควต้าพอร์ต — กรุณาอัปเกรดเพื่อเพิ่มพอร์ต");
    }

    // ผ่านทุกเงื่อนไข — ออก token
    return ok(account, ea);
  } catch (err: any) {
    return NextResponse.json({ error: `Server error: ${err.message}` }, { status: 500 });
  }
}
