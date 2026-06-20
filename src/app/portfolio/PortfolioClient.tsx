"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import type { PortfolioAccount } from "@/types";
import { useT } from "@/lib/LanguageContext";
import LangSwitch from "@/components/LangSwitch";

type Props = {
  initialAccounts: PortfolioAccount[];
};

export default function PortfolioClient({ initialAccounts }: Props) {
  const { data: session } = useSession();
  const { t } = useT();
  const [accounts, setAccounts] = useState<PortfolioAccount[]>(initialAccounts);
  const [mt5Account, setMt5Account] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!mt5Account.trim()) return;
    if (accounts.length >= 20) {
      setError("Maximum 20 ports allowed");
      return;
    }
    setAdding(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mt5_account: mt5Account.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setAccounts([...accounts, data.account]);
        setMt5Account("");
        setShowAdd(false);
        setSuccess(t("port_added", { account: mt5Account.trim() }));
      } else {
        setError(data.error || t("error_occurred"));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("delete_port_confirm_q"))) return;
    setDeleting(id);
    setError("");
    try {
      const res = await fetch(`/api/portfolio?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
      } else {
        setError(data.error || t("delete_not_successful"));
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
              <h1 className="text-lg font-bold text-zinc-900">{t("my_portfolio")}</h1>
              <p className="text-xs text-zinc-500">{session?.user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LangSwitch />
            <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
              {t("dashboard")}
            </a>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100"
            >
              {t("sign_out")}
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
            {t("portfolio_your_ports", { count: accounts.length })}
          </h2>
          <button
            onClick={() => setShowAdd(!showAdd)}
            disabled={accounts.length >= 20}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {showAdd ? t("portfolio_close_btn") : t("portfolio_add_btn")}
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
                placeholder={t("portfolio_account_placeholder")}
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={adding || !mt5Account.trim()}
                className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {adding ? t("portfolio_adding") : t("portfolio_add")}
              </button>
            </div>
          </form>
        )}

        {/* Float P/L Bar Chart */}
        {accounts.length > 0 && (() => {
          return (
            <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-zinc-700">{t("portfolio_chart_title") || "Float P/L by Account"}</h3>
              <div className="space-y-2">
                {accounts.map((acc) => {
                  const pctReturn = acc.floating_pl; // already a percentage from sheets
                  const absPct = Math.min(Math.abs(pctReturn), 100);
                  const isPositive = pctReturn >= 0;
                  const barColor = isPositive ? "bg-green-500" : "bg-red-500";
                  const displayPct = `${isPositive ? "+" : ""}${pctReturn.toFixed(1)}`; // show full %, bar width already capped
                  return (
                    <div key={acc.id} className="flex items-center gap-3">
                      <span className="w-28 flex-shrink-0 text-xs font-mono font-semibold text-zinc-700 truncate" title={acc.mt5_account}>
                        {acc.mt5_account}
                      </span>
                      <div className="flex-1 h-[22px] bg-zinc-100 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2.5 ${barColor}`}
                          style={{ width: `${Math.max(absPct, 3)}%`, minWidth: absPct > 0 ? "2rem" : 0 }}
                        >
                          <span className="text-xs font-bold text-white drop-shadow-sm whitespace-nowrap">
                            {displayPct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Portfolio Cards */}
        {accounts.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-zinc-500">{t("portfolio_empty")}</p>
            <p className="mt-1 text-xs text-zinc-400">{t("portfolio_empty_hint")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {accounts.map((acc) => {
              const floating = formatPL(acc.floating_pl);
              const profit = formatPL(acc.total_profit);
              const pctColor = acc.floating_pl >= 0 ? "text-green-600" : "text-red-500";
              const pctText = `${acc.floating_pl >= 0 ? "+" : ""}${acc.floating_pl.toFixed(2)}%`;
              const isUpdated = acc.last_updated && (Date.now() - new Date(acc.last_updated).getTime()) < 2 * 60 * 60 * 1000;

              return (
                <div key={acc.id} className="rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-md">
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-zinc-900">{acc.mt5_account}</span>
                        <span className={`inline-block h-2 w-2 rounded-full ${isUpdated ? "bg-green-500" : "bg-yellow-400"}`} title={isUpdated ? t("last_updated") : t("waiting_update")} />
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      disabled={deleting === acc.id}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                      title={t("delete_port")}
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
                      <div className="text-xs text-zinc-500 mb-1">{t("balance")}</div>
                      <div className="text-sm font-bold text-zinc-900">${formatBalance(acc.balance)}</div>
                    </div>

                    {/* Floating P/L */}
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <div className="text-xs text-zinc-500 mb-1">{t("float_pl")}</div>
                      <div className={`text-sm font-bold ${pctColor}`}>{pctText}</div>
                    </div>

                    {/* Total Profit */}
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <div className="text-xs text-zinc-500 mb-1">{t("total_profit")}</div>
                      <div className={`text-sm font-bold ${profit.color}`}>${profit.text}</div>
                    </div>
                  </div>

                  {/* Last Updated */}
                  {acc.last_updated && (
                    <div className="mt-3 text-right text-xs text-zinc-400">
                      {isUpdated ? "🟢 " + t("last_updated") : "🟡 " + t("waiting_update")} — {new Date(acc.last_updated).toLocaleString("th-TH", {
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
