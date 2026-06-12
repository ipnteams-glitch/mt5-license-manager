import { auth } from "@/lib/auth";
import { getPortsByEmail, getPortSystems, setPortSystems } from "@/lib/sheets";
import { NextResponse } from "next/server";

// GET  /api/ports/systems?account=12345678
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const account = searchParams.get("account");
  if (!account) {
    return NextResponse.json({ error: "Missing account" }, { status: 400 });
  }

  try {
    const ports = await getPortsByEmail(session.user.email);
    const port = ports.find((p) => p.mt5_account === account);
    if (!port) {
      return NextResponse.json({ error: "Port not found" }, { status: 404 });
    }

    const ps = await getPortSystems(account);
    return NextResponse.json({
      systems: ps?.systems || "",
      updated_at: ps?.updated_at || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/ports/systems  { account, systems }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { account, systems } = body;

    if (!account) {
      return NextResponse.json({ error: "Missing account" }, { status: 400 });
    }
    if (typeof systems !== "string") {
      return NextResponse.json({ error: "systems must be a string" }, { status: 400 });
    }

    const ports = await getPortsByEmail(session.user.email);
    const port = ports.find((p) => p.mt5_account === account);
    if (!port) {
      return NextResponse.json({ error: "Port not found" }, { status: 404 });
    }

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
      port.id,
      account,
      items.join(","),
    );

    return NextResponse.json({ success: true, systems: result.systems });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
