import { supabase } from "@/lib/supabase-client";
import { sendBackupEmail } from "@/lib/mail";
import { NextResponse } from "next/server";

// Daily backup of members and their purchased rights, plus the ports and
// payments needed to restore them. Triggered by Vercel Cron (see vercel.json)
// at 17:00 UTC = 00:00 Asia/Bangkok. Emails a JSON snapshot to the admins.
//
// Protected by CRON_SECRET: Vercel automatically sends it as a Bearer token on
// scheduled invocations. Set CRON_SECRET in the Vercel project env.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  // ── auth ──
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    // ── pull the tables that hold customer rights ──
    const [members, ports, payments] = await Promise.all([
      supabase.from("members").select("*").order("created_at"),
      supabase.from("ports").select("*").order("created_at"),
      supabase.from("payments").select("*").order("created_at"),
    ]);

    for (const [name, res] of [["members", members], ["ports", ports], ["payments", payments]] as const) {
      if (res.error) throw new Error(`${name}: ${res.error.message}`);
    }

    const now = new Date();
    const stamp = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const snapshot = {
      generated_at: now.toISOString(),
      counts: {
        members: members.data?.length || 0,
        ports: ports.data?.length || 0,
        payments: payments.data?.length || 0,
      },
      members: members.data || [],
      ports: ports.data || [],
      payments: payments.data || [],
    };

    const json = JSON.stringify(snapshot, null, 2);

    // ── recipients: ADMIN_EMAILS, fall back to EMAIL_USER ──
    const recipients = (process.env.ADMIN_EMAILS || process.env.EMAIL_USER || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (recipients.length === 0) throw new Error("no backup recipients configured");

    const permanent = (members.data || []).filter((m: { legacy_free_port?: boolean }) => m.legacy_free_port === true).length;
    const html = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
  <h2 style="color:#333">🗄️ MT5 License Manager — Daily Backup</h2>
  <p style="color:#555">Snapshot taken ${now.toISOString()}</p>
  <ul style="color:#333;font-size:14px;line-height:1.8">
    <li>Members: <b>${snapshot.counts.members}</b> (legacy permanent-port: ${permanent})</li>
    <li>Ports: <b>${snapshot.counts.ports}</b></li>
    <li>Payments: <b>${snapshot.counts.payments}</b></li>
  </ul>
  <p style="color:#999;font-size:12px">
    Full snapshot attached as JSON. To restore, re-insert the rows from the
    attachment into the matching tables.
  </p>
</div>`;

    await sendBackupEmail(
      recipients,
      `🗄️ License backup ${stamp} — ${snapshot.counts.members} members`,
      html,
      [{ filename: `license-backup-${stamp}.json`, content: json, contentType: "application/json" }]
    );

    return NextResponse.json({ ok: true, counts: snapshot.counts, recipients: recipients.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Backup cron failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
