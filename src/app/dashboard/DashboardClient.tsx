"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import type { Member, Port } from "@/types";

type Props = {
  member: Member;
  ports: Port[];
  portsUsed: number;
  portsTotal: number;
  packageLabel: string;
  daysLeft: number;
  isExpired: boolean;
  isAdmin: boolean;
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
}: Props) {
  const [showAddPort, setShowAddPort] = useState(false);
  const [mt5Account, setMt5Account] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [portList, setPortList] = useState(ports);
  const [usedCount, setUsedCount] = useState(portsUsed);

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
              <a href="/renew" className="rounded bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-1 text-xs font-medium text-white">🔐 ต่ออายุ</a>
              {isAdmin && <a href="/admin" className="rounded border px-3 py-1 text-xs font-medium">⚙️ จัดการ</a>}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <a href="https://line.me/R/ti/p/@479ufnya" target="_blank" className="rounded bg-green-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-green-600">Line: @479ufnya</a>
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
                <p className="font-semibold text-zinc-900">{packageLabel}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">สถานะ</p>
                {isExpired ? (
                  <p className="font-semibold text-red-600">❌ หมดอายุแล้ว</p>
                ) : daysLeft > 0 ? (
                  <p className="font-semibold text-green-600">✅ เหลือ {daysLeft} วัน</p>
                ) : (
                  <p className="font-semibold text-zinc-500">ไม่มีแพคเกจ</p>
                )}
              </div>
              <div>
                <p className="text-sm text-zinc-500">โควต้าพอร์ต</p>
                <p className="font-semibold text-zinc-900">
                  {usedCount} / {portsTotal}
                  {portsTotal > 0 && (
                    <span className="ml-2 text-xs text-zinc-400">
                      ({portsTotal - usedCount} เหลือ)
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
            {portsTotal > 0 && usedCount < portsTotal && !isExpired && (
              <button
                onClick={() => setShowAddPort(!showAddPort)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + เพิ่มพอร์ต
              </button>
            )}
            {portsTotal === 0 && (
              <span className="text-xs text-zinc-400">ยังไม่มีแพคเกจ</span>
            )}
            {isExpired && (
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
              {portsTotal > 0 ? "ยังไม่มีพอร์ต — กด + เพิ่มพอร์ต เพื่อเพิ่ม" : "ยังไม่มีแพคเกจ — ติดต่อแอดมิน"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-zinc-500">
                    <th className="pb-2">MT5 Account</th>
                    <th className="pb-2">วันที่เพิ่ม</th>
                    <th className="pb-2">หมดอายุ</th>
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
                        {member.expiry_date ? (
                          <span className={isExpired ? "text-red-500 font-medium" : "text-zinc-600"}>
                            {new Date(member.expiry_date).toLocaleDateString("en-GB")}
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeletePort(port.id)}
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

      </main>
    </div>
  );
}
