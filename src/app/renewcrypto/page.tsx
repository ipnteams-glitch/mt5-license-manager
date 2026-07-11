"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import type { PackageType, CryptoNetwork } from "@/types";
import { t as translate, type TKey } from "@/lib/i18n";
import { PACKAGES, BUYABLE_PACKAGES, TEST_PACKAGES, CRYPTO_NETWORK_INFO, PACKAGE_USDT_PRICES } from "@/types";

const t = (key: TKey, vars?: Record<string, string | number>) => translate(key, "en", vars);

export default function RenewCryptoPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return <Spinner />;
  if (!session) return <NeedLogin />;

  const [view, setView] = useState<"main" | "topup">("main");
  const [balance, setBalance] = useState(0);
  const [buying, setBuying] = useState<PackageType | null>(null);
  const [error, setError] = useState("");

  // Topup state
  const [topupNetwork, setTopupNetwork] = useState<CryptoNetwork>("trc20");
  const [topupData, setTopupData] = useState<any>(null);
  const [topupCreating, setTopupCreating] = useState(false);
  const [topupPoll, setTopupPoll] = useState("");
  const [topupAmount, setTopupAmount] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(1800);
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const isTestUser = session.user?.email === "ipnteams@gmail.com";
  const visiblePackages = (isTestUser ? [...TEST_PACKAGES, ...BUYABLE_PACKAGES] : BUYABLE_PACKAGES).filter(k => k !== "free");

  // Fetch balance
  useEffect(() => { fetchBalance(); }, []);
  async function fetchBalance() {
    try {
      const res = await fetch("/api/crypto/balance");
      const data = await res.json();
      if (data.balance !== undefined) setBalance(data.balance);
    } catch {}
  }

  // Topup: create
  async function startTopup() {
    setTopupCreating(true);
    setError("");
    try {
      const res = await fetch("/api/crypto/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network: topupNetwork }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTopupData(data);
      setTimeLeft(1800);
      setTopupAmount(null);
      setTopupPoll("");
      setView("topup");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTopupCreating(false);
    }
  }

  // Topup: poll (useEffect)
  const doPoll = useCallback(async () => {
    if (!topupData) return;
    try {
      const res = await fetch(`/api/crypto/topup-poll?topup_id=${topupData.topup_id}`);
      const data = await res.json();
      if (data.status === "paid") {
        setTopupPoll("paid");
        setTopupAmount(data.amount);
        setBalance(data.balance);
        if (pollingRef.current) clearInterval(pollingRef.current);
        setTimeout(() => { setView("main"); }, 3000);
      } else if (data.status === "expired") {
        setTopupPoll("expired");
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch {}
  }, [topupData]);

  useEffect(() => {
    if (view !== "topup" || !topupData) return;
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(doPoll, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [view, topupData, doPoll]);

  // Topup: countdown
  useEffect(() => {
    if (view !== "topup" || !topupData) return;
    const tick = () => {
      const r = Math.max(0, Math.floor((new Date(topupData.expires_at).getTime() - Date.now()) / 1000));
      setTimeLeft(r);
    };
    tick(); const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [view, topupData]);

  // Topup: cancel
  async function cancelTopup() {
    if (!topupData) return;
    try { await fetch("/api/crypto/topup-cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topup_id: topupData.topup_id }) }); } catch {}
    if (pollingRef.current) clearInterval(pollingRef.current);
    setTopupData(null);
    setView("main");
  }

  // Purchase
  async function buyPackage(pkg: PackageType) {
    setBuying(pkg);
    setError("");
    try {
      const res = await fetch("/api/crypto/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBalance(data.new_balance);
      alert(`${data.message}\n${data.package_label}\n\u0e2b\u0e21\u0e14\u0e2d\u0e32\u0e22\u0e38 ${new Date(data.expiry_date).toLocaleDateString("th-TH")}`);
      window.location.href = "https://mt5.harvestfarm.site/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBuying(null);
    }
  }

  function fmtTime(s: number) { const m = Math.floor(s / 60); const se = s % 60; return `${String(m).padStart(2, "0")}:${String(se).padStart(2, "0")}`; }
  async function copyAddr(addr: string) { try { await navigator.clipboard.writeText(addr); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }

  // ── Topup View ──
  if (view === "topup" && topupData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg text-center">
          <h1 className="text-xl font-bold text-zinc-800 mb-1">{t("wallet_topup")}</h1>
          <p className="text-sm text-zinc-700 mb-4">{t("wallet_topup_any")}</p>

          {topupPoll === "paid" ? (
            <div className="mb-4 rounded-lg bg-green-50 p-4">
              <p className="text-lg font-bold text-green-600">✅ +{topupAmount} USDT</p>
              <p className="text-sm text-zinc-700">{t("crypto_redirect_dashboard")}</p>
            </div>
          ) : topupPoll === "expired" ? (
            <div className="mb-4 rounded-lg bg-red-50 p-4">
              <p className="font-semibold text-red-600">{t("crypto_expired")}</p>
              <button onClick={() => { setView("main"); setTopupData(null); }} className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">{t("crypto_back")}</button>
            </div>
          ) : (
            <>
              <div className="mb-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">{topupData.network_label}</div>
              <div className="mx-auto mb-4 h-48 w-48 rounded-xl border-2 p-2">
                <img src={topupData.qr_url} alt="QR" className="h-full w-full object-contain" />
              </div>
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-zinc-100 p-2">
                <code className="flex-1 break-all text-xs text-left">{topupData.wallet_address}</code>
                <button onClick={() => copyAddr(topupData.wallet_address)} className="shrink-0 rounded bg-blue-600 px-2 py-1 text-xs text-white">{copied ? t("crypto_copied") : t("crypto_copy_address")}</button>
              </div>
              <p className="mb-4 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">{t("crypto_warning_network", { network: topupData.network_label })}</p>
              <div className="mb-4 flex items-center justify-center gap-2 text-sm text-zinc-700">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
                <span>{t("crypto_checking")}</span>
              </div>
              <p className="text-sm text-zinc-700">⏱️ {fmtTime(timeLeft)}</p>
              <button onClick={cancelTopup} className="mt-3 w-full rounded-lg border py-2 text-sm text-zinc-700 hover:bg-zinc-50">{t("crypto_cancel_btn")}</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main View (Balance + Packages) ──
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h1 className="text-xl font-bold text-zinc-800 mb-1">{t("wallet_title")}</h1>

        {/* Balance Card */}
        <div className="mb-4 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white">
          <p className="text-xs text-blue-200">{t("wallet_balance")}</p>
          <p className="text-3xl font-bold">{balance.toFixed(2)} <span className="text-lg font-normal">USDT</span></p>
        </div>

        {/* Network Selector */}
        <div className="mb-4">
          <p className="text-sm font-medium text-zinc-700 mb-2">{t("crypto_select_network")}</p>
          <div className="flex gap-2">
            {CRYPTO_NETWORK_INFO.map(net => (
              <button key={net.key} onClick={() => setTopupNetwork(net.key)}
                className={`flex-1 rounded-lg border-2 p-2 text-xs ${topupNetwork === net.key ? "border-blue-500 bg-blue-50" : "border-zinc-200"}`}>
                <p className="font-semibold text-zinc-800">{net.label}</p><p className="text-zinc-700">{net.fee}</p>
              </button>
            ))}
          </div>
        </div>

        <button onClick={startTopup} disabled={topupCreating}
          className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 mb-6 disabled:opacity-50">
          {topupCreating ? t("loading") : t("wallet_topup")}
        </button>

        {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        {/* Package List */}
        <p className="text-sm font-medium text-zinc-700 mb-3">{t("renew_select")}</p>
        <div className="space-y-3">
          {visiblePackages.map(key => {
            const pkg = PACKAGES[key];
            const usdtPrice = PACKAGE_USDT_PRICES[key];
            const canBuy = balance >= usdtPrice;
            return (
              <div key={key} className="rounded-xl border-2 border-zinc-200 p-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="font-semibold text-zinc-800">{pkg.name}</p>
                    <p className="text-xs text-zinc-700 whitespace-pre-line">{pkg.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">{usdtPrice} USDT</p>
                    <p className="text-xs text-zinc-700">{pkg.max_ports >= 999 ? t("unlimited") : `${pkg.max_ports} ${t("port_suffix")}`}</p>
                  </div>
                </div>
                <button onClick={() => buyPackage(key)} disabled={!canBuy || buying === key}
                  className={`w-full rounded-lg py-2 text-sm font-semibold disabled:cursor-not-allowed ${
                    canBuy ? "bg-green-600 text-white hover:bg-green-700" : "bg-zinc-200 text-zinc-700"
                  }`}>
                  {buying === key ? t("loading") : canBuy ? t("wallet_buy") : t("wallet_insufficient")}
                </button>
              </div>
            );
          })}
        </div>

        <button onClick={() => window.location.href = "https://mt5.harvestfarm.site/dashboard"}
          className="mt-4 w-full text-sm text-zinc-700 hover:underline">{t("back_to_dashboard")}</button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600" />
    </div>
  );
}

function NeedLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="text-center">
        <p className="text-zinc-700 mb-4">Please sign in to access Crypto Wallet</p>
        <button onClick={() => signIn("google", { callbackUrl: "/renewcrypto" })} className="rounded-lg bg-blue-600 px-6 py-2 text-white">Sign in with Google</button>
      </div>
    </div>
  );
}