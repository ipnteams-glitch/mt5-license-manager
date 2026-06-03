import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

export async function sendPaymentSuccessEmail(
  to: string,
  name: string,
  packageLabel: string,
  expiryDate: string
) {
  const html = `
<div style="font-family:'Kanit',sans-serif;max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">✅ ต่ออายุสำเร็จ</h1>
  </div>
  <div style="padding:24px">
    <p style="color:#333;font-size:16px">สวัสดีคุณ <b>${name}</b>,</p>
    <p style="color:#555;font-size:14px;line-height:1.8">
      การต่ออายุแพคเกจของคุณสำเร็จแล้ว 🎉<br><br>
      📦 <b>แพคเกจ:</b> ${packageLabel}<br>
      📅 <b>หมดอายุ:</b> ${new Date(expiryDate).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="https://mt5-license-manager.vercel.app/dashboard" 
         style="background:#667eea;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">
        🔐 ไปที่ Dashboard
      </a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;border-top:1px solid #eee;padding-top:16px">
      MT5 License Manager · ติดต่อแอดมินหากมีข้อสงสัย
    </p>
  </div>
</div>`;

  try {
    await transporter.sendMail({
      from: `"MT5 License Manager" <${process.env.EMAIL_USER}>`,
      to,
      subject: `✅ ต่ออายุสำเร็จ — ${packageLabel}`,
      html,
    });
  } catch (e) {
    console.error("Email send failed:", e);
  }
}
