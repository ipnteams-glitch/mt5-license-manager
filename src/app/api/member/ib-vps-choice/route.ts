import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getMemberByEmail, setIbVpsChoice } from "@/lib/supabase";

// POST /api/member/ib-vps-choice  { choice: "1" | "2" }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { choice } = await req.json();
    if (choice !== "1" && choice !== "2") {
      return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
    }

    const member = await getMemberByEmail(session.user.email);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    await setIbVpsChoice(session.user.email, choice);

    // Notify Telegram
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      const label = choice === "1" ? "ตั้งค่า EA เอง" : "ตั้งค่าอัตโนมัติ";
      const emoji = choice === "1" ? "⚙️" : "🤖";
      const detail = choice === "1" ? "ลูกค้าจะตั้งค่า EA เองทั้งหมด" : "ลูกค้าจะตั้งค่าผ่านหน้าเว็บทั้งหมดและไม่สามารถเข้าใช้งาน VPS ได้เอง";
      const msg = `${emoji} <b>${label}</b>\n👤 ${session.user.email}\n\n${detail}`;
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, choice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}