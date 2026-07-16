import { auth } from "@/lib/auth";
import { getAllPayments } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/payment/has-paid — เช็คว่า user เคยจ่ายสำเร็จหรือยัง
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ hasPaid: false });

  try {
    const payments = await getAllPayments();
    const hasPaid = payments.some(
      (p) => p.email === session.user!.email && p.status === "paid"
    );
    return NextResponse.json({ hasPaid });
  } catch {
    return NextResponse.json({ hasPaid: false });
  }
}