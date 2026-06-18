import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMemberByEmail, getPortsByEmail, getAllPayments, deletePort, updateMemberPackage } from "@/lib/sheets";
import { invalidateCache } from "@/lib/cache";
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
  const portsTotal = member.max_ports > 0 ? member.max_ports : 1;

  // คำนวณวันหมดอายุ
  let daysLeft = 0;
  let isExpired = false;
  if (member.expiry_date) {
    const expiry = new Date(member.expiry_date);
    const now = new Date();
    daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    isExpired = daysLeft <= 0;
  }

  // Auto-reset expired members to free tier (keep only first port)
  if (isExpired && member.package !== "none" && member.package !== "free" && member.package !== "free_ib") {
    try {
      // Sort ports by created_at, keep only the first (oldest)
      const sortedPorts = [...ports].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const portsToDelete = sortedPorts.slice(1); // all except first

      if (portsToDelete.length > 0) {
        for (const p of portsToDelete) {
          try {
            await deletePort(p.id, session.user!.email);
          } catch {}
        }
        // Reset to free tier: 1 port, no expiry
        await updateMemberPackage(session.user!.email, "none", 1, "");
        invalidateCache("members");
        invalidateCache("ports");

        // Refresh ports
        ports = await getPortsByEmail(session.user!.email);
        member.package = "none";
        member.max_ports = 1;
        member.expiry_date = "";
        isExpired = false;
        daysLeft = 0;

        // Telegram notify
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (token && chatId) {
          const deletedAccounts = portsToDelete.map(p => p.mt5_account).join(", ");
          const msg = `⏰ <b>Package Expired - Reset to Free</b>\n👤 ${session.user!.email}\n🗑 Deleted ports: ${deletedAccounts}\n✅ Kept: ${sortedPorts[0].mt5_account}\n📦 Reset to Free (1 port)`;
          fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error("Auto-reset failed:", e);
    }
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  const isAdmin = adminEmails.includes(session.user.email);

  return (
    <DashboardClient
      member={member}
      ports={ports}
      portsUsed={portsUsed}
      portsTotal={portsTotal}
      packageLabel={pkgInfo.label}
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