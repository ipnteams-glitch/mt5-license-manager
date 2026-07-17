// /agent — Agent Dashboard (server component)
import { auth } from "@/lib/auth";
import { getAgentByEmail, getPaymentsByAgentCode } from "@/lib/supabase";
import { PACKAGES } from "@/types";
import { redirect } from "next/navigation";
import AgentClient from "./AgentClient";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  let agent = await getAgentByEmail(session.user.email);
  if (!agent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="rounded-xl bg-white p-8 shadow-lg text-center">
          <p className="text-lg font-semibold text-zinc-700">คุณไม่ใช่ตัวแทน</p>
          <p className="mt-2 text-sm text-zinc-500">อีเมล {session.user.email} ไม่พบในระบบตัวแทน</p>
          <a href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline text-sm">← กลับ Dashboard</a>
        </div>
      </div>
    );
  }

  const sales = await getPaymentsByAgentCode(agent.agent_code);
  // ponytail: reconcile commission_earned from payments (handles agent re-add after deletion)
  const { reconcileAgentCommission } = await import("@/lib/supabase");
  await reconcileAgentCommission(agent.agent_code);
  // ponytail: re-read agent after reconcile
  const refreshed = await getAgentByEmail(session.user.email);
  if (refreshed) agent = refreshed;
  const pending = agent.commission_earned - agent.commission_paid;

  // Enrich sales with package labels
  const enrichedSales = sales.map(s => ({
    ...s,
    package_label: PACKAGES[s.package]?.name || s.package,
    paid_at: s.paid_at || "",
  }));

  return (
    <AgentClient
      agent={agent}
      sales={enrichedSales}
      pendingCommission={pending}
    />
  );
}