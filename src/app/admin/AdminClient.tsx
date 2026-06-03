"use client";

import { useState } from "react";
import type { Member, Port, PackageType, Payment } from "@/types";
import { PACKAGES } from "@/types";

type Props = { members: Member[]; ports: Port[]; payments: Payment[] };

export default function AdminClient({ members, ports, payments }: Props) {
  const [memberList, setMemberList] = useState(members);
  const [editing, setEditing] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PackageType>("none");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"members" | "ports" | "payments">("members");
  const [paymentList, setPaymentList] = useState(payments);
  const [verifyingPayId, setVerifyingPayId] = useState<string | null>(null);

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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white">A</div>
            <span className="font-semibold text-zinc-800">Admin Panel</span>
          </div>
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">Dashboard</a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex gap-2">
          {(["members", "ports", "payments"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === tab ? "bg-blue-600 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"}`}
            >
              {tab === "members" ? `👥 สมาชิก (${memberList.length})` : tab === "ports" ? `🔌 พอร์ต (${ports.filter((p) => p.status === "active").length})` : `💰 รอตรวจสอบ (${paymentList.filter((p) => p.status === "pending").length})`}
            </button>
          ))}
        </div>

        {msg && (
          <div className={`mb-4 rounded-lg p-3 text-sm ${msg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {msg}
          </div>
        )}

        {activeTab === "members" && (
          <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                  <th className="px-4 py-3">อีเมล</th>
                  <th className="px-4 py-3">ชื่อ</th>
                  <th className="px-4 py-3">แพคเกจ</th>
                  <th className="px-4 py-3">โควต้า</th>
                  <th className="px-4 py-3">หมดอายุ</th>
                  <th className="px-4 py-3">พอร์ต</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {memberList.map((m) => {
                  const used = getPortCount(m.email);
                  const isEditing = editing === m.email;
                  return (
                    <tr key={m.email} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600">{m.email}</td>
                      <td className="px-4 py-3 font-medium text-zinc-800">{m.name}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select value={selectedPkg} onChange={(e) => setSelectedPkg(e.target.value as PackageType)} className="rounded border border-zinc-300 px-2 py-1 text-xs text-gray-900">
                            {pkgOptions.map((k) => (<option key={k} value={k}>{PACKAGES[k].label}</option>))}
                          </select>
                        ) : (
                          <span className={m.package === "none" ? "text-zinc-400" : "text-green-700"}>{PACKAGES[m.package].name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{m.max_ports}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="rounded border border-zinc-300 px-2 py-1 text-xs text-gray-900" />
                        ) : (
                          <span className={m.expiry_date && new Date(m.expiry_date) <= new Date() ? "text-red-500" : "text-zinc-600"}>
                            {m.expiry_date ? new Date(m.expiry_date).toLocaleDateString("en-GB") : "-"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${used >= m.max_ports && m.max_ports > 0 ? "text-orange-500" : "text-zinc-500"}`}>
                          {used}/{m.max_ports}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <button onClick={saveEdit} disabled={saving} className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50">{saving ? "..." : "💾"}</button>
                            <button onClick={() => setEditing(null)} className="rounded px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-200">✕</button>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                  <th className="px-4 py-3">MT5 Account</th>
                  <th className="px-4 py-3">Broker</th>
                  <th className="px-4 py-3">เจ้าของ</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3">วันที่เพิ่ม</th>
                </tr>
              </thead>
              <tbody>
                {ports.filter((p) => p.status === "active").map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3 font-mono font-medium text-zinc-800">{p.mt5_account}</td>
                    <td className="px-4 py-3 text-zinc-600">{p.mt5_broker}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{p.member_email}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">active</span></td>
                    <td className="px-4 py-3 text-zinc-500">{new Date(p.created_at).toLocaleDateString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b bg-zinc-50 text-left text-sm font-semibold text-zinc-600">
                  <th className="px-4 py-3">เวลา</th>
                  <th className="px-4 py-3">อีเมล</th>
                  <th className="px-4 py-3">แพคเกจ</th>
                  <th className="px-4 py-3">จำนวน</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
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
                        <td className="px-4 py-3 text-sm text-zinc-500">
                          {new Date(p.created_at).toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600">{p.email}</td>
                        <td className="px-4 py-3 text-sm">{PACKAGES[p.package]?.name || p.package}</td>
                        <td className="px-4 py-3 font-mono text-sm">{p.amount.toFixed(2)} ฿</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-medium ${
                              p.status === "paid" ? "bg-green-100 text-green-700" : p.status === "failed" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {p.status === "paid" ? "✅ จ่ายแล้ว" : p.status === "failed" ? "❌ ล้มเหลว" : "⏳ รอตรวจสอบ"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPending && (
                            <button
                              onClick={() => handleAdminVerify(p.id)}
                              disabled={verifyingPayId === p.id}
                              className="rounded bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {verifyingPayId === p.id ? "..." : "✅ ยืนยันการชำระเงิน"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {paymentList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">ยังไม่มีรายการ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
