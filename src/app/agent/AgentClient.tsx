"use client";

import { useState, useEffect } from "react";
import type { Agent, Payment, AgentWithdrawal } from "@/types";
import { useRouter } from "next/navigation";

type Props = {
  agent: Agent;
  sales: (Payment & { package_label: string })[];
  pendingCommission: number;
};

export default function AgentClient({ agent, sales, pendingCommission }: Props) {
  const router = useRouter();
  const [wdSubmitting, setWdSubmitting] = useState(false);
  const [wdMsg, setWdMsg] = useState("");
  const [withdrawals, setWithdrawals] = useState<AgentWithdrawal[]>([]);
  // ponytail: subtract pending withdrawals to show true available balance
  const available = agent.commission_earned - agent.commission_paid - withdrawals.filter(w => w.status === "pending").reduce((s, w) => s + w.amount, 0);

  useEffect(() => {
    fetch("/api/agent/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_withdrawals" }),
    }).then(r => r.json()).then(d => { if (d.withdrawals) setWithdrawals(d.withdrawals); }).catch(() => {});
  }, []);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    const amt = available;
    if (!amt || amt <= 0) return;
    setWdSubmitting(true); setWdMsg("");
    try {
      const res = await fetch("/api/agent/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw", amount: amt }),
      });
      const data = await res.json();
      if (data.success) {
        setWdMsg("✅ สร้างรายการถอนแล้ว — รอแอดมินตรวจสอบ");
        setWithdrawals(prev => [data.withdrawal, ...prev]);
      } else {
        setWdMsg("❌ " + (data.error || "ไม่สำเร็จ"));
      }
    } catch { setWdMsg("❌ ไม่สำเร็จ"); }
    finally { setWdSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-800">🏷️ ตัวแทน: {agent.name}</h1>
            <p className="text-sm text-zinc-600">{agent.email} | รหัส: <span className="font-mono font-semibold text-blue-600">{agent.agent_code}</span></p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            ← Dashboard
          </button>
        </div>

        {/* Referral Link — ponytail: MLM agent recruitment */}
        <div className="mb-6 rounded-xl bg-blue-50 p-4 shadow-sm">
          <h2 className="font-semibold text-blue-800 mb-2">🔗 ลิงค์แนะนำเพื่อน</h2>
          <p className="text-xs text-blue-600 mb-2">ส่งลิงค์นี้ให้เพื่อนสมัครตัวแทน — เพื่อนจะได้เป็น downline ของคุณ</p>
          <div className="flex gap-2">
            <input type="text" readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${agent.agent_code}`}
              className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-mono text-blue-800"
            />
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/register?ref=${agent.agent_code}`); }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              📋 คัดลอก
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">ส่วนลดแพคเกจ</p>
            <p className="text-2xl font-bold text-blue-600">{agent.discount_percent}%</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">ค่าคอมแพคเกจ</p>
            <p className="text-2xl font-bold text-green-600">{agent.commission_percent}%</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">ส่วนลด VPS</p>
            <p className="text-2xl font-bold text-blue-600">{agent.discount_vps_percent}%</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">ค่าคอม VPS</p>
            <p className="text-2xl font-bold text-green-600">{agent.commission_vps_percent}%</p>
          </div>
          {agent.bank_name && (
            <div className="rounded-xl bg-white p-4 shadow-sm col-span-2">
              <p className="text-xs text-zinc-500">🏦 บัญชีธนาคาร</p>
              <p className="text-lg font-semibold text-zinc-800">{agent.bank_name}: {agent.bank_account}</p>
            </div>
          )}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">💰 ยอดคอมสะสม</p>
            <p className="text-2xl font-bold text-zinc-800">฿{agent.commission_earned.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-zinc-500">✅ จ่ายแล้ว</p>
            <p className="text-2xl font-bold text-green-600">฿{agent.commission_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Withdraw Form */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-zinc-800 mb-2">💸 ถอนค่าคอมมิชชั่น</h2>
          <p className="text-sm text-zinc-500 mb-3">
            ยอดที่ถอนได้: <span className="font-bold text-green-600">฿{available.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </p>
          {!agent.bank_name && (
            <p className="text-sm text-red-500 mb-3">⚠️ ยังไม่ได้ระบุบัญชีธนาคาร — กรุณาแจ้งแอดมิน</p>
          )}
          <button onClick={handleWithdraw} disabled={wdSubmitting || available <= 0 || !agent.bank_name}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
            {wdSubmitting ? "กำลังดำเนินการ..." : `💰 ถอนทั้งหมด ฿${available.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </button>
          {wdMsg && <p className="mt-2 text-sm text-zinc-700">{wdMsg}</p>}
        </div>

        {/* Withdrawal History */}
        {withdrawals.length > 0 && (
          <div className="mb-6 rounded-xl bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="font-semibold text-zinc-800">📤 ประวัติการถอน ({withdrawals.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-zinc-500">
                    <th className="px-4 py-2">วันที่</th>
                    <th className="px-4 py-2 text-right">จำนวน</th>
                    <th className="px-4 py-2">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map(w => (
                    <tr key={w.id} className="border-b border-zinc-50">
                      <td className="px-4 py-2 text-zinc-600">{new Date(w.created_at).toLocaleDateString("en-GB")}</td>
                      <td className="px-4 py-2 text-right font-medium text-black">฿{w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2">
                        {w.status === "paid" ? <span className="text-green-600 font-medium">✅ จ่ายแล้ว ({w.paid_at ? new Date(w.paid_at).toLocaleDateString("en-GB") : ""})</span>
                          : <span className="text-amber-600 font-medium">⏳ รอดำเนินการ</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending */}
        {pendingCommission > 0 && (
          <div className="mb-6 rounded-xl bg-amber-50 p-4 shadow-sm">
            <p className="text-sm text-amber-700">
              ⏳ คงค้าง: <span className="font-bold">฿{pendingCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </p>
          </div>
        )}

        {/* Sales History */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b p-4">
            <h2 className="font-semibold text-zinc-800">📋 ประวัติการขาย ({sales.length} รายการ)</h2>
          </div>
          {sales.length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-400">ยังไม่มีรายการขาย</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-zinc-500">
                    <th className="px-4 py-2">วันที่</th>
                    <th className="px-4 py-2">รหัส</th>
                    <th className="px-4 py-2">ลูกค้า</th>
                    <th className="px-4 py-2">แพคเกจ</th>
                    <th className="px-4 py-2 text-right">จ่าย</th>
                    <th className="px-4 py-2 text-right">ค่าคอม</th>
                    <th className="px-4 py-2">ช่องทาง</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s, i) => {
                    // ponytail: parse qr_payload for crypto conversion detail
                    let cryptoMeta: { method?: string; usdt?: number; rate?: number; thb?: number } | null = null;
                    if (s.qr_payload) {
                      try { cryptoMeta = JSON.parse(s.qr_payload); } catch {}
                    }
                    const isCrypto = cryptoMeta?.method === "crypto";
                    return (
                    <tr key={i} className="border-b border-zinc-50 hover:bg-zinc-50">
                      <td className="px-4 py-2 text-zinc-600 whitespace-nowrap">
                        {new Date(s.paid_at || s.created_at).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-2 text-zinc-400 font-mono text-xs">
                        {s.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2 text-zinc-700">{s.email}</td>
                      <td className="px-4 py-2 text-zinc-600">{s.package_label}</td>
                      <td className="px-4 py-2 text-right font-medium text-zinc-800">
                        {isCrypto ? (
                          <span title={`${cryptoMeta!.usdt} USDT × ${cryptoMeta!.rate} = ฿${cryptoMeta!.thb}`}>
                            ${cryptoMeta!.usdt} <span className="text-xs text-zinc-400">USDT</span>
                          </span>
                        ) : (
                          <>฿{s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-green-600">
                        {isCrypto && cryptoMeta ? (
                          <span title={`${cryptoMeta.usdt} USDT × ${cryptoMeta.rate} = ฿${cryptoMeta.thb}`}>
                            ฿{cryptoMeta.thb!.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <>฿{(s.agent_commission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isCrypto ? (
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700"
                            title={`${cryptoMeta!.usdt} USDT × ${cryptoMeta!.rate} = ฿${cryptoMeta!.thb}`}
                          >💰 USDT</span>
                        ) : (
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">📱 พร้อมเพย์</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}