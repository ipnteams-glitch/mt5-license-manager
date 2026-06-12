import { auth } from "@/lib/auth";
import { getPortsByEmail, getPortSystems, setPortSystems } from "@/lib/sheets";
import { NextResponse } from "next/server";

// GET  /api/ports/systems?port_id=xxx
// POST /api/ports/systems

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const portId = searchParams.get("port_id");
  if (!portId) {
    return NextResponse.json({ error: "Missing port_id" }, { status: 400 });
  }

  try {
    const ports = await getPortsByEmail(session.user.email);
    const port = ports.find((p) => p.id === portId);
    if (!port) {
      return NextResponse.json({ error: "Port not found" }, { status: 404 });
    }

    const ps = await getPortSystems(portId);
    return NextResponse.json({
      systems: ps?.systems || "",
      updated_at: ps?.updated_at || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { port_id, systems } = body;

    if (!port_id) {
      return NextResponse.json({ error: "Missing port_id" }, { status: 400 });
    }
    if (typeof systems !== "string") {
      return NextResponse.json({ error: "systems must be a string" }, { status: 400 });
    }

    const ports = await getPortsByEmail(session.user.email);
    const port = ports.find((p) => p.id === port_id);
    if (!port) {
      return NextResponse.json({ error: "Port not found" }, { status: 404 });
    }

    // Validate: Sys_1,Sys_3 (1-20)
    const items = systems.split(",").map(s => s.trim()).filter(Boolean);
    const validPattern = /^Sys_\d+$/;
    for (const item of items) {
      if (!validPattern.test(item)) {
        return NextResponse.json({ error: `Invalid: "${item}"` }, { status: 400 });
      }
      const n = parseInt(item.split("_")[1]);
      if (n < 1 || n > 20) {
        return NextResponse.json({ error: `Out of range: ${item}` }, { status: 400 });
      }
    }

    const result = await setPortSystems(
      session.user.email,
      port_id,
      port.mt5_account,
      items.join(","),
    );

    return NextResponse.json({ success: true, systems: result.systems });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
