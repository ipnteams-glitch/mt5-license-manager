// /api/agent/manage — admin: CRUD agents + mark commission paid
import { auth } from "@/lib/auth";
import { getAllAgents, saveAgent, deleteAgent, markAgentCommissionPaid, getAgentByCode, createWithdrawal, getWithdrawals, getAllWithdrawals, markWithdrawalPaid, getAgentByEmail } from "@/lib/sheets";
import type { Agent } from "@/types";
import { NextResponse } from "next/server";

async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.email === "ipnteams@gmail.com";
}

// GET — list all agents (admin only)
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const agents = await getAllAgents();
    return NextResponse.json({ agents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create or update agent
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, ...agentData } = body;
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ── Agent self-service: withdraw commission ──
    if (action === "withdraw") {
      const agent = await getAgentByEmail(session.user.email);
      if (!agent) return NextResponse.json({ error: "Not an agent" }, { status: 403 });
      const amount = Number(body.amount);
      if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      const wd = await createWithdrawal(agent, amount);
      return NextResponse.json({ success: true, withdrawal: wd });
    }

    // ── Agent self-service: list own withdrawals ──
    if (action === "list_withdrawals" && !body.agent_code) {
      const agent = await getAgentByEmail(session.user.email);
      if (!agent) return NextResponse.json({ error: "Not an agent" }, { status: 403 });
      const wds = await getWithdrawals(agent.agent_code);
      return NextResponse.json({ withdrawals: wds });
    }

    // ── Admin-only actions below ──
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // ponytail: mark_paid, mark_withdrawal_paid, list_withdrawals (admin view), CRUD — admin only

    if (action === "mark_paid") {
      if (!body.agent_code) return NextResponse.json({ error: "ต้องระบุ agent_code" }, { status: 400 });
      await markAgentCommissionPaid(body.agent_code);
      return NextResponse.json({ success: true });
    }

    // ponytail: admin viewing specific agent's withdrawals
    if (action === "list_withdrawals" && body.agent_code) {
        if (!body.agent_code) return NextResponse.json({ error: "Missing agent_code" }, { status: 400 });
        const wds = await getWithdrawals(body.agent_code);
        return NextResponse.json({ withdrawals: wds });
    }

    if (action === "mark_withdrawal_paid") {
      if (!body.withdrawal_id) return NextResponse.json({ error: "Missing withdrawal_id" }, { status: 400 });
      await markWithdrawalPaid(body.withdrawal_id);
      return NextResponse.json({ success: true });
    }

    // Create/update agent
    if (!body.agent_code || !body.name || !body.email) {
      return NextResponse.json({ error: "ต้องระบุ agent_code, name, email" }, { status: 400 });
    }

    const agent: Agent = {
      agent_code: body.agent_code.trim(),
      name: body.name.trim(),
      email: body.email.trim(),
      discount_percent: Number(body.discount_percent) || 0,
      commission_percent: Number(body.commission_percent) || 0,
      discount_vps_percent: Number(body.discount_vps_percent) || 0,
      commission_vps_percent: Number(body.commission_vps_percent) || 0,
      commission_earned: Number(body.commission_earned) || 0,
      commission_paid: Number(body.commission_paid) || 0,
      created_at: body.created_at || new Date().toISOString(),
      bank_name: body.bank_name || "",
      bank_account: body.bank_account || "",
    };

    await saveAgent(agent);
    return NextResponse.json({ success: true, agent });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove agent
export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) return NextResponse.json({ error: "ต้องระบุ agent_code" }, { status: 400 });
    await deleteAgent(code);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}