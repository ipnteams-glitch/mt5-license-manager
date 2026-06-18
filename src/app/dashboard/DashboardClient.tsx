"use client";

import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import type { Member, Port, Payment } from "@/types";
import { useT } from "@/lib/LanguageContext";
import LangSwitch from "@/components/LangSwitch";
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
  addonIbVpsExpiry?: string;
  ibVpsChoice?: string;
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
  addonIbVpsExpiry,
  ibVpsChoice,
  pendingPayments,
  paymentHistory,
}: Props) {
  const { t } = useT();
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
  const [ibVpsChoiceState, setIbVpsChoiceState] = useState(ibVpsChoice);
  const [showVpsConfirm, setShowVpsConfirm] = useState<"1" | "2" | null>(null);
  const [savingVpsChoice, setSavingVpsChoice] = useState(false);
  const [approveText, setApproveText] = useState("");
  const [showApprove, setShowApprove] = useState(false);
  const [systemsModalOpen, setSystemsModalOpen] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [savingSystems, setSavingSystems] = useState(false);
  const [multiplier, setMultiplier] = useState("1.0");
  const [systemsCache, setSystemsCache] = useState<Record<string, string>>({});
  const [brokerList, setBrokerList] = useState<string[]>(BROKERS);

  // Show approve popup on first visit
  useEffect(() => {
    fetch("/api/approve")
      .then(res => res.json())
      .then(data => {
        if (data.text) {
          setApproveText(data.text);
          setShowApprove(true);
        }
      })
      .catch(() => {});
  }, []);

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
  const [deleteConfirm, setDeleteConfirm] = useState<Port | null>(null);



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
        setSlipMsg({ ok: false, msg: data.message || data.error || t("error_occurred") });
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
      if (!res.ok) throw new Error(data.error || t("error_occurred"));

      setPortList([...portList, data.port]);
      setUsedCount(usedCount + 1);
      setMt5Account("");
      setShowAddPort(false);
      setSuccess(t("add_port_success", { account: mt5Account }));
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
      if (!res.ok) throw new Error(data.error || t("error_occurred"));

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
        setLoginMsg(data.message || t("login_ok"));
      } else {
        setLoginStatus("fail");
        setLoginMsg(data.error || t("login_fail"));
      }
    } catch (err: any) {
      setLoginStatus("fail");
      setLoginMsg(err.message || t("error_occurred"));
    } finally {
      setLoginLoading(false);
    }
  }

  async function openSystemsModal(port: Port) {
    if (ibVpsChoiceState !== "2") return; // Only auto-config users can access
    setSystemsModalPort(port);
    setLoginBroker(port.mt5_broker || "");
    setError("");
    setLoginStatus(null);
    setLoginMsg("");
    setLoginPassword("");
    setMultiplier("1.0");
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
        setError(data.error || t("error_occurred"));
        return;
      }
      if (data.owned_by_other) {
        setError(t("error_occurred"));
        return;
      }
      const items = data.systems ? data.systems.split(",").map((s: string) => s.trim()) : [];
      setSelectedSystems(items);
      setMultiplier(data.multiplier || "1.0");
      setLoginPassword(data.password || "");
      setLoginBroker(data.broker || port.mt5_broker || "");
      setSystemsCache(prev => ({ ...prev, [port.id]: data.systems || "" }));
      canOpen = true;
    } catch (err: any) {
      setError(t("error_occurred"));
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
      // Update portStatuses immediately for table display
      setPortStatuses(prev => ({
        ...prev,
        [systemsModalPort.mt5_account]: {
          ...(prev[systemsModalPort.mt5_account] || {}),
          systems,
        }
      }));
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

  async function handleSaveVpsChoice() {
    if (!showVpsConfirm) return;
    setSavingVpsChoice(true);
    try {
      const res = await fetch("/api/member/ib-vps-choice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: showVpsConfirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setIbVpsChoiceState(showVpsConfirm);
      setShowVpsConfirm(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingVpsChoice(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="flex justify-end px-4 py-2"><LangSwitch /></div>
        <div className="mx-auto max-w-4xl px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <a href="https://www.harvestfarm.site" target="_blank" rel="noopener" className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white hover:opacity-80">MT5</a>
              <span className="text-sm font-semibold text-zinc-800">License Manager</span>
            </div>
            <div className="flex items-center gap-1.5">
              <a href="/portfolio" className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700">📊 Portfolio</a>
              <a href="/renew" className="rounded bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-1 text-xs font-medium text-white">{t("renew")}</a>
              {isAdmin && <a href="/admin" className="rounded border px-3 py-1 text-xs font-medium">{t("admin_panel")}</a>}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <a href="https://line.me/R/ti/p/@harvestfarm" target="_blank" className="rounded bg-green-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-green-600">Line: @harvestfarm</a>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{member.email}</span>
              <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs text-zinc-500 hover:text-red-500">{t("sign_out")}</button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Package Card */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-zinc-800">{t("your_package")}</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-zinc-500">{t("dash_package")}</p>
                <p className="font-semibold text-zinc-900">{displayPkgLabel}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">{t("status")}</p>
                {displayIsExpired ? (
                  <p className="font-semibold text-red-600">{t("dash_expired_label")}</p>
                ) : displayDaysLeft > 0 ? (
                  <p className="font-semibold text-green-600">{t("dash_days_left", { n: displayDaysLeft })}</p>
                ) : (
                  <p className="font-semibold text-zinc-500">{t("dash_no_package")}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-zinc-500">{t("dash_quota")}</p>
                <p className="font-semibold text-zinc-900">
                  {usedCount} / {displayPortsTotal}
                  {displayPortsTotal > 0 && (
                    <span className="ml-2 text-xs text-zinc-400">
                      ({t("dash_remaining", { n: displayPortsTotal - usedCount })})
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

        {addonIbVpsExpiry && (
          <div className="rounded-lg bg-purple-50 px-3 py-2 border border-purple-200">
            <p className="text-sm font-medium text-purple-700">
              {t("dash_ib_vps_expiry", { date: new Date(addonIbVpsExpiry).toLocaleDateString("th-TH") })}
              {" "}({Math.ceil((new Date(addonIbVpsExpiry).getTime() - Date.now()) / 86400000)} {t("dash_days")})
            </p>
            {/* IB+VPS Choice Buttons */}
            {!ibVpsChoiceState ? (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setShowVpsConfirm("1")}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  ตั้งค่า EA เอง
                </button>
                <button
                  onClick={() => setShowVpsConfirm("2")}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                >
                  ตั้งค่าอัตโนมัติ
                </button>
              </div>
            ) : (
              <p className="mt-1 text-xs font-medium text-purple-800">
                {ibVpsChoiceState === "1" ? "✅ ตั้งค่า EA เอง" : "✅ ตั้งค่าอัตโนมัติ"}
              </p>
            )}
          </div>
        )}

        {/* Ports List */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-800">{t("dash_your_ports")}</h2>
            {displayPortsTotal > 0 && usedCount < displayPortsTotal && !displayIsExpired && (
              <button
                onClick={() => setShowAddPort(!showAddPort)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t("add_port")}
              </button>
            )}
            {displayPortsTotal === 0 && (
              <span className="text-xs text-zinc-400">{t("dash_no_package")}</span>
            )}
            {displayIsExpired && (
              <span className="text-xs text-red-500">{t("dash_pkg_expired_hint")}</span>
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
                  {t("mt5_account_placeholder")}
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
                  {adding ? t("saving") : t("dash_save_btn")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPort(false)}
                  className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-200"
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          )}

          {/* Ports Table */}
          {portList.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              {displayPortsTotal > 0 ? t("dash_no_ports_hint2") : t("dash_no_pkg_hint2")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-zinc-500">
                    <th className="pb-2">MT5 Account</th>
                    <th className="pb-2">{t("admin_col_date_added")}</th>
                    <th className="pb-2 text-red-600 font-bold">{t("dash_col_expiry")}</th>
                    <th className="pb-2 text-right">{t("dash_col_select")}</th>
                    <th className="pb-2 text-right text-yellow-600 font-bold">{t("dash_col_run")}</th>
                    <th className="pb-2 text-right">{t("admin_col_manage")}</th>
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
                          disabled={!displayPkgLabel?.includes("Premium") && !displayPkgLabel?.includes("VIP") && !displayPkgLabel?.includes("Live With Us") && !isAdmin}
                          className={!displayPkgLabel?.includes("Premium") && !displayPkgLabel?.includes("VIP") && !displayPkgLabel?.includes("Live With Us") && !isAdmin ? "text-xs text-zinc-300 cursor-not-allowed" : "text-xs text-blue-500 hover:text-blue-700"}
                        >⚙️</button>
                      </td>
                      <td className="py-3 text-xs font-bold text-right text-blue-600">
                        {portStatuses[port.mt5_account]?.systems || "-"}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setDeleteConfirm(port)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          {t("dash_delete_btn")}
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
            <h2 className="mb-4 text-lg font-bold text-zinc-800">{t("pending_payments")}</h2>
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
                          {p.amount.toFixed(2)} THB · {new Date(p.created_at).toLocaleDateString("th-TH")}
                        </p>
                      </div>
                      {!isOpen ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setSlipUploadTxnId(p.id); setSlipFile(null); setSlipMsg(null); }}
                            className="rounded-lg border-2 border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-blue-400 hover:text-blue-600 transition-all"
                          >
                            {t("dash_upload_slip")}
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
                        <p className="text-xs text-zinc-500 mb-2">{t("dash_upload_slip_hint")}</p>
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
                            {slipUploading ? t("verifying") : t("upload")}
                          </button>
                          <button
                            onClick={() => { setSlipUploadTxnId(null); setSlipFile(null); setSlipMsg(null); }}
                            className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-200"
                          >
                            {t("cancel")}
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
                {t("dash_payment_history", { n: paymentHistory.length })}
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
                        <th className="pb-2 pr-2">{t("dash_col_date")}</th>
                        <th className="pb-2 pr-2">{t("dash_package")}</th>
                        <th className="pb-2 pr-2">{t("amount")}</th>
                        <th className="pb-2 text-right">{t("status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...paymentHistory].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((p) => {
                        const pkgInfo = PACKAGES[p.package];
                        const statusLabel =
                          p.status === "paid"
                            ? t("paid")
                            : p.status === "failed"
                            ? t("admin_cancel")
                            : t("pending");
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
                              {p.amount.toFixed(2)} {t("dash_baht")}
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
                {t("sys_config_title", { account: systemsModalPort.mt5_account })}
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                {t("sys_login_hint")}
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
                  <option value="">{t("sys_select_broker")}</option>
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
                  {loginLoading ? t("sys_testing") : loginStatus === "ok" ? t("sys_login_ok") : t("login")}
                </button>
              </div>

              {loginStatus === "ok" && (
                <p className="mb-4 text-xs text-emerald-600 font-medium">
                  {t("dash_login_ok_msg")}
                </p>
              )}
              {loginStatus === "fail" && (
                <p className="mb-4 text-xs text-red-500 font-medium">
                  ✗ {loginMsg || t("sys_login_fail")}
                </p>
              )}

              {/* ── System Dropdown (disabled until login passes) ── */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {t("sys_select_system")}
                </label>
                <select
                  value={selectedSystems[0] || ""}
                  onChange={(e) => setSelectedSystems(e.target.value ? [e.target.value] : [])}
                  disabled={loginStatus !== "ok"}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm bg-white text-blue-600 font-medium focus:border-blue-500 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  <option value="">{t("sys_no_select")}</option>
                  {ALL_SYSTEMS.map(sys => (
                    <option key={sys} value={sys}>{sys.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              {/* ── Multiplier ── */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {t("sys_multiplier_label")}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="99"
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                  disabled={loginStatus !== "ok"}
                  placeholder="1.0"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-blue-600 font-medium focus:border-blue-500 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-400"
                />
              </div>

              <div className="flex gap-2 justify-between items-center">
                <div className="text-xs text-zinc-400">
                  {loginStatus !== "ok"
                    ? t("login_first")
                    : selectedSystems.length > 0
                    ? t("sys_selected", { sys: selectedSystems[0] })
                    : t("sys_not_selected")}
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
                      setMultiplier("1.0");
                    }}
                    className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-200"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={saveSystems}
                    disabled={savingSystems || loginStatus !== "ok"}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingSystems ? t("saving") : t("save")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}      {/* Custom Delete Confirm Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl text-center">
              <p className="text-lg font-medium text-zinc-800 mb-2">{t("delete_port_confirm")}</p>
              <p className="text-3xl font-bold text-red-500 mb-6">{deleteConfirm.mt5_account}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="rounded-lg px-6 py-2 text-sm text-zinc-600 hover:bg-zinc-100 border"
                >{t("no")}</button>
                <button
                  onClick={async () => {
                    await handleDeletePort(deleteConfirm.id);
                    setDeleteConfirm(null);
                  }}
                  className="rounded-lg px-6 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600"
                >{t("delete_yes")}</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Approve Terms Popup */}
      {showApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="rounded-xl bg-white p-6 shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
            <h2 className="text-lg font-bold text-zinc-800 mb-3">ข้อตกลงและเงื่อนไขการใช้งาน</h2>
            <div className="flex-1 overflow-y-auto mb-4 text-sm text-zinc-600 whitespace-pre-line border rounded-lg p-4 bg-zinc-50">
              {approveText}
            </div>
            <button
              onClick={() => {
                localStorage.setItem("agreed_terms", "1");
                setShowApprove(false);
              }}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              ยอมรับเงื่อนไขและดำเนินการต่อ
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog for IB+VPS Choice */}
      {showVpsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl bg-white p-6 shadow-2xl max-w-sm w-full mx-4">
            <p className="text-sm text-zinc-700 mb-4">
              {showVpsConfirm === "1"
                ? "คุณจะตั้งค่า EA เองทั้งหมด?"
                : "คุณจะตั้งค่าผ่านหน้าเว็ปทั้งหมดและไม่สามารถเข้าใช้งาน VPS ได้เอง"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowVpsConfirm(null)}
                className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                No
              </button>
              <button
                onClick={handleSaveVpsChoice}
                disabled={savingVpsChoice}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingVpsChoice ? "..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}