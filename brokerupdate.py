"""brokerupdate.py - Read brokers from Google Sheet and write brokers.json"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SERVICE_ACCOUNT = str(Path(__file__).parent / "service-account.json")
SPREADSHEET_ID = "1co6w0n2TJNgM5Vz2oitX9P2nR_1NWK4hlxyxzmiWSHg"
BROKERS_SHEET = "brokers"
OUTPUT = Path(__file__).parent / "brokers.json"

def main():
    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT, scopes=SCOPES)
    svc = build("sheets", "v4", credentials=creds)
    r = svc.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{BROKERS_SHEET}!A:A"
    ).execute()
    rows = r.get("values", [])
    brokers = [row[0] for row in rows[1:] if row and row[0]] if len(rows) > 1 else []
    if not brokers:
        print("No brokers found!")
        sys.exit(1)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(brokers, f, indent=2)
    print(f"brokers.json updated: {len(brokers)} brokers")
    for b in brokers:
        print(f"  {b}")

if __name__ == "__main__":
    main()
