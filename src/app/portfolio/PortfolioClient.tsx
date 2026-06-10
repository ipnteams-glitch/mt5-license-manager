"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import type { PortfolioAccount } from "@/types";

type Props = {
  initialAccounts: PortfolioAccount[];
};

export default function PortfolioClient({ initialAccounts }: Props) {
  const { data: session } = useSession();
  const [accounts, setAccounts] = useState<PortfolioAccount[]>(initialAccounts);
  const [mt5Account, setMt5Account] = useState("");
  const [broker, setBroker] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!mt5Account.trim()) return;
    setAdding(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mt5_account: mt5Account.trim(), broker: broker.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setAccounts([...accounts, data.account]);
        setMt5Account("");
        setBroker("");
        setShowAdd(false);
        setSuccess(`เพิ่ม ${mt5Account.trim()} แล้ว`);
      } else {
        setError(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("ยืนยันการลบพอร์ตนี้?")) return;
    setDeleting(id);
    setError("");
    try {
      const res = await fetch(`/api/portfolio?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
      } else {
        setError(data.error || "ลบไม่สำเร็จ");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  // Helper: format number with commas, green if positive, red if negative
  function formatPL(n: number): { text: string; color: string } {
    const sign = n >= 0 ? "+" : "";
    const color = n >= 0 ? "text-green-600" : "text-red-500";
    return { text: `${sign}${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color };
  }

  function formatBalance(n: number): string {
    return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white text-lg font-bold">
              MT5
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900">MyPortfolio</h1>
              <p className="text-xs text-zinc-500">{session?.user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
              Dashboard
            </a>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
        )}

        {/* Add Button */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-800">
            พอร์ตของคุณ ({accounts.length})
          </h2>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
          >
            {showAdd ? "✕ ปิด" : "+ เพิ่มพอร์ต"}
          </button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <form onSubmit={handleAdd} className="mb-6 rounded-xl bg-white p-5 shadow-sm">
            <div className="flex gap-4">
              <input
                type="text"
                value={mt5Account}
                onChange={(e) => setMt5Account(e.target.value)}
                placeholder="หมายเลข MT5 Account"
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none"
                required
              />
              <input
                type="text"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                placeholder="Broker (เช่น XM, Exness)"
                className="w-40 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={adding || !mt5Account.trim()}
                className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {adding ? "กำลังเพิ่ม..." : "เพิ่ม"}
              </button>
            </div>
          </form>
        )}

        {/* Portfolio Cards */}
        {accounts.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-zinc-500">ยังไม่มีพอร์ต — เพิ่มพอร์ตแรกของคุณ</p>
            <p className="mt-1 text-xs text-zinc-400">หลังจากเพิ่มแล้ว ให้ติดตั้ง EA เพื่อส่งข้อมูลอัปเดต</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {accounts.map((acc) => {
              const floating = formatPL(acc.floating_pl);
              const profit = formatPL(acc.total_profit);
              const isUpdated = acc.last_updated && (Date.now() - new Date(acc.last_updated).getTime()) < 2 * 60 * 60 * 1000; // 2 ชม

              return (
                <div key={acc.id} className="rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-md">
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-zinc-900">{acc.mt5_account}</span>
                        <span className={`inline-block h-2 w-2 rounded-full ${isUpdated ? "bg-green-500" : "bg-yellow-400"}`} title={isUpdated ? "อัปเดตล่าสุด" : "รออัปเดต"} />
                      </div>
                      {acc.broker && (
                        <span className="text-xs text-zinc-500">{acc.broker}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      disabled={deleting === acc.id}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="ลบพอร์ต"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Balance */}
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <div className="text-xs text-zinc-500 mb-1">Balance</div>
                      <div className="text-sm font-bold text-zinc-900">${formatBalance(acc.balance)}</div>
                    </div>

                    {/* Floating P/L */}
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <div className="text-xs text-zinc-500 mb-1">Float P/L</div>
                      <div className={`text-sm font-bold ${floating.color}`}>${floating.text}</div>
                    </div>

                    {/* Total Profit */}
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <div className="text-xs text-zinc-500 mb-1">Total Profit</div>
                      <div className={`text-sm font-bold ${profit.color}`}>${profit.text}</div>
                    </div>
                  </div>

                  {/* Last Updated */}
                  {acc.last_updated && (
                    <div className="mt-3 text-right text-xs text-zinc-400">
                      {isUpdated ? "🟢 อัปเดตล่าสุด" : "🟡 รออัปเดต"} — {new Date(acc.last_updated).toLocaleString("th-TH", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
