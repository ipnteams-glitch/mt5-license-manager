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
    // Check port_systems FIRST (before verifying port ownership)
    const ps = await getPortSystems(account);

    // If already owned by someone else → block
    if (ps && ps.member_email !== session.user.email) {
      return NextResponse.json({
        systems: "",
        updated_at: ps.updated_at,
        owned_by_other: true,
        owner_email: ps.member_email,
      });
    }

    // If owned by current user → return systems + multiplier
    if (ps && ps.member_email === session.user.email) {
      return NextResponse.json({
        systems: ps.systems,
        multiplier: ps.multiplier || "1.0",
        password: ps.password || "",
        broker: ps.broker || "",
        updated_at: ps.updated_at,
        owned_by_other: false,
        owner_email: null,
      });
    }

    // Not in port_systems → verify port belongs to user
    const ports = await getPortsByEmail(session.user.email);
    const port = ports.find((p) => p.mt5_account === account);
    if (!port) {
      return NextResponse.json({ error: "Port not found" }, { status: 404 });
    }

    return NextResponse.json({
      systems: "",
      multiplier: "1.0",
      password: "",
      broker: "",
      updated_at: null,
      owned_by_other: false,
      owner_email: null,
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
    const { account, systems, password, broker, multiplier } = body;

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

    // Get existing state BEFORE saving (for change detection)
    const existing = await getPortSystems(account);
    const oldSystems = existing?.systems || "";
    const oldMultiplier = existing?.multiplier || "1.0";
    const portIsActive = port.status === "active";

    const result = await setPortSystems(
      session.user.email,
      port.id,
      account,
      items.join(","),
      password || undefined,
      broker || undefined,
      multiplier || undefined,
    );

    // Notify Telegram if port is active & something changed
    if (portIsActive && existing) {
      const newSystems = items.join(",") || "(none)";
      const newMultiplier = multiplier || "1.0";
      const systemsChanged = oldSystems !== newSystems;
      const multiplierChanged = oldMultiplier !== newMultiplier;

      if (systemsChanged || multiplierChanged) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (token && chatId) {
          let msg = `⚙️ <b>ปรับตั้งค่า Sys</b>\n👤 ${session.user.email}\n📊 ${account}`;
          if (systemsChanged) {
            msg += `\n🔄 Sys: <code>${oldSystems || "(none)"}</code> → <code>${newSystems}</code>`;
          }
          if (multiplierChanged) {
            msg += `\n✖️ ตัวคูณ: ${oldMultiplier} → ${newMultiplier}`;
          }
          fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: msg,
              parse_mode: "HTML",
            }),
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({ success: true, systems: result.systems });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}