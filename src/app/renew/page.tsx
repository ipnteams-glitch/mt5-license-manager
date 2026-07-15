"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { PackageType } from "@/types";
import { t as translate, type TKey } from "@/lib/i18n";
import { PACKAGES, BUYABLE_PACKAGES, TEST_PACKAGES } from "@/types";

const t = (key: TKey, vars?: Record<string, string | number>) => translate(key, "en", vars);

export default function RenewPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isTestUser = session?.user?.email === "ipnteams@gmail.com";



  const visiblePackages = (isTestUser
    ? [...TEST_PACKAGES, ...BUYABLE_PACKAGES]
    : BUYABLE_PACKAGES).filter((k) => k !== "free");
  const [step, setStep] = useState<"method" | "select" | "qr" | "done">("method");
  const [selected, setSelected] = useState<PackageType | null>(null);
  const [qrBase64, setQrBase64] = useState("");
  const [amount, setAmount] = useState(0);
  const [txnId, setTxnId] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [error, setError] = useState("");
  const [agentCode, setAgentCode] = useState("");
  const [agentInfo, setAgentInfo] = useState<{ agent_code: string; agent_name: string; discount_percent: number; discounted_price: number } | null>(null);
  const [validatingAgent, setValidatingAgent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [activating, setActivating] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 นาที

  // Upload slip
  const [showUploadSlip, setShowUploadSlip] = useState(false);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [slipResult, setSlipResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // นับถอยหลัง
  useEffect(() => {
    if (step !== "qr" || !expiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && pollingRef.current) {
        clearInterval(pollingRef.current);
        setVerifying(false);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [step, expiresAt]);

  function pkgBg(key: PackageType) {
    if (key === "1000_2m" || key === "3900_6m" || key === "live_with_us") return "bg-amber-50";
    if (key === "ib_vps_2200") return "bg-purple-50";
    return "";
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // ponytail: validate agent code (debounced via onBlur)
  async function validateAgentCode(code: string) {
    if (!code.trim() || !selected) {
      setAgentInfo(null);
      return;
    }
    setValidatingAgent(true);
    try {
      const res = await fetch(`/api/agent/validate?code=${encodeURIComponent(code.trim())}&package=${selected}`);
      const data = await res.json();
      if (data.valid) {
        setAgentInfo(data);
      } else {
        setAgentInfo(null);
        setError(data.reason || "โค้ดไม่ถูกต้อง");
      }
    } catch {
      setAgentInfo(null);
    } finally {
      setValidatingAgent(false);
    }
  }

  async function handleAdminVerify() {
    if (!txnId) return;
    setError("");
    try {
      const res = await fetch("/api/payment/admin-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txn_id: txnId }),
      });
      const data = await res.json();
      if (data.success) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setStep("done");
        setVerifying(false);
        setTimeout(() => window.location.href = "https://mt5.harvestfarm.site/dashboard", 3000);
      } else {
        setError(data.message || t("admin_verify_failed"));
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleActivate() {
    if (!selected) return;
    setError("");

    // แพคเกจฟรี → เปิดใช้งานทันที ไม่ต้องจ่าย
    if (selected === "free") {
      setActivating(true);
      try {
        const res = await fetch("/api/payment/activate-free", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("error_occurred"));
        setStep("done");
        setTimeout(() => window.location.href = "https://mt5.harvestfarm.site/dashboard", 3000);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setActivating(false);
      }
      return;
    }



    // แพคเกจเสียเงิน → สร้าง QR
    try {
      const res = await fetch("/api/payment/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: selected, agent_code: agentInfo?.agent_code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("error_occurred"));

      setQrBase64(data.qr_base64);
      setAmount(data.amount);
      setTxnId(data.txn_id);
      setExpiresAt(data.expires_at || "");
      setStep("qr");
      startPolling(data.txn_id, data.expires_at);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startPolling(txnId: string, expiresAtStr: string) {
    setVerifying(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txn_id: txnId }),
        });
        const data = await res.json();
        if (data.success) {
          clearInterval(interval);
          setStep("done");
          setVerifying(false);
          setTimeout(() => window.location.href = "https://mt5.harvestfarm.site/dashboard", 3000);
        } else if (data.cancelled) {
          clearInterval(interval);
          setVerifying(false);
          setError(t("cancel_transaction"));
        }
      } catch {}
    }, 5000);
    pollingRef.current = interval;

    // หยุด poll ตามเวลา expires_at (ไม่เกิน 15 นาที)
    if (expiresAtStr) {
      const expiresTime = new Date(expiresAtStr).getTime();
      const timeout = Math.max(0, expiresTime - Date.now());
      setTimeout(() => {
        clearInterval(interval);
        setVerifying(false);
      }, timeout + 2000); // เผื่อ 2 วินาทีหลังหมดอายุ
    } else {
      setTimeout(() => {
        clearInterval(interval);
        setVerifying(false);
      }, 300000);
    }
  }

  async function handleCancelPayment() {
    if (!txnId) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/payment/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txn_id: txnId }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("select");
        setError("");
      } else {
        setError(data.error || t("cancel_payment"));
      }
    } catch {
      setError(t("error_occurred"));
    } finally {
      setCancelling(false);
    }
  }

  async function handleUploadSlip() {
    if (!slipFile || !txnId) return;
    setUploading(true);
    setSlipResult(null);
    try {
      const fd = new FormData();
      fd.append("txn_id", txnId);
      fd.append("file", slipFile);
      const res = await fetch("/api/payment/upload-slip", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setSlipResult({ ok: true, msg: data.message });
        setShowUploadSlip(false);
        setSlipFile(null);
      } else {
        setSlipResult({ ok: false, msg: data.message || data.error || t("error_occurred") });
      }
    } catch (err: any) {
      setSlipResult({ ok: false, msg: err.message });
    } finally {
      setUploading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center rounded-xl bg-white p-8 shadow-lg">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-green-700 mb-2">{t("renew_success_title")}</h1>
          <p className="text-zinc-500">{t("returning_dashboard")}</p>
        </div>
      </div>
    );
  }

  if (step === "qr") {
    const isExpired = timeLeft <= 0;
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg text-center">
          <h2 className="text-lg font-bold text-zinc-800 mb-1">{t("qr_scan_title")}</h2>
          {selected && <p className="text-sm font-semibold text-blue-600 mb-1">{PACKAGES[selected].name} — {PACKAGES[selected].label}</p>}
          <p className="text-sm text-zinc-500 mb-2">{t("qr_amount", { amount: amount.toFixed(2) })}</p>

          {/* นับถอยหลัง */}
          <div className="mb-4">
            {isExpired ? (
              <p className="inline-block rounded-full bg-red-100 px-4 py-1 text-sm font-semibold text-red-600">
                {t("qr_expired")}
              </p>
            ) : (
              <p className="inline-block rounded-full bg-amber-50 px-4 py-1 text-sm font-semibold text-amber-700">
                {t("qr_pay_within")}{" "}
                <span className={timeLeft < 60 ? "text-red-600" : "text-amber-700"}>
                  {formatTime(timeLeft)}
                </span>{" "}
                {t("minutes")}
              </p>
            )}
          </div>

          {/* Upload Slip — แสดงเมื่อหมดอายุ หรือกดปุ่มอัปโหลด */}
          {isExpired && !slipResult?.ok && (
            <div className="mb-4">
              {!showUploadSlip ? (
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => { setShowUploadSlip(true); setSlipResult(null); }}
                    className="rounded-lg border-2 border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 hover:border-blue-400 hover:text-blue-600 transition-all"
                  >
                    {t("upload_slip_alt")}
                  </button>
                  <button
                    onClick={handleCancelPayment}
                    disabled={cancelling}
                    className="rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancelling ? t("cancelling") : t("cancel_btn")}
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-left">
                  <p className="text-xs text-zinc-500 mb-2">{t("upload_slip_if_paid")}</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setSlipFile(e.target.files?.[0] || null);
                      setSlipResult(null);
                    }}
                    className="mb-2 w-full text-xs text-zinc-600 file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:text-blue-600"
                  />
                  {slipFile && (
                    <p className="text-xs text-zinc-400 mb-2">{slipFile.name} ({(slipFile.size / 1024).toFixed(0)} KB)</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleUploadSlip}
                      disabled={!slipFile || uploading}
                      className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {uploading ? t("checking") : t("send_slip")}
                    </button>
                    <button
                      onClick={() => { setShowUploadSlip(false); setSlipFile(null); setSlipResult(null); }}
                      className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-200"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {qrBase64 && !isExpired && !error && (
            <img src={qrBase64} alt="PromptPay QR" className="mx-auto mb-4 rounded-lg" style={{ maxWidth: 250 }} />
          )}
          {/* ปุ่ม ชำระแล้ว → ไปอัปโหลดสลิป */}
          {!isExpired && (
            <button
              onClick={() => {
                if (pollingRef.current) clearInterval(pollingRef.current);
                window.location.href = "https://mt5.harvestfarm.site/dashboard";
              }}
              className="mt-3 w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-all"
            >
              {t("press_when_paid")}
            </button>
          )}

          {verifying && !isExpired && !error && (
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
              {t("checking_payment")}
            </div>
          )}
          {verifying && !isExpired && isTestUser && (
            <button
              onClick={handleAdminVerify}
              className="mt-3 w-full rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-all"
            >
              {t("admin_force_verify")}
            </button>
          )}
          {slipResult?.ok && (
            <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-600">{slipResult.msg}</p>
          )}
          {slipResult && !slipResult.ok && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{slipResult.msg}</p>
          )}
          {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <p className="mt-3 pt-3 border-t border-zinc-200 text-xs text-zinc-400">
            {t("contact_line")}
          </p>
          <button onClick={() => { setStep("method"); setError(""); }} className="mt-2 text-sm text-blue-600 hover:underline">
            {t("crypto_back")}
          </button>
        </div>
      </div>
    );
  }

  if (step === "method") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg text-center">
          <h1 className="text-xl font-bold text-zinc-800 mb-1">{t("renew_title")}</h1>
          <p className="text-sm text-zinc-500 mb-8">{t("renew_select")}</p>
          <button
            onClick={() => setStep("select")}
            className="mb-4 w-full rounded-xl border-2 border-zinc-200 bg-white p-6 text-left hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-2xl">📱</div>
              <div>
                <p className="font-semibold text-zinc-800">QR Code (PromptPay)</p>
                <p className="text-xs text-zinc-500">ชำระผ่านธนาคารไทย</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => router.push("/renewcrypto")}
            className="mb-4 w-full rounded-xl border-2 border-zinc-200 bg-white p-6 text-left hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-2xl">₿</div>
              <div>
                <p className="font-semibold text-zinc-800">Crypto (USDT)</p>
                <p className="text-xs text-zinc-500">USDT TRC-20 / BEP-20 / ERC-20</p>
              </div>
            </div>
          </button>
          <button onClick={() => window.location.href = "https://mt5.harvestfarm.site/dashboard"} className="mt-4 text-sm text-zinc-500 hover:underline">
            {t("back_to_dashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h1 className="text-xl font-bold text-zinc-800 mb-1">{t("renew_title")}</h1>
        <p className="text-sm text-zinc-500 mb-6">{t("renew_select")}</p>

        {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="space-y-3">
          {visiblePackages.map((key) => {
            const pkg = PACKAGES[key];
            const isSelected = selected === key;
            const isFree = key === "test_1";
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected ? "border-blue-500 bg-blue-50 shadow-md" : `border-zinc-200 hover:border-zinc-300 ${pkgBg(key)}`
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-zinc-800">{pkg.name}</p>
                    <p className="text-xs text-zinc-500 whitespace-pre-line">{pkg.label}</p>
                  </div>
                  <div className="text-right">
                    {pkg.old_price && pkg.old_price !== pkg.price ? (
                      <>
                        <p className="text-sm text-red-500 line-through">
                          ฿{pkg.old_price.toLocaleString()}
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          ฿{pkg.price.toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <p className={`text-lg font-bold ${isFree ? "text-green-600" : "text-blue-600"}`}>
                        {isFree ? t("free_label") : `฿${pkg.price.toLocaleString()}`}
                      </p>
                    )}
                    <p className="text-xs text-zinc-400">{pkg.max_ports >= 999 ? t("unlimited") : `${pkg.max_ports} ${t("port_suffix")}`}</p>
                  </div>
                </div>
              </button>
            );
          })}

        </div>

        {/* Agent Code Input */}
        {selected && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700 mb-1">🏷️ โค้ดตัวแทน (ถ้ามี)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={agentCode}
                onChange={(e) => { setAgentCode(e.target.value); setAgentInfo(null); }}
                onBlur={() => validateAgentCode(agentCode)}
                placeholder="กรอกโค้ดตัวแทน"
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none"
              />
              {validatingAgent && (
                <div className="flex items-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
                </div>
              )}
            </div>
            {agentInfo && (
              <p className="mt-2 text-sm text-green-600">
                ✅ {agentInfo.agent_name} — ส่วนลด {agentInfo.discount_percent}% 
                เหลือ <span className="font-bold">฿{agentInfo.discounted_price.toLocaleString()}</span>
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleActivate}
          disabled={!selected || activating}
          className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {activating ? t("loading") : selected === "free" ? t("activate_free") : t("create_qr")}
        </button>

        <button onClick={() => window.location.href = "https://mt5.harvestfarm.site/dashboard"} className="mt-3 w-full text-sm text-zinc-500 hover:underline">
          {t("back_to_dashboard")}
        </button>
      </div>
    </div>
  );
}