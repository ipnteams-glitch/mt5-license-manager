import { auth } from "@/lib/auth";
import { addWhitelist, removeWhitelist } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
  if (!admins.includes(s.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, broker } = await req.json();
  if (!name || !broker) return NextResponse.json({ error: "Missing" }, { status: 400 });
  await addWhitelist(name, broker);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await auth();
  if (!s?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
  if (!admins.includes(s.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const idx = parseInt(new URL(req.url).searchParams.get("idx") || "-1");
  if (idx < 0) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await removeWhitelist(idx);
  return NextResponse.json({ ok: true });
}