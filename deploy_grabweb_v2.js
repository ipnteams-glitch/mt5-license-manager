// Deploy Grabweb.mqh v2 to all MT5 terminals
// Changes:
//   1. Try DIRECT (clean VPS, no proxy) FIRST, fallback PRE_CONFIG (IE proxy)
//   2. SECURITY_FLAG_IGNORE_UNKNOWN_CA — bypass old VPS cert stores
//   3. NULL check after InternetOpenUrlW — prevent crash
//   4. Detailed error codes (12007=DNS, 12029=Connect, 12045=CA)

const fs = require("fs");
const path = require("path");

const SOURCE = "C:\\Users\\GRAM\\CascadeProjects\\mt5-license-manager\\Grabweb.mqh";
const BASE = "C:\\Users\\GRAM\\AppData\\Roaming\\MetaQuotes\\Terminal";

if (!fs.existsSync(SOURCE)) {
  console.log("ERROR: Source not found: " + SOURCE);
  process.exit(1);
}

const srcContent = fs.readFileSync(SOURCE, "utf8");

let deployed = 0;
let skipped = 0;

const dirs = fs.readdirSync(BASE);

for (const dir of dirs) {
  const termDir = path.join(BASE, dir);
  if (!fs.statSync(termDir).isDirectory()) continue;

  const targets = [
    path.join(termDir, "MQL5", "Include", "Grabweb.mqh"),
    path.join(termDir, "MQL5", "SourceCode GoldScalping", "Include", "Grabweb.mqh"),
  ];

  for (const t of targets) {
    if (!fs.existsSync(path.dirname(t))) continue;

    // Check if already v2 (has DIRECT-first pattern)
    if (fs.existsSync(t)) {
      const old = fs.readFileSync(t, "utf8");
      if (old.includes("hSession(true)") && old.includes("hSession(false)") &&
          old.includes("errDirect") && old.includes("err == 12007") &&
          old.includes("HTTP fallback")) {
        console.log("SKIP (v2): " + t);
        skipped++;
        continue;
      }
    }

    fs.writeFileSync(t, srcContent, "utf8");
    console.log("DEPLOYED: " + t);
    deployed++;
  }
}

console.log("\nDone. Deployed: " + deployed + ", Skipped: " + skipped);
