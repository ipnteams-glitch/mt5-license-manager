"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { PackageType } from "@/types";
import { PACKAGES } from "@/types";

const PROMO_PACKAGES: PackageType[] = ["free_ib", "1000_2m", "2490_3m", "4900_1y", "live_with_us", "ib_vps_2200"];

function promoPrice(key: PackageType): number {
  return Math.round(PACKAGES[key].price * 0.5);
}

export default function JunePromoPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [selected, setSelected] = useState<PackageType | null>(null);
  const [step, setStep] = useState<"select" | "qr" | "done">("select");
  const [qrBase64, setQrBase64] = useState("");
  const [amount, setAmount] = useState(0);
  const [txnId, setTxnId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [activating, setActivating] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [timeLeft, setTimeLeft] = useState(900);

  const [showUploadSlip, setShowUploadSlip] = useState(false);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [slipResult, setSlipResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);

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

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  async function handleActivate() {
    if (!selected) return;
    setError("");
    setActivating(true);
    try {
      const res = await fetch("/api/payment/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: selected, promo: "june2026" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setQrBase64(data.qr_base64);
      setAmount(data.amount);
      setTxnId(data.txn_id);
      setExpiresAt(data.expires_at);
      setTimeLeft(900);
      setStep("qr");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActivating(false);
    }
  }

  useEffect(() => {
    if (step !== "qr" || !txnId) return;
    const poll = async () => {
      try {
        const res = await fetch("/api/payment/has-paid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txn_id: txnId }),
        });
        const data = await res.json();
        if (data.paid) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStep("done");
          setTimeout(() => router.push("/dashboard"), 3000);
        }
      } catch { /* ignore */ }
    };
    poll();
    pollingRef.current = setInterval(poll, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [step, txnId]);

  async function handleUploadSlip() {
    if (!slipFile || !txnId) return;
    setUploading(true);
    setSlipResult(null);
    try {
      const formData = new FormData();
      formData.append("txn_id", txnId);
      formData.append("file", slipFile);
      const res = await fetch("/api/payment/upload-slip", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setSlipResult({ ok: true, msg: data.message || "Sent" });
        setShowUploadSlip(false);
      } else {
        setSlipResult({ ok: false, msg: data.message || data.error || "Failed" });
      }
    } catch {
      setSlipResult({ ok: false, msg: "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  async function handleCancel() {
    if (!txnId) return;
    setCancelling(true);
    try {
      await fetch("/api/payment/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txn_id: txnId }),
      });
    } catch { /* ignore */ }
    setCancelling(false);
    setStep("select");
    setQrBase64("");
    setTxnId("");
  }

  async function handleVerify() {
    if (!txnId) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txn_id: txnId }),
      });
      const data = await res.json();
      if (data.success) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setStep("done");
        setTimeout(() => router.push("/dashboard"), 3000);
      } else {
        setError(data.message || "Not paid yet");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (step === "select") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-rose-200">
          <div className="text-center mb-4">
            <span className="inline-block rounded-full bg-red-500 px-4 py-1 text-xs font-bold text-white tracking-wide">
              JUNE SALE -50%
            </span>
            <h1 className="mt-2 text-xl font-bold text-zinc-800">Promotion June</h1>
            <p className="text-xs text-zinc-500 mt-1">50% off all packages until 30 June 2026</p>
          </div>
          {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <div className="space-y-3">
            {PROMO_PACKAGES.map((key) => {
              const pkg = PACKAGES[key];
              const discounted = promoPrice(key);
              const isSelected = selected === key;
              const isFree = key === "free_ib";
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={"w-full rounded-xl border-2 p-4 text-left transition-all " +
                    (isSelected
                      ? (isFree ? "border-green-400 bg-green-50 shadow-md" : "border-red-400 bg-red-50 shadow-md")
                      : "border-zinc-200 hover:border-zinc-300")}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-zinc-800">{pkg.name}</p>
                      <p className="text-xs text-zinc-500">{pkg.label}</p>
                    </div>
                    <div className="text-right">
                      {isFree ? (
                        <>
                          <p className="text-xl font-bold text-green-600">FREE</p>
                          <p className="text-xs text-zinc-400 mt-1">Unlimited Ports</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-zinc-400 line-through">THB {pkg.price.toLocaleString()}</p>
                          <p className="text-xl font-bold text-red-600">THB {discounted.toLocaleString()}</p>
                          <p className="text-xs text-red-400 font-medium">Save THB {(pkg.price - discounted).toLocaleString()}</p>
                          <p className="text-xs text-zinc-400 mt-1">{pkg.max_ports >= 999 ? "Unlimited" : pkg.max_ports} Ports</p>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={handleActivate}
            disabled={!selected || activating}
            className="mt-6 w-full rounded-xl bg-red-500 py-3.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-200"
          >
            {activating ? "Creating QR..." : "Get 50% Off!"}
          </button>
          <button onClick={() => router.push("/dashboard")} className="mt-3 w-full text-sm text-zinc-400 hover:underline">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (step === "qr") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-rose-200">
          <div className="text-center mb-4">
            <span className="inline-block rounded-full bg-red-500 px-3 py-0.5 text-xs font-bold text-white">JUNE -50%</span>
          </div>
          <h2 className="text-lg font-bold text-zinc-800 text-center">Scan QR to pay</h2>
          <p className="text-center text-3xl font-bold text-red-600 mt-1">THB {amount.toLocaleString()}</p>
          <p className="text-center text-xs text-zinc-400 mt-1">Expires in {formatTime(timeLeft)}</p>
          {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          {qrBase64 && (
            <div className="my-4 flex justify-center">
              <img src={qrBase64} alt="QR Code" className="w-56 h-56 rounded-xl shadow-md" />
            </div>
          )}
          <p className="text-center text-xs text-zinc-500 mb-4">
            Scan with bank app or{" "}
            <button onClick={() => setShowUploadSlip(!showUploadSlip)} className="text-blue-600 underline">
              upload slip
            </button>
          </p>
          {showUploadSlip && (
            <div className="mb-4 rounded-xl border border-zinc-200 p-4 space-y-3">
              <p className="text-sm font-medium text-zinc-700">Upload payment slip</p>
              <input type="file" accept="image/*" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} className="w-full text-sm text-zinc-600" />
              <button onClick={handleUploadSlip} disabled={!slipFile || uploading} className="w-full rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                {uploading ? "Uploading..." : "Send slip to admin"}
              </button>
              {slipResult && <p className={"text-sm " + (slipResult.ok ? "text-green-600" : "text-red-500")}>{slipResult.msg}</p>}
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={handleCancel} disabled={cancelling} className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50">
              {cancelling ? "..." : "Cancel"}
            </button>
            <button onClick={handleVerify} disabled={verifying} className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {verifying ? "Checking..." : "I have paid"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl border border-rose-200 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-zinc-800">Payment Successful!</h2>
        <p className="text-sm text-zinc-500 mt-2">Your package has been activated. Redirecting to Dashboard...</p>
        <button onClick={() => router.push("/dashboard")} className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
