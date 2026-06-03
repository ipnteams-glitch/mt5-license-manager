// สร้าง PromptPay QR Payload ตามมาตรฐาน EMVCo

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

export function generatePromptPayPayload(phone: string, amount: number): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const phoneNo = cleanPhone.startsWith("0")
    ? "0066" + cleanPhone.slice(1)
    : cleanPhone;

  const phoneLen = phoneNo.length.toString().padStart(2, "0");
  const phoneTag = `01${phoneLen}${phoneNo}`;

  const amountStr = amount.toFixed(2);
  const amountLen = amountStr.length.toString().padStart(2, "0");
  const amountTag = `54${amountLen}${amountStr}`;

  const payload =
    "000201" +
    "010211" +
    "29370016A000000677010111" +
    phoneTag +
    "5303764" +
    amountTag +
    "5802TH" +
    "6304";

  return payload + crc16(payload);
}
