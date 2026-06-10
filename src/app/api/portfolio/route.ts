import { auth } from "@/lib/auth";
import { getPortfolioByEmail, addPortfolioAccount, deletePortfolioAccount } from "@/lib/sheets";
import { NextResponse } from "next/server";

// Cache ใน memory 30 วิ
const cache = new Map<string, { data: any; ts: number }>();

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

  const email = session.user.email;
  const now = Date.now();
  const cached = cache.get(email);
  if (cached && now - cached.ts < 30000) {
    return NextResponse.json({ accounts: cached.data });
  }

  try {
    const accounts = await getPortfolioByEmail(email);
    cache.set(email, { data: accounts, ts: now });
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
      const account = await addPortfolioAccount(session.user.email, mt5_account, broker || "");
      cache.delete(session.user.email);
      return NextResponse.json({ success: true, account });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  // Fallback: รับ email จาก body สำหรับ static HTML (All_System)
  try {
    const body = await req.json();
    if (body.email && body.email.endsWith("@gmail.com")) {
      const account = await addPortfolioAccount(body.email, body.mt5_account, body.broker || "");
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
    cache.delete(session.user.email);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}