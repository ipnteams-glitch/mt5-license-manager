// GET /api/payment/crypto-poll — poll ทุก 3 วิ ตรวจสอบการโอนคริปโต
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  getCryptoPaymentById,
  getPendingCryptoPayments,
  approveCryptoPaymentAndUpgrade,
} from "@/lib/crypto-payments";
import { fetchRecentTransfers, fifoMatchPayments } from "@/lib/crypto-verify";
import type { CryptoNetwork } from "@/types";
import { notifyCryptoPayment } from "@/lib/notify";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  const url = new URL(req.url);
  const paymentId = url.searchParams.get("payment_id");
  if (!paymentId)
    return NextResponse.json({ error: "ต้องระบุ payment_id" }, { status: 400 });

  try {
    const payment = await getCryptoPaymentById(paymentId);
    if (!payment)
      return NextResponse.json({ status: "not_found", message: "ไม่พบรายการ" });
    if (payment.email !== session.user.email)
      return NextResponse.json({ status: "unauthorized", message: "ไม่ใช่รายการของคุณ" });
    if (payment.status === "paid")
      return NextResponse.json({ status: "paid", message: "ชำระแล้ว" });
    if (payment.status === "failed")
      return NextResponse.json({ status: "failed", message: "รายการถูกยกเลิก" });

    // Check expiry
    const expiresAt = new Date(payment.created_at).getTime() + 30 * 60 * 1000;
    if (Date.now() > expiresAt)
      return NextResponse.json({ status: "expired", message: "หมดเวลา — กรุณาสร้างรายการใหม่" });

    // Fetch recent transfers
    const sinceTs = new Date(payment.created_at).getTime();
    const transfers = await fetchRecentTransfers(
      payment.network as CryptoNetwork,
      payment.wallet_address,
      sinceTs,
    );

    // Get all pending payments for this wallet FIFO matching
    const allPending = await getPendingCryptoPayments();
    const networkPending = allPending.filter(
      (p) => p.network === payment.network && p.wallet_address === payment.wallet_address,
    );

    const matches = fifoMatchPayments(
      networkPending.map((p) => ({
        id: p.id,
        amount_usdt: p.amount_usdt,
        network: p.network as CryptoNetwork,
        created_at: p.created_at,
      })),
      transfers,
    );

    // Find match for this specific payment
    const myMatch = matches.find((m) => m.paymentId === paymentId);

    if (myMatch && myMatch.status === "paid") {
      // Auto-approve!
      try {
        const result = await approveCryptoPaymentAndUpgrade(paymentId);
        return NextResponse.json({
          status: "paid",
          message: "✅ ชำระสำเร็จ",
          package: result.packageLabel,
          expiry_date: result.expiryDate,
        });
      } catch (e: any) {
        console.error("[crypto-poll] approve failed:", e.message);
        // Fallback: notify admin
        await notifyCryptoPayment(
          payment.email,
          payment.package,
          payment.amount_usdt,
          payment.network,
          paymentId,
          myMatch.txid,
          "paid",
        ).catch(() => {});
        return NextResponse.json({
          status: "paid_unconfirmed",
          message: "ตรวจพบการโอน — รอแอดมินยืนยัน",
        });
      }
    }

    if (myMatch && myMatch.status === "mismatch") {
      return NextResponse.json({
        status: "mismatch",
        message: "ยอดเงินไม่ตรง",
        expected: payment.amount_usdt,
        received: myMatch.actualAmount,
        txid: myMatch.txid,
      });
    }

    return NextResponse.json({ status: "pending", message: "รอการโอน..." });
  } catch (err: any) {
    console.error("[crypto-poll] error:", err.message);
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
