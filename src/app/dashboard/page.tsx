import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMemberByEmail, getPortsByEmail, getAllPayments } from "@/lib/sheets";
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
    member = await getMemberByEmail(session.user.email);
    ports = await getPortsByEmail(session.user.email);
    const allPayments = await getAllPayments();
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
      max_ports: 0,
      expiry_date: "",
      role: "user",
      created_at: "",
    };
  }

  const pkgInfo = PACKAGES[member.package] || PACKAGES.none;
  const portsUsed = ports.length;
  const portsTotal = member.max_ports;

  // คำนวณวันหมดอายุ
  let daysLeft = 0;
  let isExpired = false;
  if (member.expiry_date) {
    const expiry = new Date(member.expiry_date);
    const now = new Date();
    daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    isExpired = daysLeft <= 0;
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
      pendingPayments={pendingPayments}
      paymentHistory={paymentHistory}
    />
  );
}
