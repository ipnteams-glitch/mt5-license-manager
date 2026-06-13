"use client";

import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import type { Member, Port, Payment } from "@/types";
import { PACKAGES, ALL_SYSTEMS } from "@/types";
import BROKERS from "@/../brokers.json";

type Props = {
  member: Member;
  ports: Port[];
  portsUsed: number;
  portsTotal: number;
  packageLabel: string;
  daysLeft: number;
  isExpired: boolean;
  isAdmin: boolean;
  pendingPayments?: Payment[];
  paymentHistory?: Payment[];
};

export default function DashboardClient({
  member,
  ports,
  portsUsed,
  portsTotal,
  packageLabel,
  daysLeft,
  isExpired,
  isAdmin,
  pendingPayments,
  paymentHistory,
}: Props) {
  const [showAddPort, setShowAddPort] = useState(false);
  const [mt5Account, setMt5Account] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [portList, setPortList] = useState(ports);
  const [usedCount, setUsedCount] = useState(portsUsed);

  // Package display — updatable after payment
  const [displayPkgLabel, setDisplayPkgLabel] = useState(packageLabel);
  const [displayDaysLeft, setDisplayDaysLeft] = useState(daysLeft);
  const [displayIsExpired, setDisplayIsExpired] = useState(isExpired);
  const [displayPortsTotal, setDisplayPortsTotal] = useState(portsTotal);
  const [displayExpiryDate, setDisplayExpiryDate] = useState(member.expiry_date);

  // Upload slip
  const [slipUploadTxnId, setSlipUploadTxnId] = useState<string | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipUploading, setSlipUploading] = useState(false);
  const [slipMsg, setSlipMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [cancellingTxnId, setCancellingTxnId] = useState<string | null>(null);
  const [pendingList, setPendingList] = useState(pendingPayments);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  // Systems config (OneComplete)
  const [systemsModalPort, setSystemsModalPort] = useState<Port | null>(null);
  const [systemsModalOpen, setSystemsModalOpen] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [savingSystems, setSavingSystems] = useState(false);
  const [multiplier, setMultiplier] = useState("1");
  const [systemsCache, setSystemsCache] = useState<Record<string, string>>({});
  const [brokerList, setBrokerList] = useState<string[]>(BROKERS);

  useEffect(() => {
    fetch("/api/ports/status")
      .then(res => res.json())
      .then(data => {
        if (data.ports) {
          const map: Record<string, any> = {};
          data.ports.forEach((p: any) => { map[p.mt5_account] = p; });
          setPortStatuses(map);
        }
      })
      .catch(() => {});
  }, []);
  const [portStatuses, setPortStatuses] = useState<Record<string, any>>({});
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBroker, setLoginBroker] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState<null | "ok" | "fail">(null);
  const [loginMsg, setLoginMsg] = useState("");



  async function handleCancelPayment(txnId: string) {
    setCancellingTxnId(txnId);
    try {
      const res = await fetch("/api/payment/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txn_id: txnId }),
      });
      if (res.ok) {
        setPendingList((prev) => prev?.filter((p) => p.id !== txnId));
      }
    } catch {} finally {
      setCancellingTxnId(null);
    }
  }

  async function handleUploadSlip() {
    if (!slipFile || !slipUploadTxnId) return;
    setSlipUploading(true);
    setSlipMsg(null);
    try {
      const fd = new FormData();
      fd.append("txn_id", slipUploadTxnId);
      fd.append("file", slipFile);
      const res = await fetch("/api/payment/upload-slip", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setSlipMsg({ ok: true, msg: data.message });
        // auto-approval สำเร็จ → อัปเดต UI
        if (data.expiry_date) {
          setPendingList((prev) => prev?.filter((p) => p.id !== slipUploadTxnId));
          // อัปเดตแพคเกจที่แสดง
          if (data.package) {
            const pkg = PACKAGES[data.package as keyof typeof PACKAGES];
            if (pkg) {
              setDisplayPkgLabel(pkg.label);
              setDisplayPortsTotal(pkg.max_ports);
            }
          }
          const exp = new Date(data.expiry_date);
          const now = new Date();
          const left = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setDisplayDaysLeft(left);
          setDisplayIsExpired(left <= 0);
          setDisplayExpiryDate(data.expiry_date);
        }
        setSlipUploadTxnId(null);
        setSlipFile(null);
      } else {
        setSlipMsg({ ok: false, msg: data.message || data.error || "เกิดข้อผิดพลาด" });
      }
    } catch (err: any) {
      setSlipMsg({ ok: false, msg: err.message });
    } finally {
      setSlipUploading(false);
    }
  }

  async function handleAddPort(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setAdding(true);

    try {
      const res = await fetch("/api/ports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mt5_account: mt5Account }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");

      setPortList([...portList, data.port]);
      setUsedCount(usedCount + 1);
      setMt5Account("");
      setShowAddPort(false);
      setSuccess(`✅ เพิ่มพอร์ต ${mt5Account} สำเร็จ`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDeletePort(portId: string) {
    setError("");
    try {
      const res = await fetch(`/api/ports?id=${portId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");

      setPortList(portList.filter((p) => p.id !== portId));
      setUsedCount(usedCount - 1);
    } catch (err: any) {
        setError(err.message);
    }
  }

  // ── Systems management ──
  async function testLogin() {
    if (!systemsModalPort || !loginPassword) return;
    setLoginLoading(true);
    setLoginStatus(null);
    setLoginMsg("");
    setError("");
    try {
      const res = await fetch("/api/ports/test-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: systemsModalPort.mt5_account,
          broker: loginBroker,
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLoginStatus("ok");
        setLoginMsg(data.message || "Login สำเร็จ");
      } else {
        setLoginStatus("fail");
        setLoginMsg(data.error || "Login ไม่สำเร็จ");
      }
    } catch (err: any) {
      setLoginStatus("fail");
      setLoginMsg(err.message || "เชื่อมต่อ VPS ไม่ได้");
    } finally {
      setLoginLoading(false);
    }
  }

  async function openSystemsModal(port: Port) {
    setSystemsModalPort(port);
    setLoginBroker(port.mt5_broker || "");
    setError("");
    setLoginStatus(null);
    setLoginMsg("");
    setLoginPassword("");
    setMultiplier("1");
    // Fetch brokers in background
    if (brokerList.length === 0) {
      try {
        const res = await fetch("/api/brokers");
        if (res.ok) {
          const data = await res.json();
          setBrokerList(data.brokers || []);
        }
      } catch {}
    }
    // Check ownership BEFORE opening modal
    let canOpen = false;
    try {
      const res = await fetch(`/api/ports/systems?account=${port.mt5_account}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ไม่สามารถตรวจสอบสถานะพอร์ตได้");
        return;
      }
      if (data.owned_by_other) {
        setError("พอร์ตนี้ถูกใช้โดยสมาชิกอื่นแล้ว — ไม่สามารถตั้งค่าระบบซ้ำได้");
        return;
      }
      const items = data.systems ? data.systems.split(",").map((s: string) => s.trim()) : [];
      setSelectedSystems(items);
      setSystemsCache(prev => ({ ...prev, [port.id]: data.systems || "" }));
      canOpen = true;
    } catch (err: any) {
      setError("ไม่สามารถเชื่อมต่อเพื่อตรวจสอบสถานะพอร์ตได้");
      return;
    }
    if (!canOpen) return;
    // Only open modal after checks pass
    setSystemsModalOpen(true);
  }

  function toggleSystem(sys: string) {
    setSelectedSystems(prev =>
      prev.includes(sys) ? prev.filter(s => s !== sys) : [...prev, sys]
    );
  }

  async function saveSystems() {
    if (!systemsModalPort) return;
    setSavingSystems(true);
    try {
      const systems = selectedSystems.join(",");
      const res = await fetch("/api/ports/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: systemsModalPort.mt5_account, systems, password: loginPassword, broker: loginBroker, multiplier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSystemsCache(prev => ({ ...prev, [systemsModalPort.id]: systems }));
      setSystemsModalOpen(false);
      setSystemsModalPort(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingSystems(false);
    }
  }

  function getSystemsDisplay(portId: string): string {
    const s = systemsCache[portId];
    if (s === undefined) return "...";
    return s || "-";
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <a href="https://www.harvestfarm.site" target="_blank" rel="noopener" className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white hover:opacity-80">MT5</a>
              <span className="text-sm font-semibold text-zinc-800">License Manager</span>
            </div>
            <div className="flex items-center gap-1.5">
              <a href="/portfolio" className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700">📊 Portfolio</a>
              <a href="/renew" className="rounded bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-1 text-xs font-medium text-white">🔐 ต่ออายุ</a>
              {isAdmin && <a href="/admin" className="rounded border px-3 py-1 text-xs font-medium">⚙️ จัดการ</a>}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <a href="https://line.me/R/ti/p/@harvestfarm" target="_blank" className="rounded bg-green-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-green-600">Line: @harvestfarm</a>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{member.email}</span>
              <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs text-zinc-500 hover:text-red-500">ออก</button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Package Card */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-zinc-800">📦 แพคเกจของคุณ</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-zinc-500">แพคเกจ</p>
                <p className="font-semibold text-zinc-900">{displayPkgLabel}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">สถานะ</p>
                {displayIsExpired ? (
                  <p className="font-semibold text-red-600">❌ หมดอายุแล้ว</p>
                ) : displayDaysLeft > 0 ? (
                  <p className="font-semibold text-green-600">✅ เหลือ {displayDaysLeft} วัน</p>
                ) : (
                  <p className="font-semibold text-zinc-500">ไม่มีแพคเกจ</p>
                )}
              </div>
              <div>
                <p className="text-sm text-zinc-500">โควต้าพอร์ต</p>
                <p className="font-semibold text-zinc-900">
                  {usedCount} / {displayPortsTotal}
                  {displayPortsTotal > 0 && (
                    <span className="ml-2 text-xs text-zinc-400">
                      ({displayPortsTotal - usedCount} เหลือ)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <a
              href="https://drive.google.com/drive/folders/16l_45ZJOdT-qAtkU2gB9S5eWrVlHf_J9"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 self-center"
            >
              <img
                src="/downloadea.png"
                alt="Download EA"
                className="w-32 h-auto rounded-lg hover:opacity-80 transition-opacity"
              />
            </a>
          </div>
        </div>

        {/* Ports List */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-800">🔌 พอร์ต MT5 ของคุณ</h2>
            {displayPortsTotal > 0 && usedCount < displayPortsTotal && !displayIsExpired && (
              <button
                onClick={() => setShowAddPort(!showAddPort)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + เพิ่มพอร์ต
              </button>
            )}
            {displayPortsTotal === 0 && (
              <span className="text-xs text-zinc-400">ยังไม่มีแพคเกจ</span>
            )}
            {displayIsExpired && (
              <span className="text-xs text-red-500">แพคเกจหมดอายุ — ติดต่อแอดมินเพื่อต่ออายุ</span>
            )}
          </div>

          {/* Error / Success */}
          {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          {success && <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</p>}

          {/* Add Port Form */}
          {showAddPort && (
            <form onSubmit={handleAddPort} className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  หมายเลขพอร์ต MT5
                </label>
                <input
                  type="text"
                  required
                  value={mt5Account}
                  onChange={(e) => setMt5Account(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="12345678"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {adding ? "กำลังบันทึก..." : "💾 บันทึก"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPort(false)}
                  className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-200"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          )}

          {/* Ports Table */}
          {portList.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              {displayPortsTotal > 0 ? "ยังไม่มีพอร์ต — กด + เพิ่มพอร์ต เพื่อเพิ่ม" : "ยังไม่มีแพคเกจ — ติดต่อแอดมิน"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-zinc-500">
                    <th className="pb-2">MT5 Account</th>
                    <th className="pb-2">วันที่เพิ่ม</th>
                    <th className="pb-2">หมดอายุ</th>
                    <th className="pb-2 text-right">สถานะ</th>
                    <th className="pb-2 text-right">ฝากรัน</th>
                    <th className="pb-2 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {portList.map((port) => (
                    <tr key={port.id} className="border-b border-zinc-100">
                      <td className="py-3 font-mono font-medium text-zinc-800">{port.mt5_account}</td>
                      <td className="py-3 text-zinc-500">
                        {new Date(port.created_at).toLocaleDateString("en-GB")}
                      </td>
                      <td className="py-3">
                        {displayExpiryDate ? (
                          <span className={displayIsExpired ? "text-red-500 font-medium" : "text-zinc-600"}>
                            {new Date(displayExpiryDate).toLocaleDateString("en-GB")}
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => openSystemsModal(port)}
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >⚙️</button>
                      </td>
                      <td className="py-3 text-xs text-blue-600 font-medium text-right">
                        {portStatuses[port.mt5_account]?.systems || "-"}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => { if (confirm("ยืนยันลบพอร์ตนี้?")) handleDeletePort(port.id); }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          🗑 ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Payments — อัปโหลดสลิป */}
        {slipMsg?.ok && <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-700 shadow-sm">{slipMsg.msg}</div>}
        {slipMsg && !slipMsg.ok && <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600 shadow-sm">{slipMsg.msg}</div>}
        {pendingList && pendingList.length > 0 && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-zinc-800">📎 รายการรอชำระเงิน</h2>
            <div className="space-y-3">
              {pendingList.map((p) => {
                const pkgInfo = PACKAGES[p.package];
                const isOpen = slipUploadTxnId === p.id;
                return (
                  <div key={p.id} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-zinc-800">{pkgInfo?.name || p.package}</p>
                        <p className="text-xs text-zinc-500">
                          {p.amount.toFixed(2)} บาท · {new Date(p.created_at).toLocaleDateString("th-TH")}
                        </p>
                      </div>
                      {!isOpen ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setSlipUploadTxnId(p.id); setSlipFile(null); setSlipMsg(null); }}
                            className="rounded-lg border-2 border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-blue-400 hover:text-blue-600 transition-all"
                          >
                            📎 อัปโหลดสลิป
                          </button>
                          <button
                            onClick={() => handleCancelPayment(p.id)}
                            disabled={cancellingTxnId === p.id}
                            className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                          >
                            {cancellingTxnId === p.id ? "..." : "❌"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {isOpen && (
                      <div className="mt-3 rounded-lg bg-zinc-50 p-3">
                        <p className="text-xs text-zinc-500 mb-2">อัปโหลดรูปสลิปการโอนเงิน</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            setSlipFile(e.target.files?.[0] || null);
                            setSlipMsg(null);
                          }}
                          className="mb-2 w-full text-xs text-zinc-600 file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:text-blue-600"
                        />
                        {slipFile && (
                          <p className="text-xs text-zinc-400 mb-2">{slipFile.name} ({(slipFile.size / 1024).toFixed(0)} KB)</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={handleUploadSlip}
                            disabled={!slipFile || slipUploading}
                            className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {slipUploading ? "กำลังตรวจสอบ..." : "📤 ส่งสลิป"}
                          </button>
                          <button
                            onClick={() => { setSlipUploadTxnId(null); setSlipFile(null); setSlipMsg(null); }}
                            className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-200"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* ── Payment History ── */}
        {paymentHistory && paymentHistory.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowPaymentHistory(!showPaymentHistory)}
              className="flex w-full items-center justify-between rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition-all"
            >
              <span className="text-sm font-semibold text-zinc-700">
                📋 ประวัติการชำระเงิน ({paymentHistory.length} รายการ)
              </span>
              <span className={`text-zinc-400 transition-transform ${showPaymentHistory ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>
            {showPaymentHistory && (
              <div className="mt-2 rounded-xl bg-white p-6 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-semibold text-zinc-500">
                        <th className="pb-2 pr-2">วันที่</th>
                        <th className="pb-2 pr-2">แพคเกจ</th>
                        <th className="pb-2 pr-2">จำนวนเงิน</th>
                        <th className="pb-2 text-right">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...paymentHistory].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((p) => {
                        const pkgInfo = PACKAGES[p.package];
                        const statusLabel =
                          p.status === "paid"
                            ? "✅ จ่ายแล้ว"
                            : p.status === "failed"
                            ? "❌ ยกเลิก"
                            : "⏳ รอดำเนินการ";
                        const statusColor =
                          p.status === "paid"
                            ? "text-green-600"
                            : p.status === "failed"
                            ? "text-red-500"
                            : "text-yellow-600";
                        return (
                          <tr key={p.id} className="border-b border-zinc-100">
                            <td className="py-2 pr-2 text-zinc-500 text-xs">
                              {new Date(p.created_at).toLocaleString("th-TH", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-2 pr-2 font-medium text-zinc-800 text-xs">
                              {pkgInfo?.name || p.package}
                            </td>
                            <td className="py-2 pr-2 text-zinc-600 text-xs">
                              {p.amount.toFixed(2)} บาท
                            </td>
                            <td className={`py-2 text-right text-xs font-medium ${statusColor}`}>
                              {statusLabel}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Systems Config Modal ── */}
        {systemsModalOpen && systemsModalPort && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-bold text-zinc-800 mb-1">
                ตั้งค่าระบบ — {systemsModalPort.mt5_account}
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                ใส่ Master Password แล้วกด Login เพื่อทดสอบ
              </p>

              {error && (
                <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
              )}

              {/* ── Broker ── */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Broker Server
                </label>
                <select
                  value={loginBroker}
                  onChange={(e) => setLoginBroker(e.target.value)}
                  disabled={loginStatus === "ok"}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none disabled:bg-zinc-100"
                >
                  <option value="">-- เลือก Broker --</option>
                  {brokerList.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* ── Password + Login ── */}
              <div className="mb-4 flex gap-2">
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={loginStatus === "ok"}
                  placeholder="Master Password"
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-zinc-100"
                />
                <button
                  onClick={testLogin}
                  disabled={loginLoading || loginStatus === "ok" || !loginPassword || !loginBroker}
                  className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {loginLoading ? "กำลังทดสอบ..." : loginStatus === "ok" ? "✓ ผ่าน" : "Login"}
                </button>
              </div>

              {loginStatus === "ok" && (
                <p className="mb-4 text-xs text-emerald-600 font-medium">
                  ✓ Login สำเร็จ — รหัสเทรดถูกต้อง
                </p>
              )}
              {loginStatus === "fail" && (
                <p className="mb-4 text-xs text-red-500 font-medium">
                  ✗ {loginMsg || "Login ไม่สำเร็จ — ตรวจสอบรหัสเทรด"}
                </p>
              )}

              {/* ── System Dropdown (disabled until login passes) ── */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  เลือกระบบ
                </label>
                <select
                  value={selectedSystems[0] || ""}
                  onChange={(e) => setSelectedSystems(e.target.value ? [e.target.value] : [])}
                  disabled={loginStatus !== "ok"}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm bg-white text-blue-600 font-medium focus:border-blue-500 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  <option value="">-- ไม่เลือก (ลูกค้าใช้ EA เอง) --</option>
                  {ALL_SYSTEMS.map(sys => (
                    <option key={sys} value={sys}>{sys.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              {/* ── Multiplier ── */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  คูณ (x1 - x20)
                </label>
                <select
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                  disabled={loginStatus !== "ok"}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm bg-white text-blue-600 font-medium focus:border-blue-500 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  {Array.from({length: 20}, (_, i) => i + 1).map(n => (
                    <option key={n} value={String(n)}>x{n}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-between items-center">
                <div className="text-xs text-zinc-400">
                  {loginStatus !== "ok"
                    ? "กรุณา Login ก่อน"
                    : selectedSystems.length > 0
                    ? `ระบบที่เลือก: ${selectedSystems[0]}`
                    : "ยังไม่ได้เลือกระบบ (ลูกค้าจะใช้ EA เอง)"}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSystemsModalOpen(false);
                      setSystemsModalPort(null);
                      setError("");
                      setLoginPassword("");
                      setLoginBroker("");
                      setLoginStatus(null);
                      setLoginMsg("");
                      setMultiplier("1");
                    }}
                    className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={saveSystems}
                    disabled={savingSystems || loginStatus !== "ok"}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingSystems ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}      </main>
    </div>
  );
}