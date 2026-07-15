// GET /api/agent/validate?code=XXX&package=YYY
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

    const isVps = pkg === "ib_vps_2200";
    const discountPct = isVps ? agent.discount_vps_percent : agent.discount_percent;
    const commissionPct = isVps ? agent.commission_vps_percent : agent.commission_percent;

    const response: any = {
      valid: true,
      agent_code: agent.agent_code,
      agent_name: agent.name,
      discount_percent: discountPct,
      // also return raw values for UI display
      discount_pkg_percent: agent.discount_percent,
      discount_vps_percent: agent.discount_vps_percent,
      commission_pkg_percent: agent.commission_percent,
      commission_vps_percent: agent.commission_vps_percent,
    };

    if (pkg && PACKAGES[pkg]) {
      const originalPrice = PACKAGES[pkg].price;
      const discountedPrice = Math.round(originalPrice * (1 - discountPct / 100));
      const commission = Math.round(discountedPrice * (commissionPct / 100) * 100) / 100;
      response.original_price = originalPrice;
      response.discounted_price = discountedPrice;
      response.commission = commission;
    }

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json({ valid: false, reason: err.message }, { status: 500 });
  }
}
