import { NextResponse } from "next/server";
import { getPaymentById, markPaymentPaid, markPaymentFailed, getMemberByEmail, updateMemberPackage } from "@/lib/sheets";
import { canUpgrade, calculateNewExpiry } from "@/lib/sheets";
import { PACKAGES } from "@/types";
import { sendPaymentSuccessEmail } from "@/lib/mail";

// POST /api/telegram-webhook
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const cb = body.callback_query;
    if (!cb?.data) return NextResponse.json({ ok: true });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return NextResponse.json({ ok: true });

    const [action, txnId] = cb.data.split("|");
    const msg = cb.message;
    const chatId = msg?.chat?.id;

    if (!txnId || !chatId) {
      await answerCallback(botToken, cb.id, "\u274c \u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07");
      return NextResponse.json({ ok: true });
    }

    const payment = await getPaymentById(txnId);

    if (!payment) {
      await answerCallback(botToken, cb.id, "\u274c \u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e19\u0e35\u0e49");
      return NextResponse.json({ ok: true });
    }

    if (payment.status === "paid") {
      await answerCallback(botToken, cb.id, "\u2705 \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e19\u0e35\u0e49\u0e44\u0e14\u0e49\u0e23\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e44\u0e1b\u0e41\u0e25\u0e49\u0e27");
      await removeKeyboard(botToken, chatId, msg.message_id);
      return NextResponse.json({ ok: true });
    }

    if (payment.status === "failed") {
      await answerCallback(botToken, cb.id, "\u274c \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e19\u0e35\u0e49\u0e16\u0e39\u0e01\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e44\u0e1b\u0e41\u0e25\u0e49\u0e27");
      await removeKeyboard(botToken, chatId, msg.message_id);
      return NextResponse.json({ ok: true });
    }

    // หยุด loading spinner ทันที
    await answerCallback(botToken, cb.id, "");

    // ประมวลผลเบื้องหลัง
    processCallback(botToken, chatId, msg.message_id, action, txnId, payment.email, payment.package).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return NextResponse.json({ ok: true });
  }
}

async function processCallback(
  botToken: string,
  chatId: number,
  messageId: number,
  action: string,
  txnId: string,
  email: string,
  pkg: string,
) {
  const label = action === "approve" ? "\u2705 \u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e41\u0e25\u0e49\u0e27" : "\u274c \u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e41\u0e25\u0e49\u0e27";

  if (action === "approve") {
    await markPaymentPaid(txnId);
    const member = await getMemberByEmail(email);
    let expiryDate = "";
    if (member) {
      const isExpired = member.expiry_date ? new Date(member.expiry_date) <= new Date() : false;
      const { allowed } = canUpgrade(member.package, pkg as any, isExpired);
      if (allowed) {
        const { expiry, maxPorts } = calculateNewExpiry(member, pkg as any);
        await updateMemberPackage(email, pkg as any, maxPorts, expiry);
        expiryDate = expiry;
      }
    }
    if (member && expiryDate) {
      const pkgInfo = PACKAGES[pkg as keyof typeof PACKAGES];
      sendPaymentSuccessEmail(email, member.name, pkgInfo.label, expiryDate).catch(() => {});
    }
  } else if (action === "cancel") {
    await markPaymentFailed(txnId);
  }

  await editMessage(botToken, chatId, messageId, label);
  await removeKeyboard(botToken, chatId, messageId);
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

async function removeKeyboard(token: string, chatId: number, messageId: number) {
  await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  }).catch(() => {});
}
