import { auth } from "@/lib/auth";
import { getPaymentById, getEasySlipApiKey, approvePaymentAndUpgrade } from "@/lib/sheets";
import { sendPaymentSuccessEmail } from "@/lib/mail";
import { PACKAGES } from "@/types";
import { NextResponse } from "next/server";
import { notifySlipUpload } from "@/lib/notify";
import { notifyVpsOrder } from "@/lib/notify";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "กรุณาล็อคอินก่อน" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const txnId = formData.get("txn_id") as string;
    const file = formData.get("file") as File;

    if (!txnId || !file) {
      return NextResponse.json({ error: "ต้องระบุ txn_id และไฟล์สลิป" }, { status: 400 });
    }

    const payment = await getPaymentById(txnId);
    if (!payment) {
      return NextResponse.json({ error: "ไม่พบรายการชำระเงิน" }, { status: 404 });
    }
    if (payment.email !== session.user.email) {
      return NextResponse.json({ error: "ไม่ใช่รายการของคุณ" }, { status: 403 });
    }
    if (payment.status === "paid") {
      return NextResponse.json({ success: true, message: "รายการนี้ชำระเงินแล้ว" });
    }
    if (payment.status === "failed") {
      return NextResponse.json({ error: "รายการนี้ถูกยกเลิกแล้ว" }, { status: 400 });
    }

    // แปลงเป็น base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // OCR สลิปผ่าน EasySlip — v2 ก่อน แล้ว v1 fallback
    let ocrAmount: number | null = null;
    try {
      const apiKey = await getEasySlipApiKey();
      if (apiKey) {
        // API v2 (latest): POST /v2/verify/bank — รองรับ base64 + matchAmount
        try {
          const v2Res = await fetch("https://api.easyslip.com/v2/verify/bank", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              base64: `data:image/png;base64,${base64}`,
              matchAmount: payment.amount,
              checkDuplicate: true,
            }),
          });
          const v2Data = await v2Res.json();
          console.log("[EasySlip v2] success:", v2Data.success, "status:", v2Res.status, "isAmountMatched:", v2Data.data?.isAmountMatched);

          if (v2Data.success) {
            // ปฏิเสธสลิปซ้ำ
            if (v2Data.data?.isDuplicate) {
              console.log("[EasySlip v2] duplicate slip rejected — fallback to admin");
            } else {
              ocrAmount = v2Data.data?.amountInSlip
                ?? v2Data.data?.rawSlip?.amount?.amount
                ?? null;
              if (ocrAmount !== null && ocrAmount !== undefined) {
                ocrAmount = parseFloat(String(ocrAmount));
              }
            }
          }
        } catch (e) {
          console.error("[EasySlip v2] failed:", e);
        }

        // API v1 (Legacy): POST /v1/verify — response ใช้ status แทน success
        if (ocrAmount === null) {
          try {
            const v1Res = await fetch("https://api.easyslip.com/v1/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({ image: base64 }),
            });
            const v1Data = await v1Res.json();
            console.log("[EasySlip v1] status:", v1Data.status, "message:", v1Data.message);

            if (v1Data.status === 200) {
              ocrAmount = parseFloat(v1Data.data?.amount?.amount || "0");
            }
          } catch (e) {
            console.error("[EasySlip v1] failed:", e);
          }
        }
      }
    } catch (e) {
      console.error("EasySlip OCR failed:", e);
    }

    // ตรวจสอบยอด (ถ้า OCR สำเร็จ)
    if (ocrAmount !== null && Math.abs(ocrAmount - payment.amount) > 0.05) {
      return NextResponse.json({
        success: false,
        message: `ยอดเงินในสลิป (${ocrAmount.toFixed(2)} บาท) ไม่ตรงกับยอดที่ต้องจ่าย (${payment.amount.toFixed(2)} บาท)`,
      });
    }

    // OCR สำเร็จ + ยอดตรง → อนุมัติอัตโนมัติ (ไม่ต้องรอแอดมิน)
    if (ocrAmount !== null) {
      try {
        const result = await approvePaymentAndUpgrade(txnId);
        sendPaymentSuccessEmail(
          result.memberEmail,
          result.memberName,
          result.packageLabel,
          result.expiryDate,
        ).catch(() => {});
        // แจ้งแอดมินสร้าง VPS ถ้าเป็นแพคเกจ VIP+VPS

        return NextResponse.json({
          success: true,
          message: `✅ ชำระเงินสำเร็จ — ${result.packageLabel}`,
          package: payment.package,
          expiry_date: result.expiryDate,
        });
      } catch (e: any) {
        console.error("Auto-approve failed:", e.message);
        // Fallback → ส่ง Telegram ให้แอดมินตรวจเอง
        const pkgInfo = PACKAGES[payment.package];
        await notifySlipUpload(
          payment.email,
          pkgInfo?.name || payment.package,
          payment.amount,
          txnId,
          base64,
          ocrAmount,
        ).catch((e2) => console.error("Notify slip failed:", e2));

        return NextResponse.json({
          success: true,
          message: "ระบบตรวจสอบสลิปอัตโนมัติล้มเหลว — ส่งให้แอดมินตรวจสอบแล้ว รอการอนุมัติ",
        });
      }
    }

    // OCR ไม่สำเร็จ → ส่ง Telegram ให้แอดมินตรวจ
    const pkgInfo = PACKAGES[payment.package];
    await notifySlipUpload(
      payment.email,
      pkgInfo?.name || payment.package,
      payment.amount,
      txnId,
      base64,
      null,
    ).catch((e) => console.error("Notify slip failed:", e));

    return NextResponse.json({
      success: true,
      message: "ส่งสลิปให้แอดมินตรวจสอบแล้ว รอการอนุมัติ",
    });
  } catch (err: any) {
    console.error("Upload slip error:", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}