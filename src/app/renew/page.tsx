"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PackageType } from "@/types";
import { PACKAGES, BUYABLE_PACKAGES } from "@/types";

export default function RenewPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<PackageType | null>(null);
  const [step, setStep] = useState<"select" | "qr" | "done">("select");
  const [qrBase64, setQrBase64] = useState("");
  const [amount, setAmount] = useState(0);
  const [txnId, setTxnId] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [activating, setActivating] = useState(false);

  async function handleActivate() {
    if (!selected) return;
    setError("");

    // แพคเกจฟรี → เปิดใช้งานทันที ไม่ต้องจ่าย
    if (selected === "free") {
      setActivating(true);
      try {
        const res = await fetch("/api/payment/activate-free", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
        setStep("done");
        setTimeout(() => router.push("/dashboard"), 3000);
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
        body: JSON.stringify({ package: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");

      setQrBase64(data.qr_base64);
      setAmount(data.amount);
      setTxnId(data.txn_id);
      setStep("qr");
      startPolling(data.txn_id);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startPolling(txnId: string) {
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
          setTimeout(() => router.push("/dashboard"), 3000);
        }
      } catch {}
    }, 5000);

    setTimeout(() => {
      clearInterval(interval);
      if (step === "qr") setError("หมดเวลาตรวจสอบ กรุณาลองใหม่");
      setVerifying(false);
    }, 300000);
  }

  if (step === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center rounded-xl bg-white p-8 shadow-lg">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-green-700 mb-2">ต่ออายุสำเร็จ!</h1>
          <p className="text-zinc-500">กำลังกลับไปหน้า Dashboard...</p>
        </div>
      </div>
    );
  }

  if (step === "qr") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg text-center">
          <h2 className="text-lg font-bold text-zinc-800 mb-2">📱 สแกน QR เพื่อชำระเงิน</h2>
          <p className="text-sm text-zinc-500 mb-4">จำนวน {amount.toFixed(2)} บาท</p>
          {qrBase64 && (
            <img src={qrBase64} alt="PromptPay QR" className="mx-auto mb-4 rounded-lg" style={{ maxWidth: 250 }} />
          )}
          {verifying && (
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
              <span className="animate-spin">⏳</span> กำลังตรวจสอบการชำระเงิน...
            </div>
          )}
          {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <button onClick={() => setStep("select")} className="mt-4 text-sm text-blue-600 hover:underline">
            ← เลือกแพคเกจใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h1 className="text-xl font-bold text-zinc-800 mb-1">🔐 ต่ออายุแพคเกจ</h1>
        <p className="text-sm text-zinc-500 mb-6">เลือกแพคเกจที่ต้องการ</p>

        {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="space-y-3">
          {BUYABLE_PACKAGES.map((key) => {
            const pkg = PACKAGES[key];
            const isSelected = selected === key;
            const isFree = key === "free";
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected ? "border-blue-500 bg-blue-50 shadow-md" : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-zinc-800">{pkg.name}</p>
                    <p className="text-xs text-zinc-500">{pkg.label}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${isFree ? "text-green-600" : "text-blue-600"}`}>
                      {isFree ? "ฟรี" : `฿${pkg.price.toLocaleString()}`}
                    </p>
                    <p className="text-xs text-zinc-400">{pkg.max_ports} พอร์ต</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleActivate}
          disabled={!selected || activating}
          className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {activating ? "กำลังดำเนินการ..." : selected === "free" ? "🎁 เปิดใช้งานฟรี" : "💳 สร้าง QR ชำระเงิน"}
        </button>

        <button onClick={() => router.push("/dashboard")} className="mt-3 w-full text-sm text-zinc-500 hover:underline">
          ← กลับ Dashboard
        </button>
      </div>
    </div>
  );
}
