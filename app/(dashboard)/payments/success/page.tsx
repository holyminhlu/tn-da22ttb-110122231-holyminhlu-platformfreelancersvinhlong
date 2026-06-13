"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ClientShell from "@/components/layout/ClientShell";
import { getDepositOrderStatus } from "@/lib/api/payments";
import { formatVnd } from "@/lib/format";
import "@/components/payments/payments.css";

function DepositSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderCode = Number(searchParams.get("orderCode"));
  const [message, setMessage] = useState("Đang xác nhận thanh toán với payOS…");
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(orderCode)) {
      setStatus("error");
      setMessage("Thiếu mã đơn nạp tiền. Vui lòng thử lại từ trang Thanh toán.");
      return;
    }

    let stopped = false;
    let attempts = 0;

    async function checkOnce(): Promise<boolean> {
      try {
        const result = await getDepositOrderStatus(orderCode);
        if (stopped) return true;
        setAmount(result.amount);
        if (result.status === "SUCCESS") {
          setStatus("success");
          setMessage("Nạp tiền thành công. Số dư ví đã được cập nhật.");
          return true;
        }
        if (result.status === "CANCELLED") {
          setStatus("error");
          setMessage("Đơn nạp tiền đã bị hủy.");
          return true;
        }
        setMessage("Đang chờ payOS xác nhận chuyển khoản…");
        return false;
      } catch (err) {
        if (stopped) return true;
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Không thể kiểm tra trạng thái nạp tiền.";
        setStatus("error");
        setMessage(msg);
        return true;
      }
    }

    void (async () => {
      const done = await checkOnce();
      if (done || stopped) return;

      const timer = window.setInterval(async () => {
        attempts += 1;
        const finished = await checkOnce();
        if (finished || attempts >= 30) {
          window.clearInterval(timer);
          if (!finished && !stopped && attempts >= 30) {
            setStatus("error");
            setMessage(
              "Chưa nhận được xác nhận từ payOS. Nếu đã chuyển khoản, vui lòng đợi thêm hoặc liên hệ hỗ trợ.",
            );
          }
        }
      }, 2000);
    })();

    return () => {
      stopped = true;
    };
  }, [orderCode]);

  useEffect(() => {
    if (status !== "success") return;
    const timer = window.setTimeout(() => router.replace("/payments"), 2500);
    return () => window.clearTimeout(timer);
  }, [status, router]);

  return (
    <ClientShell>
      <div className="payments-page payments-page--full-width">
        <div className="payments-result-card">
          <h1 className="payments-result-card__title">
            {status === "success" ? "Nạp tiền thành công" : "Kết quả nạp tiền"}
          </h1>
          <p className="payments-result-card__message" role="status">
            {message}
          </p>
          {amount != null ? (
            <p className="payments-result-card__amount">
              Số tiền: <strong>{formatVnd(amount)}</strong>
            </p>
          ) : null}
          {Number.isFinite(orderCode) ? (
            <p className="payments-result-card__meta">Mã đơn: {orderCode}</p>
          ) : null}
          <div className="payments-result-card__actions">
            <Link href="/payments" className="payments-btn payments-btn--primary">
              Về trang Thanh toán
            </Link>
          </div>
        </div>
      </div>
    </ClientShell>
  );
}

export default function DepositSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gray-600">
          Đang tải…
        </div>
      }
    >
      <DepositSuccessContent />
    </Suspense>
  );
}
