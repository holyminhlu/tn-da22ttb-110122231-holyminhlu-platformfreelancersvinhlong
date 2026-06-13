"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ClientShell from "@/components/layout/ClientShell";
import { cancelDepositOrder } from "@/lib/api/payments";
import "@/components/payments/payments.css";

function DepositCancelContent() {
  const searchParams = useSearchParams();
  const orderCode = Number(searchParams.get("orderCode"));
  const [message, setMessage] = useState("Đang hủy yêu cầu nạp tiền…");

  useEffect(() => {
    if (!Number.isFinite(orderCode)) {
      setMessage("Bạn đã hủy thanh toán trên payOS.");
      return;
    }

    let cancelled = false;
    void cancelDepositOrder(orderCode)
      .then((result) => {
        if (cancelled) return;
        setMessage(result.message || "Đã hủy yêu cầu nạp tiền.");
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Thanh toán đã bị hủy trên payOS.";
        setMessage(msg);
      });

    return () => {
      cancelled = true;
    };
  }, [orderCode]);

  return (
    <ClientShell>
      <div className="payments-page payments-page--full-width">
        <div className="payments-result-card">
          <h1 className="payments-result-card__title">Đã hủy nạp tiền</h1>
          <p className="payments-result-card__message" role="status">
            {message}
          </p>
          {Number.isFinite(orderCode) ? (
            <p className="payments-result-card__meta">Mã đơn: {orderCode}</p>
          ) : null}
          <div className="payments-result-card__actions">
            <Link href="/payments" className="payments-btn payments-btn--primary">
              Quay lại Thanh toán
            </Link>
          </div>
        </div>
      </div>
    </ClientShell>
  );
}

export default function DepositCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gray-600">
          Đang tải…
        </div>
      }
    >
      <DepositCancelContent />
    </Suspense>
  );
}
