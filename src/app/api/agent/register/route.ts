// POST /api/agent/register — สมัครตัวแทน (ต้อง login ก่อน)
import { auth } from "@/lib/auth";
import { getAgentByEmail, getAgentByCode } from "@/lib/supabase";
import { supabase } from "@/lib/supabase-client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "กรุณาล็อคอิน" }, { status: 401 });

  try {
    const { name, agent_code, parent_code, bank_name, bank_account } = await req.json();
    if (!name || !agent_code) return NextResponse.json({ error: "กรุณากรอกชื่อและรหัสตัวแทน" }, { status: 400 });

    // Check not already an agent
    const existing = await getAgentByEmail(session.user.email);
    if (existing) return NextResponse.json({ error: "คุณเป็นตัวแทนอยู่แล้ว" }, { status: 409 });

    // Check agent_code uniqueness
    const codeCheck = await getAgentByCode(agent_code);
    if (codeCheck) return NextResponse.json({ error: "รหัสตัวแทนนี้มีคนใช้แล้ว" }, { status: 409 });

    // Validate parent if provided
    if (parent_code) {
      const parent = await getAgentByCode(parent_code);
      if (!parent) return NextResponse.json({ error: "ไม่พบรหัสผู้แนะนำ" }, { status: 400 });
    }

    // ponytail: locked rates for self-registered agents
    const agent = {
      agent_code: agent_code.toUpperCase(),
      name,
      email: session.user.email,
      discount_percent: 0,
      commission_percent: 10,
      discount_vps_percent: 0,
      commission_vps_percent: 5,
      commission_earned: 0,
      commission_paid: 0,
      parent_code: parent_code || null,
      bank_name: bank_name || "",
      bank_account: bank_account || "",
    };

    const { error } = await supabase.from("agents").insert(agent);
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "รหัสตัวแทนนี้มีคนใช้แล้ว" }, { status: 409 });
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, agent_code: agent.agent_code });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
