"use client";

import { useState } from "react";
import type { Member, Port, PackageType, Payment, Agent, AgentWithdrawal } from "@/types";
import { useT } from "@/lib/LanguageContext";
import LangSwitch from "@/components/LangSwitch";
import { PACKAGES } from "@/types";

type Props = { members: Member[]; ports: Port[]; payments: Payment[]; whitelist: { name: string; broker: string; created_at: string }[]; agents: Agent[] };

export default function AdminClient({ members, ports, payments, whitelist, agents }: Props) {
  const { t } = useT();
  const [memberList, setMemberList] = useState(members);
  const [editing, setEditing] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PackageType>("none");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"members" | "ports" | "payments" | "whitelist" | "agents">("members");
  const [paymentList, setPaymentList] = useState(payments);
  const [verifyingPayId, setVerifyingPayId] = useState<string | null>(null);
  const [wlList, setWlList] = useState(whitelist);
  const [wlName, setWlName] = useState("");
  const [wlBroker, setWlBroker] = useState("");
  const [wlAdding, setWlAdding] = useState(false);

  // Agent state
  const [agentList, setAgentList] = useState(agents);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [agentForm, setAgentForm] = useState<Agent>({ agent_code: "", name: "", email: "", discount_percent: 10, commission_percent: 10, discount_vps_percent: 10, commission_vps_percent: 10, commission_earned: 0, commission_paid: 0, created_at: "", bank_name: "", bank_account: "" });
  const [agentSaving, setAgentSaving] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  // Commission detail (read-only)
  const [detailAgent, setDetailAgent] = useState<string | null>(null);
  const [pendingWds, setPendingWds] = useState<AgentWithdrawal[]>([]);
  const [markingWd, setMarkingWd] = useState<string | null>(null);
  const [showWdHistory, setShowWdHistory] = useState(false);
  const [wdPage, setWdPage] = useState(0);

  async function handleSaveAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!agentForm.agent_code.trim() || !agentForm.name.trim() || !agentForm.email.trim()) return;
    setAgentSaving(true);
    try {
      const res = await fetch("/api/agent/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentForm),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAgentList(prev => {
        const idx = prev.findIndex(a => a.agent_code === data.agent.agent_code);
        if (idx >= 0) { const next = [...prev]; next[idx] = data.agent; return next; }
        return [...prev, data.agent];
      });
      setShowAddAgent(false);
      setMsg(t("saving_success"));
    } catch { setMsg(t("save_failed")); }
    finally { setAgentSaving(false); }
  }

  async function handleDeleteAgent(code: string) {
    try {
      const res = await fetch(`/api/agent/manage?code=${encodeURIComponent(code)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setAgentList(prev => prev.filter(a => a.agent_code !== code));
      setMsg("ลบตัวแทนแล้ว");
    } catch { setMsg("ลบไม่สำเร็จ"); }
  }

  async function handleMarkPaid(code: string) {
    setMarkingPaid(code);
    try {
      const res = await fetch("/api/agent/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid", agent_code: code }),
      });
      if (!res.ok) throw new Error("Failed");
      setAgentList(prev => prev.map(a => a.agent_code === code ? { ...a, commission_paid: a.commission_earned } : a));
      setMsg("✅ จ่ายคอมมิชชั่นแล้ว");
    } catch { setMsg("❌ ไม่สำเร็จ"); }
    finally { setMarkingPaid(null); }
  }

  async function handleAddWhitelist(e: React.FormEvent) {
    e.preventDefault();
    if (!wlName.trim() || !wlBroker.trim()) return;
    setWlAdding(true);
    try {
      const res = await fetch("/api/admin/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wlName, broker: wlBroker }),
      });
      if (!res.ok) throw new Error("Failed");
      setWlList([...wlList, { name: wlName, broker: wlBroker, created_at: new Date().toISOString() }]);
      setWlName(""); setWlBroker("");
      setMsg(t("wl_added"));
    } catch { setMsg(t("wl_add_failed")); }
    finally { setWlAdding(false); }
  }

  async function handleRemoveWhitelist(idx: number) {
    try {
      const res = await fetch(`/api/admin/whitelist?idx=${idx}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setWlList(wlList.filter((_, i) => i !== idx));
      setMsg(t("wl_deleted"));
    } catch { setMsg(t("wl_delete_failed")); }
  }

  const [cancellingPayId, setCancellingPayId] = useState<string | null>(null);

  async function handleCancelPayment(txnId: string) {
    setCancellingPayId(txnId);
    try {
      const res = await fetch("/api/payment/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txn_id: txnId }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentList((prev) =>
          prev.map((p) => (p.id === txnId ? { ...p, status: "failed" as const } : p))
        );
        setMsg(t("payment_cancelled"));
      } else {
        setMsg(data.error || t("payment_cancelled"));
      }
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setCancellingPayId(null);
    }
  }

  async function handleAdminVerify(txnId: string) {
    setVerifyingPayId(txnId);
    try {
      const res = await fetch("/api/payment/admin-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txn_id: txnId }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentList((prev) =>
          prev.map((p) => (p.id === txnId ? { ...p, status: "paid" as const, paid_at: new Date().toISOString() } : p))
        );
        setMsg(`${t("admin_verify")} ${txnId.slice(0, 8)}...`);
      } else {
        setMsg(`❌ ${data.message}`);
      }
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setVerifyingPayId(null);
    }
  }

  const pkgOptions: PackageType[] = ["free", "1000_2m", "3900_6m", "live_with_us", "ib_vps_2200", "none"];

  function startEdit(m: Member) {
    setEditing(m.email);
    setSelectedPkg(m.package);
    setExpiryDate(m.expiry_date ? m.expiry_date.slice(0, 10) : "");
    setMsg("");
  }

  async function saveEdit() {
    setSaving(true);
    setMsg("");
    try {
      // Free package: auto-set unlimited expiry
      const finalExpiry = selectedPkg === "free" ? "2099-12-31" : expiryDate;
      const res = await fetch("/api/admin/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editing, package: selectedPkg, expiry_date: finalExpiry }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");

      setMemberList((prev) =>
        prev.map((m) =>
          m.email === editing
            ? { ...m, package: selectedPkg, max_ports: PACKAGES[selectedPkg].max_ports, expiry_date: finalExpiry }
            : m
        )
      );
      setEditing(null);
      setMsg(t("admin_update_success", { email: editing! }));
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function getPortCount(email: string) {
    return ports.filter((p) => p.member_email === email && p.status === t("active")).length;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="flex justify-end px-4 py-2"><LangSwitch /></div>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-2 py-1">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-base font-bold text-white">A</div>
            <span className="font-semibold text-zinc-800">Admin Panel</span>
          </div>
          <a href="/dashboard" className="text-base text-blue-600 hover:underline">Dashboard</a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-3">
        <div className="mb-6 flex gap-2">
          {(["members", "ports", "payments", "whitelist", "agents"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-base font-medium ${activeTab === tab ? "bg-blue-600 text-white" : "bg-white text-black hover:bg-zinc-100"}`}
            >
              {tab === "members" ? t("admin_tab_members") : tab === "ports" ? t("admin_tab_ports") : tab === "payments" ? t("admin_tab_payments") : tab === "whitelist" ? t("admin_whitelist_count", { count: wlList.length }) : "🏷️ ตัวแทน"}
            </button>
          ))}
        </div>

        {msg && (
          <div className={`mb-4 rounded-lg p-3 text-base ${msg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {msg}
          </div>
        )}

        {activeTab === "members" && (
          <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-zinc-50 text-left text-xs font-medium text-black">
                  <th className="px-2 py-1">{t("admin_col_email")}</th>
                  <th className="px-2 py-1">{t("wl_name")}</th>
                  <th className="px-2 py-1">{t("admin_col_package")}</th>
                  <th className="px-2 py-1">{t("admin_col_quota")}</th>
                  <th className="px-2 py-1">{t("admin_col_expiry")}</th>
                  <th className="px-2 py-1">{t("admin_col_ports")}</th>
                  <th className="px-2 py-1 text-right">{t("admin_col_manage")}</th>
                </tr>
              </thead>
              <tbody>
                {memberList.map((m) => {
                  const used = getPortCount(m.email);
                  const isEditing = editing === m.email;
                  return (
                    <tr key={m.email} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="px-2 py-1 font-mono text-xs text-black">{m.email}</td>
                      <td className="px-2 py-1 font-medium text-zinc-800">{m.name}</td>
                      <td className="px-2 py-1">
                        {isEditing ? (
                          <select value={selectedPkg} onChange={(e) => { setSelectedPkg(e.target.value as PackageType); if (e.target.value === "free") setExpiryDate("2099-12-31"); }} className="rounded border border-zinc-300 px-2 py-1 text-xs text-gray-900">
                            {pkgOptions.map((k) => (<option key={k} value={k}>{PACKAGES[k].label}</option>))}
                          </select>
                        ) : (
                          <span className={m.package === "none" ? "text-zinc-400" : "text-green-700"}>{PACKAGES[m.package].name}</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-black">{m.max_ports}</td>
                      <td className="px-2 py-1">
                        {isEditing ? (
                          <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="rounded border border-zinc-300 px-2 py-1 text-xs text-gray-900" />
                        ) : (
                          <span className={m.expiry_date && new Date(m.expiry_date) <= new Date() ? "text-red-500" : "text-black"}>
                            {m.expiry_date ? new Date(m.expiry_date).toLocaleDateString("en-GB") : "-"}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <span className={`text-xs font-medium ${used >= m.max_ports && m.max_ports > 0 ? "text-orange-500" : "text-black"}`}>
                          {used}/{m.max_ports}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-right">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <button onClick={saveEdit} disabled={saving} className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50">{saving ? t("loading") : "💾"}</button>
                            <button onClick={() => setEditing(null)} className="rounded px-3 py-1 text-xs text-black hover:bg-zinc-200">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(m)} className="text-xs text-blue-600 hover:underline">{t("edit")}</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "ports" && (
          <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-zinc-50 text-left text-xs font-medium text-black">
                  <th className="px-2 py-1">{t("admin_col_account")}</th>
                  <th className="px-2 py-1">{t("wl_broker")}</th>
                  <th className="px-2 py-1">{t("admin_col_owner")}</th>
                  <th className="px-2 py-1">{t("status")}</th>
                  <th className="px-2 py-1">{t("wl_date_added")}</th>
                </tr>
              </thead>
              <tbody>
                {ports.filter((p) => p.status === t("active")).map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-2 py-1 font-mono font-medium text-zinc-800">{p.mt5_account}</td>
                    <td className="px-2 py-1 text-black">{p.mt5_broker}</td>
                    <td className="px-2 py-1 text-xs text-black">{p.member_email}</td>
                    <td className="px-2 py-1"><span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">active</span></td>
                    <td className="px-2 py-1 text-black">{new Date(p.created_at).toLocaleDateString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-zinc-50 text-left text-xs font-semibold text-black">
                  <th className="px-2 py-1">{t("admin_col_time")}</th>
                  <th className="px-2 py-1">{t("admin_col_email")}</th>
                  <th className="px-2 py-1">{t("admin_col_package")}</th>
                  <th className="px-2 py-1">{t("admin_col_amount")}</th>
                  <th className="px-2 py-1">{t("status")}</th>
                  <th className="px-2 py-1 text-right">{t("admin_col_manage")}</th>
                </tr>
              </thead>
              <tbody>
                {paymentList
                  .slice()
                  .reverse()
                  .map((p) => {
                    const isPending = p.status === "pending";
                    return (
                      <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                        <td className="px-2 py-1 text-xs text-black">
                          {new Date(p.created_at).toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-2 py-1 text-xs text-black">{p.email}</td>
                        <td className="px-2 py-1 text-xs font-semibold text-black">{PACKAGES[p.package]?.name || p.package}</td>
                        <td className="px-2 py-1 font-mono text-xs font-bold text-black">{p.amount.toFixed(2)} ฿</td>
                        <td className="px-2 py-1">
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                              p.status === "paid" ? "bg-green-500 text-white" : p.status === "failed" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {p.status === "paid" ? t("paid") : p.status === "failed" ? t("failed") : t("pending")}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-right">
                          {isPending && (
                            <>
                            <button
                              onClick={() => handleAdminVerify(p.id)}
                              disabled={verifyingPayId === p.id}
                              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {verifyingPayId === p.id ? t("loading") : t("admin_verify")}
                            </button>
                            <button
                              onClick={() => handleCancelPayment(p.id)}
                              disabled={cancellingPayId === p.id}
                              className="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50 ml-1"
                            >
                              {cancellingPayId === p.id ? t("loading") : t("admin_cancel")}
                            </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {paymentList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-center text-base text-zinc-400">{t("no_data")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "whitelist" && (
          <div className="rounded-xl bg-white shadow-sm p-4">
            <form onSubmit={handleAddWhitelist} className="flex gap-2 mb-4">
              <input value={wlName} onChange={(e) => setWlName(e.target.value)} placeholder={t("wl_name")} className="flex-1 rounded border px-2 py-1 text-sm text-black" required />
              <input value={wlBroker} onChange={(e) => setWlBroker(e.target.value)} placeholder={t("wl_broker")} className="w-32 rounded border px-2 py-1 text-sm text-black" required />
              <button type="submit" disabled={wlAdding} className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50">{wlAdding ? t("loading") : t("wl_add")}</button>
            </form>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-black">
                    <th className="px-2 py-1">{t("wl_name")}</th>
                    <th className="px-2 py-1">{t("wl_broker")}</th>
                    <th className="px-2 py-1">{t("wl_date_added")}</th>
                    <th className="px-2 py-1 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {wlList.map((w, i) => (
                    <tr key={i} className="border-b border-zinc-100">
                      <td className="px-2 py-1 font-medium text-black">{w.name}</td>
                      <td className="px-2 py-1 text-black">{w.broker}</td>
                      <td className="px-2 py-1 text-zinc-500">{new Date(w.created_at).toLocaleDateString("en-GB")}</td>
                      <td className="px-2 py-1 text-right">
                        <button onClick={() => handleRemoveWhitelist(i)} className="text-xs text-red-500 hover:text-red-700">🗑</button>
                      </td>
                    </tr>
                  ))}
                  {wlList.length === 0 && (
                    <tr><td colSpan={4} className="px-2 py-4 text-center text-zinc-400">{t("no_data")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "agents" && (
          <div className="rounded-xl bg-white shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-black">🏷️ ตัวแทน ({agentList.length})</h2>
              <button onClick={() => { setShowAddAgent(true); setAgentForm({ agent_code: "", name: "", email: "", discount_percent: 0, commission_percent: 0, discount_vps_percent: 0, commission_vps_percent: 0, commission_earned: 0, commission_paid: 0, created_at: "", bank_name: "", bank_account: "" }); }} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">+ เพิ่ม</button>
            </div>

            {showAddAgent && (
              <form onSubmit={handleSaveAgent} className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-zinc-50 p-3">
                <input value={agentForm.agent_code} onChange={e => setAgentForm({...agentForm, agent_code: e.target.value})} placeholder="รหัส (เช่น JOHN20)" className="rounded border px-2 py-1 text-sm text-black" required />
                <input value={agentForm.name} onChange={e => setAgentForm({...agentForm, name: e.target.value})} placeholder="ชื่อตัวแทน" className="rounded border px-2 py-1 text-sm text-black" required />
                <input value={agentForm.email} onChange={e => setAgentForm({...agentForm, email: e.target.value})} placeholder="Gmail" className="rounded border px-2 py-1 text-sm text-black" required />
                <input value={agentForm.discount_percent || ""} onChange={e => setAgentForm({...agentForm, discount_percent: Number(e.target.value)})} placeholder="ส่วนลด %" type="number" className="rounded border px-2 py-1 text-sm text-black" />
                <input value={agentForm.commission_percent || ""} onChange={e => setAgentForm({...agentForm, commission_percent: Number(e.target.value)})} placeholder="ค่าคอม %" type="number" className="rounded border px-2 py-1 text-sm text-black" />
                <input value={agentForm.discount_vps_percent || ""} onChange={e => setAgentForm({...agentForm, discount_vps_percent: Number(e.target.value)})} placeholder="ส่วนลด VPS %" type="number" className="rounded border px-2 py-1 text-sm text-black" />
                <input value={agentForm.commission_vps_percent || ""} onChange={e => setAgentForm({...agentForm, commission_vps_percent: Number(e.target.value)})} placeholder="ค่าคอม VPS %" type="number" className="rounded border px-2 py-1 text-sm text-black" />
                <input value={agentForm.bank_name} onChange={e => setAgentForm({...agentForm, bank_name: e.target.value})} placeholder="ชื่อธนาคาร" className="rounded border px-2 py-1 text-sm text-black" />
                <input value={agentForm.bank_account} onChange={e => setAgentForm({...agentForm, bank_account: e.target.value})} placeholder="เลขบัญชี" className="rounded border px-2 py-1 text-sm text-black" />
                <div className="flex gap-2">
                  <button type="submit" disabled={agentSaving} className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50">{agentSaving ? "..." : "บันทึก"}</button>
                  <button type="button" onClick={() => setShowAddAgent(false)} className="rounded border border-zinc-200 px-3 py-1 text-sm text-black">ยกเลิก</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-black">
                    <th className="px-2 py-1">รหัส</th>
                    <th className="px-2 py-1">ชื่อ</th>
                    <th className="px-2 py-1">ส่วนลด</th>
                    <th className="px-2 py-1">ค่าคอม</th>
                    <th className="px-2 py-1">ลด VPS</th>
                    <th className="px-2 py-1">คอม VPS</th>
                    <th className="px-2 py-1 text-right">ยอดสะสม</th>
                    <th className="px-2 py-1 text-right">จ่ายแล้ว</th>
                    <th className="px-2 py-1 text-right">คงค้าง</th>
                    <th className="px-2 py-1 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {agentList.map(a => {
                    const pending = a.commission_earned - a.commission_paid;
                    return (
                      <tr key={a.agent_code} className="border-b border-zinc-100">
                        <td className="px-2 py-1 font-medium text-black">{a.agent_code}</td>
                        <td className="px-2 py-1 text-black">{a.name}</td>
                        <td className="px-2 py-1 text-black">{a.discount_percent}%</td>
                        <td className="px-2 py-1 text-black">{a.commission_percent}%</td>
                        <td className="px-2 py-1 text-black">{a.discount_vps_percent}%</td>
                        <td className="px-2 py-1 text-black">{a.commission_vps_percent}%</td>
                        <td className="px-2 py-1 text-right text-black">฿{a.commission_earned.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 py-1 text-right text-green-600">฿{a.commission_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 py-1 text-right text-amber-600">฿{pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 py-1 text-right space-x-1">
                          <button onClick={() => setDetailAgent(detailAgent === a.agent_code ? null : a.agent_code)} className="text-xs text-blue-500 hover:text-blue-700">
                            {detailAgent === a.agent_code ? "ซ่อน" : "📋"}
                          </button>
                         {pending > 0 && (
                            <button onClick={() => handleMarkPaid(a.agent_code)} disabled={markingPaid === a.agent_code}
                              className="rounded bg-green-600 px-2 py-0.5 text-xs text-white disabled:opacity-50">
                              {markingPaid === a.agent_code ? "..." : "จ่ายแล้ว"}
                            </button>
                          )}
                          <button onClick={() => { setAgentForm(a); setShowAddAgent(true); }} className="text-xs text-blue-500 hover:text-blue-700">✏️</button>
                          <button onClick={() => handleDeleteAgent(a.agent_code)} className="text-xs text-red-500 hover:text-red-700">🗑</button>
                        </td>
                      </tr>
                    );
                  })}
                  {agentList.length === 0 && (
                    <tr><td colSpan={10} className="px-2 py-4 text-center text-zinc-400">{t("no_data")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Commission Detail */}
            {detailAgent && (
              <div className="mt-4 rounded-lg bg-zinc-50 p-4">
                {agentList.find(a => a.agent_code === detailAgent)?.bank_name && (
                  <p className="text-sm text-zinc-600 mb-2">
                    🏦 {agentList.find(a => a.agent_code === detailAgent)?.bank_name}: {agentList.find(a => a.agent_code === detailAgent)?.bank_account}
                  </p>
                )}
                <h3 className="font-semibold text-black mb-2">📋 ค่าคอม — {detailAgent}</h3>
                {paymentList.filter(p => p.agent_code?.toLowerCase() === detailAgent.toLowerCase() && p.status === "paid").length === 0 ? (
                  <p className="text-sm text-zinc-400">ยังไม่มีรายการค่าคอม</p>
                ) : (
                  (() => {
                    const list = paymentList.filter(p => p.agent_code?.toLowerCase() === detailAgent.toLowerCase() && p.status === "paid");
                    const total = list.reduce((s, p) => s + (p.agent_commission || 0), 0);
                    return (
                      <>
                        <table className="w-full text-xs mb-3">
                          <thead><tr className="border-b text-left text-xs font-semibold text-zinc-500"><th className="px-2 py-1">วันที่</th><th className="px-2 py-1">ลูกค้า</th><th className="px-2 py-1">แพคเกจ</th><th className="px-2 py-1 text-right">ค่าคอม</th></tr></thead>
                          <tbody>{list.map(p => (
                            <tr key={p.id} className="border-b border-zinc-100">
                              <td className="px-2 py-1 text-zinc-600">{new Date(p.paid_at || p.created_at).toLocaleDateString("en-GB")}</td>
                              <td className="px-2 py-1 text-black">{p.email}</td>
                              <td className="px-2 py-1 text-black">{p.package}</td>
                              <td className="px-2 py-1 text-right text-green-600 font-medium">฿{(p.agent_commission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                        <p className="text-sm font-semibold text-amber-700">💰 รวม: ฿{total.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({list.length} รายการ)</p>
                      </>
                    );
                  })()
                )}
              </div>
            )}

            {/* Pending Withdrawals */}
            {detailAgent && (
              <div className="mt-2">
                <button onClick={async () => { try { const r = await fetch("/api/agent/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list_withdrawals", agent_code: detailAgent }) }); const d = await r.json(); setPendingWds(d.withdrawals || []); } catch {} setShowWdHistory(false); }} className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">🔄 โหลดรายการถอน</button>
                <button onClick={() => { setShowWdHistory(!showWdHistory); setWdPage(0); }} className="ml-2 rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50">{showWdHistory ? "ซ่อนประวัติ" : "📜 ประวัติ"}</button>
                <button onClick={async () => { try { const r = await fetch("/api/agent/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list_withdrawals", agent_code: detailAgent }) }); const d = await r.json(); setPendingWds(d.withdrawals || []); setShowWdHistory(!showWdHistory); setWdPage(0); } catch {} }} className="ml-2 rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50">{showWdHistory ? "ซ่อนประวัติ" : "📜 ประวัติการถอน"}</button>
                {pendingWds.filter((w: any) => w.status === "pending").length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-amber-700 mt-2">⏳ รอชำระ ({pendingWds.filter((w: any) => w.status === "pending").length})</p>
                    <table className="w-full text-xs mt-1">
                      <thead><tr className="border-b text-xs text-zinc-500"><th className="px-2 py-1">วันที่</th><th className="px-2 py-1 text-right">จำนวน</th><th className="px-2 py-1">ธนาคาร</th><th className="px-2 py-1">เลขบัญชี</th><th className="px-2 py-1"></th></tr></thead>
                      <tbody>
                        {pendingWds.filter((w: any) => w.status === "pending").map((w: any) => (
                          <tr key={w.id} className="border-b border-zinc-100">
                            <td className="px-2 py-1 text-zinc-600">{new Date(w.created_at).toLocaleDateString("en-GB")}</td>
                            <td className="px-2 py-1 text-right font-medium">฿{w.amount.toLocaleString()}</td>
                            <td className="px-2 py-1">{w.bank_name}</td>
                            <td className="px-2 py-1 font-mono text-xs">{w.bank_account}</td>
                            <td className="px-2 py-1">
                              <button onClick={async () => { setMarkingWd(w.id); try { await fetch("/api/agent/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_withdrawal_paid", withdrawal_id: w.id }) }); setPendingWds((prev: any) => prev.filter((x: any) => x.id !== w.id)); } catch {} setMarkingWd(null); }} disabled={markingWd === w.id} className="rounded bg-green-600 px-2 py-0.5 text-xs text-white disabled:opacity-50">{markingWd === w.id ? "..." : "ชำระแล้ว"}</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {showWdHistory && (
                  <>
                    {(() => { const all = pendingWds; const pages = Math.ceil(all.length / 10); const page = all.slice(wdPage * 10, (wdPage + 1) * 10); return page.length === 0 ? <p className="text-xs text-zinc-400 mt-2">ไม่มีประวัติ</p> : (
                      <>
                        <table className="w-full text-xs mt-2"><thead><tr className="border-b text-xs text-zinc-500"><th className="px-2 py-1">วันที่</th><th className="px-2 py-1 text-right">จำนวน</th><th className="px-2 py-1">สถานะ</th></tr></thead><tbody>{page.map((w: any) => (<tr key={w.id} className="border-b border-zinc-100"><td className="px-2 py-1 text-zinc-600">{new Date(w.created_at).toLocaleDateString("en-GB")}</td><td className="px-2 py-1 text-right">฿{w.amount.toLocaleString()}</td><td className="px-2 py-1">{w.status === "paid" ? <span className="text-green-600">✅ ชำระแล้ว</span> : <span className="text-amber-600">⏳ รอ</span>}</td></tr>))}</tbody></table>
                        <div className="flex justify-between mt-2">
                          <button onClick={() => setWdPage(Math.max(0, wdPage - 1))} disabled={wdPage === 0} className="text-xs text-blue-500 disabled:text-zinc-300">← ก่อนหน้า</button>
                          <span className="text-xs text-zinc-500">หน้า {wdPage + 1}/{pages}</span>
                          <button onClick={() => setWdPage(Math.min(pages - 1, wdPage + 1))} disabled={wdPage >= pages - 1} className="text-xs text-blue-500 disabled:text-zinc-300">ถัดไป →</button>
                        </div>
                      </>
                    ); })()}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}