"use client";

import { useState } from "react";
import type { Member, Port, PackageType, Payment } from "@/types";
import { PACKAGES } from "@/types";

type Props = { members: Member[]; ports: Port[]; payments: Payment[]; whitelist: { name: string; broker: string; created_at: string }[] };

export default function AdminClient({ members, ports, payments, whitelist }: Props) {
  const [memberList, setMemberList] = useState(members);
  const [editing, setEditing] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PackageType>("none");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"members" | "ports" | "payments">("members");
  const [paymentList, setPaymentList] = useState(payments);
  const [verifyingPayId, setVerifyingPayId] = useState<string | null>(null);
  const [wlList, setWlList] = useState(whitelist);
  const [wlName, setWlName] = useState("");
  const [wlBroker, setWlBroker] = useState("");
  const [wlAdding, setWlAdding] = useState(false);

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
      setMsg("✅ เพิ่ม whitelist แล้ว");
    } catch { setMsg("❌ เพิ่มไม่สำเร็จ"); }
    finally { setWlAdding(false); }
  }

  async function handleRemoveWhitelist(idx: number) {
    try {
      const res = await fetch(`/api/admin/whitelist?idx=${idx}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setWlList(wlList.filter((_, i) => i !== idx));
      setMsg("✅ ลบแล้ว");
    } catch { setMsg("❌ ลบไม่สำเร็จ"); }
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
        setMsg(`✅ ยืนยันการจ่าย ${txnId.slice(0, 8)}... สำเร็จ`);
      } else {
        setMsg(`❌ ${data.message}`);
      }
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setVerifyingPayId(null);
    }
  }

  const pkgOptions: PackageType[] = ["free", "1000_2m", "2000_2m", "2490_3m", "9990_1y", "none"];

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
      const res = await fetch("/api/admin/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editing, package: selectedPkg, expiry_date: expiryDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");

      setMemberList((prev) =>
        prev.map((m) =>
          m.email === editing
            ? { ...m, package: selectedPkg, max_ports: PACKAGES[selectedPkg].max_ports, expiry_date: expiryDate }
            : m
        )
      );
      setEditing(null);
      setMsg(`✅ อัปเดต ${editing} สำเร็จ`);
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function getPortCount(email: string) {
    return ports.filter((p) => p.member_email === email && p.status === "active").length;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
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
          {(["members", "ports", "payments", "whitelist"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-base font-medium ${activeTab === tab ? "bg-blue-600 text-white" : "bg-white text-black hover:bg-zinc-100"}`}
            >
              {tab === "members" ? `👥 สมาชิก` : tab === "ports" ? `🔌 พอร์ต` : tab === "payments" ? `💰 รอตรวจสอบ` : `⭐ Whitelist (${wlList.length})`}
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
                  <th className="px-2 py-1">อีเมล</th>
                  <th className="px-2 py-1">ชื่อ</th>
                  <th className="px-2 py-1">แพคเกจ</th>
                  <th className="px-2 py-1">โควต้า</th>
                  <th className="px-2 py-1">หมดอายุ</th>
                  <th className="px-2 py-1">พอร์ต</th>
                  <th className="px-2 py-1 text-right">จัดการ</th>
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
                          <select value={selectedPkg} onChange={(e) => setSelectedPkg(e.target.value as PackageType)} className="rounded border border-zinc-300 px-2 py-1 text-xs text-gray-900">
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
                            <button onClick={saveEdit} disabled={saving} className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50">{saving ? "..." : "💾"}</button>
                            <button onClick={() => setEditing(null)} className="rounded px-3 py-1 text-xs text-black hover:bg-zinc-200">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(m)} className="text-xs text-blue-600 hover:underline">แก้ไข</button>
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
                  <th className="px-2 py-1">MT5 Account</th>
                  <th className="px-2 py-1">Broker</th>
                  <th className="px-2 py-1">เจ้าของ</th>
                  <th className="px-2 py-1">สถานะ</th>
                  <th className="px-2 py-1">วันที่เพิ่ม</th>
                </tr>
              </thead>
              <tbody>
                {ports.filter((p) => p.status === "active").map((p) => (
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
                  <th className="px-2 py-1">เวลา</th>
                  <th className="px-2 py-1">อีเมล</th>
                  <th className="px-2 py-1">แพคเกจ</th>
                  <th className="px-2 py-1">จำนวน</th>
                  <th className="px-2 py-1">สถานะ</th>
                  <th className="px-2 py-1 text-right">จัดการ</th>
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
                            {p.status === "paid" ? "✅ จ่ายแล้ว" : p.status === "failed" ? "❌ ล้มเหลว" : "⏳ รอตรวจสอบ"}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-right">
                          {isPending && (
                            <button
                              onClick={() => handleAdminVerify(p.id)}
                              disabled={verifyingPayId === p.id}
                              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {verifyingPayId === p.id ? "..." : "✅ ยืนยัน"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {paymentList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-center text-base text-zinc-400">ยังไม่มีรายการ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "whitelist" && (
          <div className="rounded-xl bg-white shadow-sm p-4">
            <form onSubmit={handleAddWhitelist} className="flex gap-2 mb-4">
              <input value={wlName} onChange={(e) => setWlName(e.target.value)} placeholder="ชื่อ-สกุล" className="flex-1 rounded border px-2 py-1 text-sm" required />
              <input value={wlBroker} onChange={(e) => setWlBroker(e.target.value)} placeholder="Broker" className="w-32 rounded border px-2 py-1 text-sm" required />
              <button type="submit" disabled={wlAdding} className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50">{wlAdding ? "..." : "✅ เพิ่ม"}</button>
            </form>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-black">
                    <th className="px-2 py-1">ชื่อ</th>
                    <th className="px-2 py-1">Broker</th>
                    <th className="px-2 py-1">วันที่เพิ่ม</th>
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
                    <tr><td colSpan={4} className="px-2 py-4 text-center text-zinc-400">ยังไม่มีรายการ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
