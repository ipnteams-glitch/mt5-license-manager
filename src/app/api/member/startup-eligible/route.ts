import { auth } from "@/lib/auth";
import { hasBoughtPaidPackage } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/member/startup-eligible — check if member can buy startup100
// ponytail: eligible only if never bought a paid non-VPS package
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ eligible: false }, { status: 401 });

  try {
    const alreadyBought = await hasBoughtPaidPackage(session.user.email);
    return NextResponse.json({ eligible: !alreadyBought });
  } catch (err: any) {
    return NextResponse.json({ eligible: false, error: err.message }, { status: 500 });
  }
}
