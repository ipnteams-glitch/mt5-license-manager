export async function notifyNewPayment(email: string, packageName: string, amount: number) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;
  try {
    const text = `💰 ลูกค้ารออนุมัติ\n👤 ${email}\n📦 ${packageName}\n💵 ${amount.toFixed(2)} บาท`;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (e) {
    console.error("Notify failed:", e);
  }
}
