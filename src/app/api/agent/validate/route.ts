// GET /api/agent/validate?code=XXX — ตรวจสอบโค้ดตัวแทน + คำนวณส่วนลด
import { getAgentByCode } from "@/lib/sheets";
import { PACKAGES } from "@/types";
import type { PackageType } from "@/types";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const pkg = searchParams.get("package") as PackageType | null;

  if (!code || !code.trim()) {
    return NextResponse.json({ valid: false, reason: "กรุณากรอกโค้ดตัวแทน" });
  }

  try {
    const agent = await getAgentByCode(code.trim());
    if (!agent) {
      return NextResponse.json({ valid: false, reason: "ไม่พบโค้ดตัวแทนนี้" });
    }

    const response: any = {
      valid: true,
      agent_code: agent.agent_code,
      agent_name: agent.name,
      discount_percent: agent.discount_percent,
    };

    // ถ้ามี package → คำนวณราคาหลังหักส่วนลด
    if (pkg && PACKAGES[pkg]) {
      const originalPrice = PACKAGES[pkg].price;
      const discountedPrice = Math.round(originalPrice * (1 - agent.discount_percent / 100));
      const commission = Math.round(discountedPrice * (agent.commission_percent / 100) * 100) / 100;
      response.original_price = originalPrice;
      response.discounted_price = discountedPrice;
      response.commission = commission;
    }

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json({ valid: false, reason: err.message }, { status: 500 });
  }
}
