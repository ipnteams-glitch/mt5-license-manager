import { auth } from "@/lib/auth";
import { addPort, deletePort, getMemberByEmail } from "@/lib/sheets";
import { NextResponse } from "next/server";

// POST /api/ports — เพิ่มพอร์ต MT5
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "กรุณาล็อคอินก่อน" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { mt5_account, mt5_broker } = body;

    if (!mt5_account) {
      return NextResponse.json({ error: "กรุณากรอกหมายเลขพอร์ต MT5" }, { status: 400 });
    }

    // ดึงข้อมูลสมาชิกเพื่อเช็คโควต้า
    const member = await getMemberByEmail(session.user.email);
    if (!member) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสมาชิก" }, { status: 404 });
    }

    if (member.max_ports <= 0) {
      return NextResponse.json({ error: "คุณยังไม่มีแพคเกจ — ติดต่อแอดมิน" }, { status: 403 });
    }

    // เช็ควันหมดอายุ
    if (member.expiry_date) {
      const expiry = new Date(member.expiry_date);
      if (expiry <= new Date()) {
        return NextResponse.json({ error: "แพคเกจของคุณหมดอายุแล้ว — ติดต่อแอดมินเพื่อต่ออายุ" }, { status: 403 });
      }
    }

    const port = await addPort(
      session.user.email,
      mt5_account,
      mt5_broker || "",
      member.max_ports
    );

    return NextResponse.json({ success: true, port });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE /api/ports?id=xxx — ลบพอร์ต MT5
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "กรุณาล็อคอินก่อน" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const portId = searchParams.get("id");

  if (!portId) {
    return NextResponse.json({ error: "ต้องระบุ port id" }, { status: 400 });
  }

  try {
    await deletePort(portId, session.user.email);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
