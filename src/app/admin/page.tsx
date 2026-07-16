import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllMembers, getAllPorts, getAllPayments, getAllWhitelist, getAllAgents } from "@/lib/sheets";
import type { Member, Port, Payment, Agent } from "@/types";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(session.user.email)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-800">⛔ Access Denied</h1>
          <p className="mt-2 text-zinc-500">Admins only</p>
          <a href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  let members: Member[] = [];
  let ports: Port[] = [];
  let payments: Payment[] = [];
  let whitelist: { name: string; broker: string; created_at: string }[] = [];
  let agents: Agent[] = [];
  try {
    members = await getAllMembers();
    ports = await getAllPorts();
    payments = await getAllPayments();
    whitelist = await getAllWhitelist();
    agents = await getAllAgents();
  } catch (e) {
    console.error("Admin fetch failed:", e);
  }

  return <AdminClient members={members} ports={ports} payments={payments} whitelist={whitelist} agents={agents} />;
}