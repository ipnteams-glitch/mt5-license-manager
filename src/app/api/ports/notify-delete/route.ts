import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/ports/notify-delete — notify admin to close terminal
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { account, vps_id } = await req.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (token && chatId) {
      const msg = `🗑 <b>Port Removed</b>\n\nUser: ${session.user.email}\nAccount: <code>${account}</code>\nVPS: ${vps_id || "?"}\n\n🔧 Please close terminal on VPS`;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
