// POST /api/crypto/topup — สร้างคำขอเติมเงิน + คืน QR
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { CryptoNetwork } from "@/types";
import { CRYPTO_NETWORK_INFO } from "@/types";
import { createTopup } from "@/lib/crypto-wallets";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  try {
    const { network } = await req.json();
    const validNetworks: CryptoNetwork[] = ["trc20", "bep20", "erc20"];
    const net: CryptoNetwork = validNetworks.includes(network) ? network : "trc20";

    const walletEnvKey = `CRYPTO_WALLET_USDT_${net.toUpperCase()}`;
    const walletAddress = process.env[walletEnvKey];
    if (!walletAddress) return NextResponse.json({ error: `ยังไม่ได้ตั้งค่า ${walletEnvKey}` }, { status: 500 });

    const topup = await createTopup(session.user.email, net, walletAddress);
    const networkInfo = CRYPTO_NETWORK_INFO.find(n => n.key === net);

    return NextResponse.json({
      success: true,
      topup_id: topup.id,
      wallet_address: walletAddress,
      network: net,
      network_label: networkInfo?.label || net,
      network_fee: networkInfo?.fee || "",
      expires_at: topup.expires_at,
      qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(walletAddress)}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
