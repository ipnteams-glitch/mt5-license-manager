import { NextResponse } from "next/server";

// Server-side proxy to the farm Apps Script web app.
// Browsers hit the Apps Script /exec with the user's Google cookies, so Google
// routes the <script> JSONP through /macros/u/<n>/ and signed-in accounts that
// don't own the script get a Drive "can't open file" page -> JSONP fails.
// Fetching from the server carries no Google cookies (like curl) -> always the
// anonymous web-app output. We return plain JSON with CORS for the portfolio.

export const dynamic = "force-dynamic";

const WEBAPP =
  "https://script.google.com/macros/s/AKfycbxItPJzoxblYkX6lTbnYZGGsIW42RAcyWR1gNgQQANhG3zAhyf9HqQadi3ja3Mjj4l_/exec";

const ALLOW = new Set([
  "https://www.forexcool.com",
  "https://forexcool.com",
  "https://ipnteams-glitch.github.io",
]);
const MODES = new Set(["overview", "mine", "shared", "clear", "view"]);

function cors(origin: string | null): Record<string, string> {
  const o = origin && ALLOW.has(origin) ? origin : "https://www.forexcool.com";
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

export async function GET(req: Request) {
  const h = cors(req.headers.get("origin"));
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "";
  if (!MODES.has(mode)) {
    return NextResponse.json({ error: "bad mode" }, { status: 400, headers: h });
  }

  const qs = new URLSearchParams({ mode });
  for (const k of ["token", "login", "s", "email"]) {
    const v = searchParams.get(k);
    if (v) qs.set(k, v);
  }

  try {
    const r = await fetch(`${WEBAPP}?${qs.toString()}`, { redirect: "follow", cache: "no-store" });
    const text = await r.text();
    return new NextResponse(text, {
      status: 200,
      headers: { ...h, "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "proxy_failed" }, { status: 502, headers: h });
  }
}
