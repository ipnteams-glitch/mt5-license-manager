export async function notifyNewPayment(email: string, packageName: string, amount: number, txnId: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;
  try {
    const text = `💰 ลูกค้ารออนุมัติ\n👤 ${email}\n📦 ${packageName}\n💵 ${amount.toFixed(2)} บาท`;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ อนุมัติ", callback_data: `approve|${txnId}` },
            { text: "❌ ยกเลิก", callback_data: `cancel|${txnId}` },
          ]],
        },
      }),
    });
  } catch (e) {
    console.error("Notify failed:", e);
  }
}

export async function notifySlipUpload(
  email: string,
  packageName: string,
  amount: number,
  txnId: string,
  slipBase64: string,
  ocrAmount?: number | null,
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  try {
    let caption = `📎 อัปโหลดสลิป\n👤 ${email}\n📦 ${packageName}\n💵 ${amount.toFixed(2)} บาท`;
    if (ocrAmount !== null && ocrAmount !== undefined) {
      caption += `\n🤖 OCR: ${ocrAmount.toFixed(2)} บาท ✅`;
    } else {
      caption += `\n⚠️ OCR ไม่สำเร็จ — ตรวจสอบด้วยตา`;
    }
    caption += `\n🔑 ${txnId.slice(0, 8)}...`;

    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append(
      "photo",
      new Blob([Buffer.from(slipBase64, "base64")], { type: "image/png" }),
      "slip.png",
    );
    formData.append("caption", caption);
    formData.append(
      "reply_markup",
      JSON.stringify({
        inline_keyboard: [
          [
            { text: "✅ อนุมัติ", callback_data: `approve|${txnId}` },
            { text: "❌ ยกเลิก", callback_data: `cancel|${txnId}` },
          ],
        ],
      }),
    );

    await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      body: formData,
    });
  } catch (e) {
    console.error("Notify slip upload failed:", e);
  }
}
