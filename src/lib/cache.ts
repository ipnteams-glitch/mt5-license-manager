// ── In-memory Cache with TTL ──
// ใช้ลด Google Sheets API calls — ทุก read จะเช็ค cache ก่อน
// Write ทุกจุด invalidate cache ที่เกี่ยวข้อง

type CacheEntry<T> = { data: T; ts: number };

const store = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 10_000; // 10 วิ — สั้นพอไม่ stale, ยาวพอจบ request ซ้อน

/** อ่านจาก cache — คืน null ถ้า miss หรือหมดอายุ */
export function getCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

/** เขียนลง cache */
export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() });
}

/** ลบ cache ทีละ key (ใช้หลัง write) */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/** ลบ cache ทุก key ที่ขึ้นต้นด้วย prefix (ใช้กับ portfolio:{email}) */
export function invalidateCachePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

