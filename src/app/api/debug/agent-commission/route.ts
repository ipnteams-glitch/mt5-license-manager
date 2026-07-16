// GET /api/debug/agent-commission?txn_id=xxx — แสดงข้อมูลดิบของ payment และ agent
import { auth } from "@/lib/auth";
import { getPaymentById } from "@/lib/sheets";
import { getAllAgents } from "@/lib/sheets";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const txnId = searchParams.get("txn_id");
  const agentCode = searchParams.get("agent_code");

  const result: any = {};

  if (txnId) {
    const payment = await getPaymentById(txnId);
    result.payment = payment ? {
      id: payment.id,
      email: payment.email,
      package: payment.package,
      amount: payment.amount,
      status: payment.status,
      agent_code: payment.agent_code,
      agent_commission: payment.agent_commission,
    } : null;
  }

  if (agentCode) {
    const agents = await getAllAgents();
    const agent = agents.find(a => a.agent_code.toLowerCase() === agentCode.toLowerCase());
    result.agent = agent ? {
      agent_code: agent.agent_code,
      name: agent.name,
      commission_earned: agent.commission_earned,
      commission_paid: agent.commission_paid,
      pending: agent.commission_earned - agent.commission_paid,
    } : null;
  }

  return NextResponse.json(result);
}
