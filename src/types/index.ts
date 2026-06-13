// ── Member (สมาชิก) ──
export interface Member {
  email: string;
  name: string;
  package: PackageType;
  max_ports: number;
  expiry_date: string;
  role: "user" | "admin";
  created_at: string;
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
}

// ── Package Types ──
export type PackageType = "free" | "free_ib" | "test_1" | "1000_2m" | "2490_3m" | "4900_1y" | "ib_vps_2200" | "none";

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
    label: "ไม่มีแพคเกจ", rank: 0,
  },
  free_ib: {
    key: "free_ib", name: "ฟรี+IB", name_en: "Free+IB", price: 0, duration_days: 99999, max_ports: 999,
    label: "ฟรี + IB ตลอดชีพ", rank: -1,
  },
  free: {
    key: "free", name: "ฟรี", name_en: "Free", price: 0, duration_days: 7, max_ports: 1,
    label: "ฟรี 7 วัน", rank: 1,
  },
  test_1: {
    key: "test_1", name: "ทดสอบ", name_en: "Test", price: 1, duration_days: 3, max_ports: 3,
    label: "🧪 1 บาท / 3 วัน", rank: 2,
  },
  "1000_2m": {
    key: "1000_2m", name: "Basic", name_en: "Basic", price: 590, duration_days: 30, max_ports: 2,
    label: "590 บาท / 30 วัน", rank: 4,
    old_price: 990,
  },
  "2490_3m": {
    key: "2490_3m", name: "Premium", name_en: "Premium", price: 2990, duration_days: 90, max_ports: 5,
    label: "2,990 บาท / 90 วัน + ฝากรัน", rank: 6,
    old_price: 3900,
  },
  "4900_1y": {
    key: "4900_1y", name: "VIP", name_en: "VIP", price: 6900, duration_days: 365, max_ports: 9,
    label: "6,900 บาท / 1 ปี + ฝากรัน", rank: 7,
    old_price: 15600,
  },
  ib_vps_2200: {
    key: "ib_vps_2200", name: "IB+VPS", name_en: "IB+VPS", price: 2200, duration_days: 365, max_ports: 999,
    label: "2,200 บาท / 1 ปี (Unlimited)", rank: 8,
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

export const BUYABLE_PACKAGES: PackageType[] = ["free", "1000_2m", "2490_3m", "4900_1y", "ib_vps_2200"];

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