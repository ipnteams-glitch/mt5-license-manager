import { auth } from "@/lib/auth";
import { getPortfolioByEmail, addPortfolioAccount, deletePortfolioAccount } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Cache จัดการโดย sheets.ts (in-memory, 10s TTL) — ไม่ต้อง cache ซ้ำที่นี่

// GET /api/portfolio — session auth
// GET /api/portfolio?email=xxx@gmail.com — public (for All_System)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const queryEmail = searchParams.get("email");

  // Public access: ?email=xxx@gmail.com
  if (queryEmail && queryEmail.endsWith("@gmail.com")) {
    try {
      const accounts = await getPortfolioByEmail(queryEmail);
      return NextResponse.json({ accounts });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Session access
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "กรุณาล็อคอินก่อน" }, { status: 401 });
  }

  try {
    const accounts = await getPortfolioByEmail(session.user.email);
    return NextResponse.json({ accounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/portfolio — เพิ่มพอร์ตใหม่
export async function POST(req: Request) {
  // Check session first
  const session = await auth();
  if (session?.user?.email) {
    try {
      const { mt5_account, broker } = await req.json();
      if (!mt5_account) {
        return NextResponse.json({ error: "กรุณากรอกหมายเลขพอร์ต MT5" }, { status: 400 });
      }
      if (!broker) {
        return NextResponse.json({ error: "กรุณาเลือกโบรกเกอร์" }, { status: 400 });
      }
      // Limit: max 20 portfolio accounts
      const existing = await getPortfolioByEmail(session.user.email);
      if (existing.length >= 20) {
        return NextResponse.json({ error: "Maximum 20 portfolio accounts allowed" }, { status: 400 });
      }
      const account = await addPortfolioAccount(session.user.email, mt5_account, broker);
      return NextResponse.json({ success: true, account });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  // Fallback: รับ email จาก body สำหรับ static HTML (All_System)
  try {
    const body = await req.json();
    if (body.email && body.email.endsWith("@gmail.com")) {
      const existing2 = await getPortfolioByEmail(body.email);
      if (existing2.length >= 20) {
        return NextResponse.json({ error: "Maximum 20 portfolio accounts allowed" }, { status: 400 });
      }
      if (!body.broker) {
        return NextResponse.json({ error: "กรุณาเลือกโบรกเกอร์" }, { status: 400 });
      }
      const account = await addPortfolioAccount(body.email, body.mt5_account, body.broker);
      return NextResponse.json({ success: true, account });
    }
  } catch {
    // ignore parse errors
  }

  return NextResponse.json({ error: "กรุณาล็อคอินก่อน" }, { status: 401 });
}

// DELETE /api/portfolio?id=xxx — ลบพอร์ต
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "กรุณาล็อคอินก่อน" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ต้องระบุ id" }, { status: 400 });
  }

  try {
    await deletePortfolioAccount(id, session.user.email);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}