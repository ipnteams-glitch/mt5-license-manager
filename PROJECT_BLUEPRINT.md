# MT5 License Manager — Project Blueprint

> Last updated: 2026-07-16
> Purpose: Complete reference for future migration to Supabase (or any SQL backend)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    Next.js 16 (App Router)            │
│                                                      │
│  Pages (SSR with force-dynamic):                     │
│    /              → Landing (Google Sign-in)          │
│    /login         → Sign-in page                      │
│    /dashboard     → User dashboard (ports, payments)  │
│    /admin         → Admin panel (all management)      │
│    /agent         → Agent dashboard (commissions)     │
│    /renew         → Package purchase (PromptPay QR)   │
│    /renewcrypto   → Package purchase (Crypto USDT)    │
│    /portfolio     → Portfolio viewer (public-ish)     │
│                                                      │
│  External Services:                                  │
│    Google Sheets  → Primary database                 │
│    Google OAuth   → Authentication (Gmail only)      │
│    Google Drive   → EA version tracking              │
│    EasySlip API   → PromptPay QR generation          │
│    Telegram Bot   → Admin notifications              │
│    Gmail (SMTP)   → Customer emails                  │
│    TronGrid/BscScan/Etherscan → Crypto verification  │
└──────────────────────────────────────────────────────┘
```

---

## 2. Data Model (Google Sheets → Supabase)

### 2.1 `members`

| Column | Type | Notes |
|--------|------|-------|
| email | text (PK) | Gmail only |
| name | text | |
| package | text | PackageType enum |
| max_ports | int | |
| expiry_date | ISO text | |
| role | text | user/admin |
| created_at | ISO text | |
| addon_ib_vps_expiry | ISO text | optional |
| ib_vps_choice | text | "1"/"2" |

### 2.2 `ports`

| Column | Type |
|--------|------|
| id | uuid (PK) |
| member_email | FK→members |
| mt5_account | text |
| mt5_broker | text |
| status | text (active/removed) |
| created_at | ISO |

### 2.3 `payments`

| Column | Type |
|--------|------|
| id | uuid (PK) |
| email | FK→members |
| package | text |
| amount | numeric (THB) |
| satang | numeric |
| status | text (pending/paid/failed) |
| created_at | ISO |
| paid_at | ISO |
| qr_payload | text |
| agent_code | FK→agents (optional) |
| agent_commission | numeric |

### 2.4 `agents`

| Column | Type |
|--------|------|
| agent_code | text (PK) |
| name | text |
| email | text |
| discount_percent | numeric |
| commission_percent | numeric |
| discount_vps_percent | numeric |
| commission_vps_percent | numeric |
| commission_earned | numeric |
| commission_paid | numeric |
| created_at | ISO |
| bank_name | text |
| bank_account | text |

### 2.5 `agent_withdrawals`

| Column | Type |
|--------|------|
| id | uuid (PK) |
| agent_code | FK→agents |
| amount | numeric |
| status | text (pending/paid) |
| bank_name | text |
| bank_account | text |
| created_at | ISO |
| paid_at | ISO |

### 2.6 `crypto_wallets` / `crypto_topups` / `portfolio` / `whitelist` / `brokers` / `port_systems`

(see full blueprint in source)

---

## 3. Package Types & Pricing

```
none:         0 THB,  0d,  0 ports
free_ib:      0 THB,  ∞,   ∞ ports  (Lifetime + IB)
free:         0 THB, 14d,  5 ports  (post-expiry: 1 port permanent)
test_1:       1 THB,  3d,  3 ports
1000_2m:    299 THB, 30d,  2 ports  (was 990)
2490_3m:    990 THB, 60d,  5 ports  (was 3900)
3900_6m:   2590 THB, 180d, 10 ports  (was 5900)
4900_1y:   5900 THB, 365d, 15 ports  (was 15900)
ib_vps_2200:2500 THB, 365d, ∞ ports  (VPS addon)
live_with_us:9900 THB, ∞,   ∞ ports  (was 24900)
```

---

## 4. Critical Business Flows

### 4.1 Payment (PromptPay QR)
```
User → select package → POST /api/payment/qr → QR generated
User pays → slip uploaded / EasySlip webhook
Admin approve → /api/payment/admin-verify → package upgraded
If agent_code → addAgentCommission()
```

### 4.2 Payment (Crypto USDT)
```
User → select package → POST /api/crypto/topup → wallet address
User sends USDT → client polls every 10s
Blockchain check via TronGrid/BscScan/Etherscan
Balance credited → purchasePackage() → deducts + upgrades
```

### 4.3 Agent Commission
```
Customer uses agent_code → payment.agent_commission = price × commission%
Admin approves → addAgentCommission(code, commission) → earned += commission
Agent visits /agent → sees available = earned - paid - pending withdrawals
Agent clicks withdraw → createWithdrawal(agent, amount)
  → validates: amount ≤ earned - paid - SUM(pending withdrawals)
  → creates agent_withdrawals row (status: pending)
Admin sees pending → markWithdrawalPaid(wdId)
  → withdrawal.status = "paid", agent.commission_paid += amount
```

### 4.4 Commission Reconciliation
When agent deleted then re-added:
- On /agent page load → reconcileAgentCommission(code)
  → earned = SUM(payments.agent_commission) where paid
  → paid = SUM(agent_withdrawals.amount) where status=paid

### 4.5 Port Verification (EA License)
```
GET /api/verify-port?account=X&name=Y&broker=Z
→ Check whitelist first (bypass all limits)
→ Find port by account number
→ Check member package, expiry, port quota
→ Post-expiry: port index 0 gets permanent free access
```

---

## 5. API Routes Summary

| Route | Auth | Purpose |
|-------|------|---------|
| GET /api/agent/manage | Admin | List agents |
| POST /api/agent/manage | Agent/Admin | withdraw, list_withdrawals, mark_paid, mark_withdrawal_paid, CRUD |
| DELETE /api/agent/manage | Admin | Delete agent |
| GET /api/agent/validate | Public | Validate agent code |
| GET /api/approve | Public | Terms text |
| GET /api/brokers | Public | Broker list |
| POST /api/crypto/topup | User | Create topup |
| POST /api/crypto/topup-poll | User | Poll for transfer |
| POST /api/crypto/purchase | User | Buy with balance |
| GET /api/crypto/balance | User | Wallet balance |
| GET /api/ea-version | Public | EA version from Drive |
| POST /api/payment/qr | User | Generate QR |
| POST /api/payment/verify | Public | EasySlip verify |
| POST /api/payment/admin-verify | Admin | Manual approve |
| POST /api/payment/upload-slip | User | Upload slip |
| GET/POST/DELETE /api/portfolio | User/Public | Portfolio CRUD |
| GET/POST /api/ports | User | Port CRUD |
| GET /api/verify-port | Public | EA license check |
| POST /api/admin/members | Admin | Update member |
| POST/DELETE /api/admin/whitelist | Admin | Whitelist CRUD |

---

## 6. Changes History (2026-07-16)

1. **Fix: agent withdrawal blocked** — Moved isAdmin guard after agent self-service actions
2. **Refresh button** — Added to admin page header
3. **Merge 3 withdrawal buttons** — Single button: fetch + toggle
4. **Remove mark_paid bypass** — Admin must go through withdrawal flow
5. **Fix double-withdraw** — Subtract pending withdrawals from available balance
6. **Gray→black text** — All admin panel text on white backgrounds → black
7. **Confirm delete agent** — window.confirm before deletion
8. **Reconcile commission on load** — Auto-recover after agent deletion + re-add
9. **Reconcile both earned AND paid** — Was only reconciling earned
10. **Fix pending withdrawal table colors**
11. **Fix agent withdrawal history amount color**
12. **Show pending only when withdrawal exists** — Don't distract admin

---

## 7. Color Convention

> White background + gray text → black text

- Body text: `text-black`
- Placeholder/empty: `text-black/50`
- Status: `text-green-600` / `text-red-500` / `text-amber-600`
- Links: `text-blue-600`
- Disabled: `text-black disabled:opacity-40`

---

## 8. Supabase Migration Notes

### What to replace:
- `sheets.ts` (50KB) → Supabase client queries
- `crypto-wallets.ts` → SQL + Supabase queries
- `cache.ts` → Redis or remove (Postgres is fast)
- Manual UUID → `gen_random_uuid()` default
- ISO strings → `timestamptz`

### Key queries to rewrite:
```
getAllMembers()     → SELECT * FROM members
getMemberByEmail()  → SELECT * WHERE email = $1
getPortsByEmail()   → SELECT * FROM ports WHERE member_email = $1
getPaymentsByAgent  → SELECT * FROM payments WHERE agent_code = $1 AND status = 'paid'
findPortByAccount() → SELECT * FROM ports WHERE mt5_account = $1
```

### RLS policies needed:
- Users read/write own data
- Admin read/write all
- Agents read own agent row + their referrals
- Public read for verify-port, ea-version, brokers

### Migration order:
1. Create Supabase schema
2. Export Sheets → CSV → import
3. Replace sheets.ts with Supabase client
4. Add RLS
5. Remove googleapis dependency
6. Test all flows
7. Deploy
