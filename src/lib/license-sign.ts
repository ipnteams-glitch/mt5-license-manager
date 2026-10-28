// ── License response signing (ECDSA P-256) ──
// EA ฝัง public key ไว้ verify. ที่นี่เซ็นด้วย private key คู่กัน เพื่อกัน server ปลอม.
//
// Env var (Vercel): LIC_PRIV_PEM = private key PEM ทั้งก้อน (รวม -----BEGIN/END EC PRIVATE KEY-----)
//   public key คู่กันถูกฝังในตัว EA แล้ว (LIC_PUB_X / LIC_PUB_Y)
//
// Canonical message ที่เซ็น: `${account}|${expiry_date}`
//   - account     = เลข login (string ตัวเลข ตามที่ query ส่งมา)
//   - expiry_date = ค่าเดียวกับ field expiry_date ใน response เป๊ะ (เช่น "2026-12-31", "2099-12-31", "LifeTime", "")
// Signature: raw r||s 64 ไบต์ (ieee-p1363) → base64  (ตรงกับ BCryptVerifySignature ฝั่ง EA)

import crypto from "crypto";

let cachedKey: crypto.KeyObject | null = null;

function getPrivKey(): crypto.KeyObject | null {
  if (cachedKey) return cachedKey;
  const pem = process.env.LIC_PRIV_PEM;
  if (!pem) {
    console.warn("[license-sign] LIC_PRIV_PEM not set — responses will be unsigned");
    return null;
  }
  try {
    cachedKey = crypto.createPrivateKey(pem);
    return cachedKey;
  } catch (e) {
    console.error("[license-sign] bad LIC_PRIV_PEM:", e);
    return null;
  }
}

// คืน signature base64 ของ `${account}|${expiryDate}` ; คืน "" ถ้าไม่มี key (EA จะเข้าโหมด soft)
export function signLicense(account: string, expiryDate: string): string {
  const key = getPrivKey();
  if (!key) return "";
  const msg = `${account}|${expiryDate}`;
  const sig = crypto.sign("sha256", Buffer.from(msg, "utf8"), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return sig.toString("base64");
}
