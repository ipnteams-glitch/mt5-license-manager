"""sync_brokers_to_supabase.py

Sync brokers.json -> Supabase `brokers` table (replace-all).
Python port of sync_brokers_to_supabase.js (no Node.js dependency).
Called from brokerupdate_push.bat after brokerupdate.py writes brokers.json.
"""
import json
import sys
from pathlib import Path

import requests

HERE = Path(__file__).parent


def load_env(path):
    """Minimal .env parser (no python-dotenv dependency)."""
    env = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("#"):
            continue
        eq = trimmed.find("=")
        if eq == -1:
            continue
        env[trimmed[:eq].strip()] = trimmed[eq + 1:].strip()
    return env


def main():
    env = load_env(HERE / ".env.local")
    url = env.get("SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local")
        sys.exit(1)

    brokers = json.loads((HERE / "brokers.json").read_text(encoding="utf-8"))
    if not isinstance(brokers, list) or len(brokers) == 0:
        print("ERROR: brokers.json is empty or invalid")
        sys.exit(1)

    rest = url.rstrip("/") + "/rest/v1/brokers"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    # delete all rows (match every row: broker != sentinel that never exists)
    # mirrors the .js: .delete().neq("broker", "") — no FK constraints on brokers
    del_resp = requests.delete(
        rest,
        headers={**headers, "Prefer": "return=minimal"},
        params={"broker": "neq.__delete_all_sentinel__"},
        timeout=30,
    )
    if del_resp.status_code >= 300:
        print(f"Delete failed: {del_resp.status_code} {del_resp.text}")
        sys.exit(1)

    # batch insert
    rows = [{"broker": b} for b in brokers]
    ins_resp = requests.post(
        rest,
        headers={**headers, "Prefer": "return=minimal"},
        data=json.dumps(rows),
        timeout=30,
    )
    if ins_resp.status_code >= 300:
        print(f"Insert failed: {ins_resp.status_code} {ins_resp.text}")
        sys.exit(1)

    print(f"brokers table synced: {len(brokers)} brokers")
    for b in brokers:
        print(f"  {b}")


if __name__ == "__main__":
    main()
