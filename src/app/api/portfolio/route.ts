import { auth } from "@/lib/auth";
import { getPortfolioByEmail, addPortfolioAccount, deletePortfolioAccount } from "@/lib/sheets";
import { NextResponse } from "next/server";

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
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const accounts = await getPortfolioByEmail(session.user.email);
    return NextResponse.json({ accounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/portfolio — no auth, email in body
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email;
    const mt5_account = body.mt5_account;

    if (!email || !email.endsWith("@gmail.com")) {
      return NextResponse.json({ error: "valid email required" }, { status: 400 });
    }
    if (!mt5_account) {
      return NextResponse.json({ error: "mt5_account required" }, { status: 400 });
    }

    // Limit: max 20
    const existing = await getPortfolioByEmail(email);
    if (existing.length >= 20) {
      return NextResponse.json({ error: "Maximum 20 portfolio accounts allowed" }, { status: 400 });
    }
    const account = await addPortfolioAccount(email, mt5_account, body.broker || "");
    return NextResponse.json({ success: true, account });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE /api/portfolio — no auth, email + id in body or query
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  let email: string | null = null;
  let id: string | null = null;

  // Try query params first
  email = searchParams.get("email");
  id = searchParams.get("id");

  // Try body (JSON)
  if (!email || !id) {
    try {
      const body = await req.json();
      email = email || body.email;
      id = id || body.id;
    } catch {}
  }

  if (!email || !email.endsWith("@gmail.com")) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    await deletePortfolioAccount(id, email);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}