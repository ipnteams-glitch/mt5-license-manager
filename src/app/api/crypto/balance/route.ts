// GET /api/crypto/balance — เช็คยอด USDT
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getWallet } from "@/lib/crypto-wallets";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });
  const wallet = await getWallet(session.user.email);
  return NextResponse.json({ balance: wallet.usdt_balance, email: wallet.email });
}
