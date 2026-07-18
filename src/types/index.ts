// ── Member (สมาชิก) ──
export interface Member {
  email: string;
  name: string;
  package: PackageType;
  max_ports: number;
  expiry_date: string;
  role: "user" | "admin";
  created_at: string;
  addon_ib_vps_expiry?: string;
  ib_vps_choice?: string;
}

// ── Port (พอร์ต MT5) ──
export interface Port {
  id: string;
  member_email: string;
  mt5_account: string;
  mt5_broker: string;
  status: "active" | "removed";
  created_at: string;
}

// ── Payment Transaction ──
export interface Payment {
  id: string;
  email: string;
  package: PackageType;
  amount: number;
  satang: number;
  status: "pending" | "paid" | "failed";
  created_at: string;
  paid_at?: string;
  qr_payload?: string;
  agent_code?: string;
  agent_commission?: number;
}

// ── Agent (ตัวแทนขาย) ──
export interface Agent {
  agent_code: string;
  name: string;
  email: string;
  discount_percent: number;
  commission_percent: number;
  discount_vps_percent: number;
  commission_vps_percent: number;
  commission_earned: number;
  commission_paid: number;
  created_at: string;
  bank_name: string;
  bank_account: string;
  parent_code?: string | null;  // ponytail: MLM upline
}

// ── Agent Withdrawal (ถอนค่าคอม) ──
export interface AgentWithdrawal {
  id: string;
  agent_code: string;
  amount: number;
  status: "pending" | "paid";
  bank_name: string;
  bank_account: string;
  created_at: string;
  paid_at?: string;
}

// ── Package Types ──
export type PackageType = "free" | "free_ib" | "test_1" | "1000_2m" | "2490_3m" | "3900_6m" | "4900_1y" | "ib_vps_2200" | "live_with_us" | "none";

export interface PackageInfo {
  key: PackageType;
  name: string;
  name_en: string;
  price: number;
  duration_days: number;
  max_ports: number;
  label: string;
  old_price?: number;
  rank: number;
}

export const PACKAGES: Record<PackageType, PackageInfo> = {
  none: {
    key: "none", name: "ไม่มีแพคเกจ", name_en: "None", price: 0, duration_days: 0, max_ports: 0,
    label: "No Package", rank: 0,
  },
  free_ib: {
    key: "free_ib", name: "⭐ ฟรี+IB", name_en: "Free+IB", price: 0, duration_days: 99999, max_ports: 999,
    label: "⭐ Free + IB Lifetime (Unlimited)", rank: -1,
  },
  free: {
    key: "free", name: "ฟรี", name_en: "Free", price: 0, duration_days: 30, max_ports: 5,
    label: "ฟรี 5 พอร์ต 14 วัน\nหลังหมดอายุเหลือ 1 พอร์ตถาวร", rank: 1,
  },
  test_1: {
    key: "test_1", name: "ทดสอบ", name_en: "Test", price: 1, duration_days: 3, max_ports: 3,
    label: "🧪 1 THB / 3 Days", rank: 2,
  },
  "1000_2m": {
    key: "1000_2m", name: "Basic", name_en: "Basic", price: 299, duration_days: 30, max_ports: 2,
    label: "Any Broker | 30Day", rank: 4,
    old_price: 990,
  },
  "2490_3m": {
    key: "2490_3m", name: "Premium", name_en: "Premium", price: 990, duration_days: 60, max_ports: 5,
    label: "60day | Any Broker", rank: 6,
    old_price: 3900,
  },
  "3900_6m": {
    key: "3900_6m", name: "6Month", name_en: "6Month", price: 2590, duration_days: 180, max_ports: 10,
    label: "180 Day | Any Broker", rank: 5,
    old_price: 5900,
  },
  "4900_1y": {
    key: "4900_1y", name: "💎 VIP", name_en: "VIP", price: 5900, duration_days: 365, max_ports: 15,
    label: "Any Broker | 1 Year", rank: 7,
    old_price: 15900,
  },
  ib_vps_2200: {
    key: "ib_vps_2200", name: "Private VPS", name_en: "Private VPS", price: 2500, duration_days: 365, max_ports: 999,
    label: "vCPU 2 / RAM 4GB / 1 Year\nOnly VIP | Life | IB", rank: 8,
  },
  live_with_us: {
    key: "live_with_us", name: "💎 LifeTime", name_en: "LifeTime", price: 9900, duration_days: 99999, max_ports: 999,
    label: "Lifetime | Any Broker", rank: 9,
    old_price: 24900,
  },
};

// ── Portfolio (MyPortfolio) ──
export interface PortfolioAccount {
  id: string;
  member_email: string;
  mt5_account: string;
  broker: string;
  balance: number;
  floating_pl: number;
  total_profit: number;
  last_updated: string;
  created_at: string;
}

export const BUYABLE_PACKAGES: PackageType[] = ["free", "1000_2m", "3900_6m", "live_with_us", "ib_vps_2200"];

export const TEST_PACKAGES: PackageType[] = ["test_1"];

// ── API Responses ──
export interface VerifyPortResponse {
  valid: boolean;
  email?: string;
  package?: string;
  expiry_date?: string;
  days_left?: number;
  reason?: string;
}

export interface DashboardData {
  member: Member;
  ports: Port[];
  ports_used: number;
  ports_total: number;
  package_label: string;
  days_left: number;
  is_expired: boolean;
  ib_vps_choice?: string;
}

export interface QrResponse {
  qr_base64: string;
  amount: number;
  satang: number;
  txn_id: string;
  expires_at: string;
}

export interface VerifyResponse {
  success: boolean;
  message: string;
  package?: string;
  expiry_date?: string;
}

// ── Port Systems (OneComplete) ──
export interface PortSystem {
  id: string;
  port_id: string;
  member_email: string;
  mt5_account: string;
  systems: string;
  password?: string;
  broker?: string;
  multiplier?: string;
  vps_id?: string;
  status?: string;
  heartbeat?: string;
  updated_at: string;
  created_at: string;
}

export const ALL_SYSTEMS: string[] = Array.from(
  { length: 20 },
  (_, i) => `Sys_${i + 1}`
);

// ── Crypto ──
export type CryptoNetwork = "trc20" | "bep20" | "erc20";

export const USDT_CONTRACTS: Record<CryptoNetwork, string> = {
  trc20: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  bep20: "0x55d398326f99059fF775485246999027B3197955",
  erc20: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
};

export const CRYPTO_NETWORK_INFO: { key: CryptoNetwork; label: string; fee: string; explorer: string; decimals: number }[] = [
  { key: "trc20", label: "TRC-20", fee: "~$1", explorer: "https://tronscan.org/#/transaction/", decimals: 6 },
  { key: "bep20", label: "BEP-20 (BSC)", fee: "~$0.10", explorer: "https://bscscan.com/tx/", decimals: 18 },
  { key: "erc20", label: "ERC-20 (Ethereum)", fee: "~$3-10", explorer: "https://etherscan.io/tx/", decimals: 6 },
];

// ── Crypto Wallet (ระบบกระเป๋าเงิน) ──
export interface CryptoWallet {
  email: string;
  usdt_balance: number;
  updated_at: string;
}

// ── Crypto Topup (รายการเติมเงิน) ──
export interface CryptoTopup {
  id: string;
  email: string;
  network: CryptoNetwork;
  wallet_address: string;
  txid: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  created_at: string;
  paid_at: string;
  expires_at: string;
}

// ── USDT Prices (ปรับได้ตามอัตราตลาด) ──
export const PACKAGE_USDT_PRICES: Record<PackageType, number> = {
  none: 0,
  free_ib: 0,
  free: 0,
  test_1: 0.01,
  "1000_2m": 11,
  "2490_3m": 31,
  "3900_6m": 81,
  "4900_1y": 176,
  ib_vps_2200: 74,
  live_with_us: 301,
};