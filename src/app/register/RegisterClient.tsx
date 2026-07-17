"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { email: string; name: string; refCode: string };

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function RegisterClient({ email, name, refCode }: Props) {
  const router = useRouter();
  const [agentName, setAgentName] = useState(name);
  const [agentCode, setAgentCode] = useState(() => generateCode());
  const [parentCode, setParentCode] = useState(refCode);
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function regenCode() { setAgentCode(generateCode()); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agentName.trim() || !agentCode.trim()) { setError("กรุณากรอกชื่อและรหัสตัวแทน"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/agent/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName.trim(),
          agent_code: agentCode.trim(),
          parent_code: parentCode.trim() || undefined,
          bank_name: bankName.trim(),
          bank_account: bankAccount.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/agent");
      } else {
        setError(data.error || "ไม่สำเร็จ");
      }
    } catch {
      setError("เกิดข้อผิดพลาด — กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h1 className="mb-1 text-xl font-bold text-zinc-800">สมัครตัวแทน</h1>
        {refCode ? (
          <p className="mb-4 text-sm text-blue-600">
            👤 ผู้แนะนำ: <span className="font-mono font-semibold">{refCode}</span>
          </p>
        ) : (
          <p className="mb-4 text-sm text-zinc-500">สมัครตัวแทนด้วยตนเอง</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (locked) */}
          <div>
            <label className="block text-sm font-medium text-zinc-600">อีเมล (Google)</label>
            <input type="email" value={email} disabled
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500" />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-600">ชื่อตัวแทน (ตรงกับบัญชีธนาคาร)</label>
            <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)} required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>

          {/* Agent Code */}
          <div>
            <label className="block text-sm font-medium text-zinc-600">รหัสตัวแทน</label>
            <div className="mt-1 flex gap-2">
              <input type="text" value={agentCode} readOnly maxLength={5}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-black uppercase" />
              <button type="button" onClick={regenCode}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                🎲 สุ่มใหม่
              </button>
            </div>
          </div>

          {/* Parent Code (locked if from referral) */}
          <div>
            <label className="block text-sm font-medium text-zinc-600">รหัสผู้แนะนำ</label>
            <input type="text" value={parentCode} onChange={e => setParentCode(e.target.value.toUpperCase())}
              disabled={!!refCode} maxLength={5}
              className={`mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm uppercase ${refCode ? "border-zinc-100 bg-zinc-50 text-zinc-400" : "border-zinc-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"}`} />
          </div>

          {/* Locked Commission Rates */}
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs font-medium text-blue-700 mb-2">📋 อัตราคอมมิชชั่น (อัตโนมัติ)</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-zinc-500">คอมมิชชั่น:</span> <span className="font-semibold text-blue-700">10%</span></div>
              <div><span className="text-zinc-500">ส่วนลด:</span> <span className="font-semibold text-blue-700">5%</span></div>
              <div><span className="text-zinc-500">คอม VPS:</span> <span className="font-semibold text-blue-700">10%</span></div>
              <div><span className="text-zinc-500">ส่วนลด VPS:</span> <span className="font-semibold text-blue-700">5%</span></div>
            </div>
            <p className="mt-1 text-[10px] text-zinc-400">* ปรับเปลี่ยนโดยแอดมินเท่านั้น</p>
          </div>

          {/* Bank Info */}
          <div>
            <label className="block text-sm font-medium text-zinc-600">🏦 ชื่อธนาคาร</label>
            <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600">🔢 เลขบัญชี</label>
            <input type="text" value={bankAccount} onChange={e => setBankAccount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {submitting ? "กำลังสมัคร..." : "📝 สมัครตัวแทน"}
          </button>

          <p className="text-center text-xs text-zinc-400">
            <a href="/dashboard" className="hover:text-blue-500">← กลับ Dashboard</a>
          </p>
        </form>
      </div>
    </div>
  );
}
