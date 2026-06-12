import { auth } from "@/lib/auth";
import { getPortsByEmail } from "@/lib/sheets";
import { NextResponse } from "next/server";

// VPS Python test-login server
const VPS_TEST_LOGIN_URL = process.env.VPS_TEST_LOGIN_URL || "http://165.154.247.243:5001/test-login";

// POST /api/ports/test-login
// Proxy: web app → VPS Python server → MT5 login test
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { account, broker, password } = body;

    if (!account || !password) {
      return NextResponse.json(
        { success: false, error: "Missing account or password" },
        { status: 400 }
      );
    }

    // Verify port belongs to user
    const ports = await getPortsByEmail(session.user.email);
    const port = ports.find((p) => p.mt5_account === account);
    if (!port) {
      return NextResponse.json(
        { success: false, error: "Port not found or not yours" },
        { status: 404 }
      );
    }

    // Forward to VPS Python server
    console.log(`[test-login] Forwarding to VPS: account=${account}, broker=${broker}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const vpsRes = await fetch(VPS_TEST_LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account,
        password,
        broker: broker || "",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await vpsRes.json();
    console.log(`[test-login] VPS response:`, data);

    return NextResponse.json(data);
  } catch (err: any) {
    if (err.name === "AbortError") {
      return NextResponse.json(
        { success: false, error: "VPS timeout (30s) — server may be down" },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { success: false, error: `VPS unreachable: ${err.message}` },
      { status: 502 }
    );
  }
}
