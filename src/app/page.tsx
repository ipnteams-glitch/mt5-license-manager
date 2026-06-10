"use client";

import { signIn, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState<"signup" | "portfolio" | null>(null);

  // ถ้า login แล้ว redirect ไป dashboard
  if (status === "authenticated" && session) {
    redirect("/dashboard");
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-blue-50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-xl text-center">
        {/* Logo */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 text-white text-3xl font-bold shadow-lg">
          MT5
        </div>

        <h1 className="mb-2 text-2xl font-bold text-zinc-900">MT5 License Manager</h1>
        <p className="mb-10 text-sm text-zinc-500">
          จัดการพอร์ต MT5 ของคุณ — ดูภาพรวมกำไร/ขาดทุนได้ในหน้าต่างเดียว
        </p>

        {/* ปุ่ม */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              setLoading("signup");
              signIn("google", { callbackUrl: "/dashboard" });
            }}
            disabled={loading !== null}
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-6 py-4 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:shadow-md disabled:opacity-50"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {loading === "signup" ? "กำลังดำเนินการ..." : "สมัครสมาชิก"}
            </div>
          </button>

          <button
            onClick={() => {
              setLoading("portfolio");
              signIn("google", { callbackUrl: "/portfolio" });
            }}
            disabled={loading !== null}
            className="flex-1 rounded-xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md disabled:opacity-50"
          >
            {loading === "portfolio" ? "กำลังดำเนินการ..." : "MyPortfolio"}
          </button>
        </div>

        <p className="mt-8 text-xs text-zinc-400">
          เฉพาะบัญชี @gmail.com เท่านั้น
        </p>
      </div>
    </div>
  );
}
