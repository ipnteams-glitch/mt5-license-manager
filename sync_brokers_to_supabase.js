// ponytail: sync brokers.json → Supabase brokers table (replace-all).
// Called from brokerupdate_push.bat after brokerupdate.py writes brokers.json.

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// ── parse .env.local (ponytail: manual, no dotenv dep) ──
const envPath = path.join(__dirname, ".env.local");
const envRaw = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envRaw.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const brokers = JSON.parse(fs.readFileSync(path.join(__dirname, "brokers.json"), "utf-8"));
  if (!Array.isArray(brokers) || brokers.length === 0) {
    console.error("ERROR: brokers.json is empty or invalid");
    process.exit(1);
  }

  // ponytail: delete all + batch insert — no FK constraints on brokers table
  const { error: delErr } = await supabase.from("brokers").delete().neq("broker", "");
  if (delErr) { console.error("Delete failed:", delErr.message); process.exit(1); }

  const rows = brokers.map(b => ({ broker: b }));
  const { error: insErr } = await supabase.from("brokers").insert(rows);
  if (insErr) { console.error("Insert failed:", insErr.message); process.exit(1); }

  console.log(`brokers table synced: ${brokers.length} brokers`);
  for (const b of brokers) console.log(`  ${b}`);
}

main().catch(err => { console.error(err); process.exit(1); });
