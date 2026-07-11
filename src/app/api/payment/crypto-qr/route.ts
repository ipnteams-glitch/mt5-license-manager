// POST /api/payment/crypto-qr — สร้างรายการชำระคริปโต + คืน wallet address
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { PACKAGES, BUYABLE_PACKAGES, TEST_PACKAGES, CRYPTO_NETWORK_INFO } from "@/types";
import type { PackageType, CryptoNetwork } from "@/types";
import { createCryptoPayment } from "@/lib/crypto-payments";
import { getMemberByEmail, canUpgrade } from "@/lib/sheets";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  try {
    const { package: pkg, network } = await req.json();

    if (!BUYABLE_PACKAGES.includes(pkg as PackageType) && !TEST_PACKAGES.includes(pkg as PackageType)) {
      return NextResponse.json({ error: "แพคเกจไม่ถูกต้อง" }, { status: 400 });
    }

    // Test package — เฉพาะ ipnteams@gmail.com
    if (TEST_PACKAGES.includes(pkg as PackageType) && session.user.email !== "ipnteams@gmail.com") {
      return NextResponse.json({ error: "แพคเกจนี้สำหรับทดสอบเท่านั้น" }, { status: 403 });
    }

    const validNetworks: CryptoNetwork[] = ["trc20", "bep20", "erc20"];
    const net: CryptoNetwork = validNetworks.includes(network) ? network : "trc20";

    const pkgInfo = PACKAGES[pkg as PackageType];
    const member = await getMemberByEmail(session.user.email);
    if (!member) return NextResponse.json({ error: "ไม่พบสมาชิก" }, { status: 404 });

    // Check upgrade permission
    const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;
    const { allowed, reason } = canUpgrade(member.package, pkg as PackageType, isExpired);
    if (!allowed) return NextResponse.json({ error: reason }, { status: 400 });

    // Get wallet address from env
    const walletEnvKey = `CRYPTO_WALLET_USDT_${net.toUpperCase()}`;
    const walletAddress = process.env[walletEnvKey];
    if (!walletAddress) {
      return NextResponse.json({ error: `ยังไม่ได้ตั้งค่า ${walletEnvKey} ใน ENV` }, { status: 500 });
    }

    // Fetch THB/USD exchange rate
    let rateThbUsd = 35.0; // fallback
    try {
      const rateRes = await fetch("https://api.exchangerate-api.com/v4/latest/THB");
      const rateData = await rateRes.json();
      rateThbUsd = rateData.rates?.USD || 35.0;
    } catch {
      console.error("[crypto-qr] exchange rate fetch failed, using fallback");
    }

    // Calculate USDT amount (USDT ≈ USD)
    const amountUsdt = Math.round((pkgInfo.price / rateThbUsd) * 100) / 100;

    // Create payment
    const payment = await createCryptoPayment(
      session.user.email,
      pkg as PackageType,
      pkgInfo.price,
      amountUsdt,
      net,
      walletAddress,
      rateThbUsd,
    );

    const networkInfo = CRYPTO_NETWORK_INFO.find((n) => n.key === net);

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      wallet_address: walletAddress,
      amount_thb: pkgInfo.price,
      amount_usdt: amountUsdt,
      network: net,
      network_label: networkInfo?.label || net,
      network_fee: networkInfo?.fee || "",
      rate_thb_usd: rateThbUsd,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(walletAddress)}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
