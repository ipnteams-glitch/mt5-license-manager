import { auth } from "@/lib/auth";
import { getPortsByEmail, getPortSystems } from "@/lib/sheets";
import { NextResponse } from "next/server";

// GET /api/ports/status — status of all user ports (for dashboard)
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ports = await getPortsByEmail(session.user.email);
    const result = [];
    for (const port of ports) {
      const ps = await getPortSystems(port.mt5_account);
      result.push({
        mt5_account: port.mt5_account,
        broker: port.mt5_broker,
        systems: ps?.systems || "",
        status: ps?.status || "pending",
        vps_id: ps?.vps_id || "",
        heartbeat: ps?.heartbeat || "",
      });
    }
    return NextResponse.json({ ports: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
