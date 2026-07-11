// GET /api/crypto/topup-poll — poll เติมเงิน (รับทุกจำนวน — ไม่ต้องตรง)
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getTopupById, getPendingTopupsByWallet, markTopupPaid, creditBalance } from "@/lib/crypto-wallets";
import { fetchRecentTransfers, type Transfer } from "@/lib/crypto-verify";
import type { CryptoNetwork } from "@/types";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  const url = new URL(req.url);
  const topupId = url.searchParams.get("topup_id");
  if (!topupId) return NextResponse.json({ error: "ต้องระบุ topup_id" }, { status: 400 });

  try {
    const topup = await getTopupById(topupId);
    if (!topup) return NextResponse.json({ status: "not_found", message: "ไม่พบรายการ" });
    if (topup.email !== session.user.email) return NextResponse.json({ status: "unauthorized" });
    if (topup.status === "paid") return NextResponse.json({ status: "paid", message: "เติมเงินแล้ว", amount: topup.amount });
    if (topup.status === "failed") return NextResponse.json({ status: "failed", message: "รายการถูกยกเลิก" });

    // Check expiry
    if (Date.now() > new Date(topup.expires_at).getTime())
      return NextResponse.json({ status: "expired", message: "หมดเวลา — กรุณาสร้างรายการใหม่" });

    // Fetch recent transfers
    const sinceTs = new Date(topup.created_at).getTime();
    const transfers = await fetchRecentTransfers(
      topup.network as CryptoNetwork, topup.wallet_address, sinceTs,
    );

    if (transfers.length === 0) return NextResponse.json({ status: "pending", message: "รอการโอน..." });

    // Get all pending topups for this wallet (FIFO)
    const pending = await getPendingTopupsByWallet(topup.network as CryptoNetwork, topup.wallet_address);
    // ponytail: sort transfers oldest-first for FIFO matching
    transfers.sort((a, b) => a.timestamp - b.timestamp);

    // FIFO match: loop through pending topups, assign transfers
    const remaining: Transfer[] = [...transfers];
    for (const p of pending) {
      if (remaining.length === 0) break;
      const tx = remaining.shift()!;
      if (p.id === topupId) {
        // This is us! Credit balance
        try {
          await markTopupPaid(p.id, tx.txid, tx.amount);
          const newBal = await creditBalance(p.email, tx.amount);
          return NextResponse.json({ status: "paid", message: "เติมเงินสำเร็จ", amount: tx.amount, balance: newBal });
        } catch (e: any) {
          console.error("[topup-poll] credit failed:", e.message);
          return NextResponse.json({ status: "paid_unconfirmed", message: "ตรวจพบการโอน — รอแอดมินยืนยัน" });
        }
      } else {
        // Someone else's topup — credit them too
        await markTopupPaid(p.id, tx.txid, tx.amount).catch(() => {});
        await creditBalance(p.email, tx.amount).catch(() => {});
      }
    }

    return NextResponse.json({ status: "pending", message: "รอการโอน..." });
  } catch (err: any) {
    console.error("[topup-poll] error:", err.message);
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}