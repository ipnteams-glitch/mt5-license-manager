import { NextResponse } from "next/server";
import { getPaymentById, markPaymentFailed, approvePaymentAndUpgrade } from "@/lib/sheets";
import { sendPaymentSuccessEmail } from "@/lib/mail";
import { retry } from "@/lib/retry";
import { notifyVpsOrder } from "@/lib/notify";

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

    if (!payment || payment.status === "paid" || payment.status === "failed") {
      const label = !payment
        ? "\u274c \u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e19\u0e35\u0e49"
        : payment.status === "paid"
        ? "\u2705 \u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e41\u0e25\u0e49\u0e27"
        : "\u274c \u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e41\u0e25\u0e49\u0e27";

      await answerCallback(botToken, cb.id, label);
      await editMessage(botToken, chatId, msg.message_id, label);
      await removeKeyboard(botToken, chatId, msg.message_id);
      return NextResponse.json({ ok: true });
    }

    // Answer callback immediately to prevent Telegram timeout
    await answerCallback(botToken, cb.id, "\u23f3 \u0e01\u0e33\u0e25\u0e31\u0e07\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23...");

    // ดำเนินการแบบ async (callback already answered)
    let label = "";
    try {
      if (action === "approve") {
        const result = await retry(
          () => approvePaymentAndUpgrade(txnId),
          "approvePaymentAndUpgrade",
          3,
        );
        sendPaymentSuccessEmail(
          result.memberEmail, result.memberName,
          result.packageLabel, result.expiryDate,
        ).catch(() => {});
        // Notify admin to create VPS for ib_vps_2200 orders
        if (payment.package === "ib_vps_2200") {
          notifyVpsOrder(
            result.memberEmail, result.memberName,
            result.packageLabel, result.expiryDate,
            txnId,
          ).catch(() => {});
        }
        label = "\u2705 \u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e41\u0e25\u0e49\u0e27";
      } else {
        await retry(() => markPaymentFailed(txnId), "markPaymentFailed", 3);
        label = "\u274c \u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e41\u0e25\u0e49\u0e27";
      }
    } catch (err: any) {
      console.error(`[webhook] failed: ${err.message}`);
      label = action === "approve"
        ? "\u274c \u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08 \u0e01\u0e14\u0e43\u0e2b\u0e21\u0e48\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07"
        : "\u274c \u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08 \u0e01\u0e14\u0e43\u0e2b\u0e21\u0e48\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07";
    }

    // Update message with final result (callback already answered)
    await editMessage(botToken, chatId, msg.message_id, label);
    await removeKeyboard(botToken, chatId, msg.message_id);

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
  // Try editMessageText first (text messages); fallback to editMessageCaption (photo messages)
  const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text }),
  }).catch(() => null);
  if (!res || !res.ok) {
    await fetch(`https://api.telegram.org/bot${token}/editMessageCaption`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, caption: text }),
    }).catch(() => {});
  }
}

async function removeKeyboard(token: string, chatId: number, messageId: number) {
  await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  }).catch(() => {});
}