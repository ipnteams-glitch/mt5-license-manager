// /api/agent/manage — admin: CRUD agents + mark commission paid
import { auth } from "@/lib/auth";
import { getAllAgents, saveAgent, deleteAgent, markAgentCommissionPaid, getAgentByCode } from "@/lib/sheets";
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
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const body = await req.json();
    const { action, ...agentData } = body;

    if (action === "mark_paid") {
      if (!body.agent_code) return NextResponse.json({ error: "ต้องระบุ agent_code" }, { status: 400 });
      await markAgentCommissionPaid(body.agent_code);
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
      commission_earned: Number(body.commission_earned) || 0,
      commission_paid: Number(body.commission_paid) || 0,
      created_at: body.created_at || new Date().toISOString(),
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
