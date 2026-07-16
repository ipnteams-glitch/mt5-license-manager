import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMemberByEmail, getPortsByEmail, getAllPayments } from "@/lib/supabase";
import { PACKAGES } from "@/types";
import type { Member, Port, Payment } from "@/types";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  let member: Member | null = null;
  let ports: Port[] = [];
  let pendingPayments: Payment[] = [];
  let paymentHistory: Payment[] = [];

  try {
    const [memberResult, portsResult, allPayments] = await Promise.all([
      getMemberByEmail(session.user.email),
      getPortsByEmail(session.user.email),
      getAllPayments(),
    ]);
    member = memberResult;
    ports = portsResult;
    const userPayments = allPayments.filter((p) => p.email === session.user!.email);
    pendingPayments = userPayments
      .filter((p) => p.status === "pending")
      .slice(0, 5); // เอา 5 รายการล่าสุด
    paymentHistory = userPayments
      .filter((p) => p.status !== "pending")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20); // ประวัติล่าสุด 20 รายการ
  } catch (e) {
    console.error("Dashboard fetch failed:", e);
  }

  if (!member) {
    // Member ควรถูกสร้างตอน signIn แล้ว — ถ้าไม่เจอ แสดงว่ามีปัญหา
    member = {
      email: session.user.email,
      name: session.user.name || "",
      package: "none",
      max_ports: 1,
      expiry_date: "",
      role: "user",
      created_at: "",
      addon_ib_vps_expiry: "",
      ib_vps_choice: "",
    };
  }

  const pkgInfo = PACKAGES[member.package] || PACKAGES.none;
  const portsUsed = ports.length;
  // คำนวณวันหมดอายุ
  let daysLeft = 0;
  let isExpired = false;
  if (member.expiry_date) {
    const expiry = new Date(member.expiry_date);
    const now = new Date();
    daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    isExpired = daysLeft <= 0;
  }

  // ── ทุกแพคเกจหลังหมดอายุ: เหลือ 1 port ถาวร ──
  let portsTotal = member.max_ports > 0 ? member.max_ports : 1;
  let packageLabel = pkgInfo.label;
  if (isExpired && member.package !== "free_ib" && member.package !== "live_with_us") {
    portsTotal = 1;
    packageLabel = pkgInfo.name + " — หมดอายุ\nเหลือ 1 พอร์ตถาวร (ต่ออายุเพื่อเพิ่มพอร์ต)";
  }



  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  const isAdmin = adminEmails.includes(session.user.email);

  return (
    <DashboardClient
      member={member}
      ports={ports}
      portsUsed={portsUsed}
      portsTotal={portsTotal}
      packageLabel={packageLabel}
      daysLeft={daysLeft}
      isExpired={isExpired}
      isAdmin={isAdmin}
      addonIbVpsExpiry={member?.addon_ib_vps_expiry || ""}
      ibVpsChoice={member?.ib_vps_choice || ""}
      pendingPayments={pendingPayments}
      paymentHistory={paymentHistory}
    />
  );
}