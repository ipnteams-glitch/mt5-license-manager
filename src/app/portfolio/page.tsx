import { redirect } from "next/navigation";

// หน้า Portfolio เดิมถูกซ่อนไว้ชั่วคราว (ย้ายไปที่ https://thaifxbook.com แล้ว)
// เข้ามาที่ /portfolio จะถูกส่งกลับไปที่ /dashboard
// โค้ด UI เดิมยังอยู่ครบใน ./PortfolioClient.tsx และโค้ด server เดิมอยู่ด้านล่างนี้ (คอมเมนต์ไว้)
// หากต้องการเปิดใช้อีกครั้ง: ลบ redirect ด้านล่าง แล้วคืนค่าฟังก์ชันจากบล็อกคอมเมนต์
export default function PortfolioPage() {
  redirect("/dashboard");
}

/* --- โค้ดเดิม (ปิดใช้งานชั่วคราว) ---
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPortfolioByEmail } from "@/lib/supabase";
import type { PortfolioAccount } from "@/types";
import PortfolioClient from "./PortfolioClient";

export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  let accounts: PortfolioAccount[] = [];
  try {
    accounts = await getPortfolioByEmail(session.user.email);
  } catch (e) {
    console.error("Portfolio fetch failed:", e);
  }

  return <PortfolioClient initialAccounts={accounts} />;
}
--- จบโค้ดเดิม --- */