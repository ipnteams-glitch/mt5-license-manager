import { auth } from "@/lib/auth";
import { getPaymentById, markPaymentFailed } from "@/lib/sheets";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "กรุณาล็อคอินก่อน" }, { status: 401 });
  }

  try {
    const { txn_id } = await req.json();
    if (!txn_id) {
      return NextResponse.json({ error: "ต้องระบุ txn_id" }, { status: 400 });
    }

    const payment = await getPaymentById(txn_id);
    if (!payment) {
      return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
    }
    if (payment.email !== session.user.email) {
      return NextResponse.json({ error: "ไม่ใช่รายการของคุณ" }, { status: 403 });
    }
    if (payment.status !== "pending") {
      return NextResponse.json({ error: "รายการนี้ไม่สามารถยกเลิกได้" }, { status: 400 });
    }

    await markPaymentFailed(txn_id);

    return NextResponse.json({ success: true, message: "ยกเลิกรายการแล้ว" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
