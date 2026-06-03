import { NextResponse } from "next/server";
import { getPaymentById, markPaymentPaid, markPaymentFailed, getMemberByEmail, updateMemberPackage } from "@/lib/sheets";
import { canUpgrade, calculateNewExpiry } from "@/lib/sheets";
import { PACKAGES } from "@/types";

// POST /api/telegram-webhook — รับ callback จาก Telegram Bot
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // เฉพาะ callback_query (ปุ่มถูกกด)
    const cb = body.callback_query;
    if (!cb?.data) return NextResponse.json({ ok: true });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return NextResponse.json({ ok: true });

    const [action, txnId] = cb.data.split("|");
    const msg = cb.message;
    const chatId = msg?.chat?.id;

    if (!txnId || !chatId) {
      await answerCallback(botToken, cb.id, "❌ ข้อมูลไม่ถูกต้อง");
      return NextResponse.json({ ok: true });
    }

    const payment = await getPaymentById(txnId);
    if (!payment || payment.status !== "pending") {
      await answerCallback(botToken, cb.id, "❌ รายการนี้ถูกดำเนินการแล้ว");
      await editMessage(botToken, chatId, msg.message_id, msg.text + "\n\n✅ ดำเนินการแล้ว");
      return NextResponse.json({ ok: true });
    }

    if (action === "approve") {
      // อนุมัติการจ่าย
      await markPaymentPaid(txnId);
      const member = await getMemberByEmail(payment.email);
      if (member) {
        const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;
        const { allowed } = canUpgrade(member.package, payment.package, isExpired);
        if (allowed) {
          const { expiry, maxPorts } = calculateNewExpiry(member, payment.package);
          await updateMemberPackage(payment.email, payment.package, maxPorts, expiry);
        }
      }
      const newText = `✅ อนุมัติแล้ว\n${msg.text}`;
      await editMessage(botToken, chatId, msg.message_id, newText);
      await answerCallback(botToken, cb.id, "✅ อนุมัติสำเร็จ");
    } else if (action === "cancel") {
      // ยกเลิก
      await markPaymentFailed(txnId);
      const newText = `❌ ยกเลิกแล้ว\n${msg.text}`;
      await editMessage(botToken, chatId, msg.message_id, newText);
      await answerCallback(botToken, cb.id, "❌ ยกเลิกแล้ว");
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return NextResponse.json({ ok: true });
  }
}

async function answerCallback(token: string, callbackId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text, show_alert: false }),
  }).catch(() => {});
}

async function editMessage(token: string, chatId: number, messageId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text }),
  }).catch(() => {});
}
