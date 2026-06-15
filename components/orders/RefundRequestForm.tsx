"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/format";
import type { RefundRequestPayload } from "@/lib/api/resolution";
import {
  REFUND_REASON_OPTIONS,
  refundMethodLabel,
} from "@/lib/orders/refundDisputeData";

type RefundRequestFormProps = {
  agreedPrice: string | number | null;
  paymentLast4?: string | null;
  eligible?: boolean;
  busy?: boolean;
  onSubmit: (payload: RefundRequestPayload) => void;
};

export default function RefundRequestForm({
  agreedPrice,
  paymentLast4,
  eligible = true,
  busy,
  onSubmit,
}: RefundRequestFormProps) {
  const [reasonCode, setReasonCode] = useState("");
  const [detail, setDetail] = useState("");
  const [refundMethod, setRefundMethod] = useState<"wallet" | "card">("wallet");

  const amount = agreedPrice != null ? formatVnd(agreedPrice) : "—";

  function handleSubmit() {
    if (!reasonCode) return;
    onSubmit({ reasonCode, detail: detail.trim() || undefined, refundMethod });
  }

  return (
    <div className="resolution-form">
      <header className="resolution-form__head">
        <h4 className="resolution-form__title">Yêu cầu hoàn tiền</h4>
        <p className="resolution-form__sub">
          Dùng khi đổi ý hoặc dịch vụ chưa được thực hiện. Freelancer có 3 ngày phản hồi, sau đó
          hệ thống có thể tự hoàn tiền.
        </p>
      </header>

      <div className="resolution-form__refund-box">
        <div>
          <span className="resolution-form__refund-label">Số tiền hoàn dự kiến</span>
          <strong className="resolution-form__refund-amount">{amount}</strong>
        </div>
        <div>
          <span className="resolution-form__refund-label">Phương thức nhận lại</span>
          <select
            className="resolution-form__select"
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value === "card" ? "card" : "wallet")}
          >
            <option value="wallet">{refundMethodLabel("wallet")}</option>
            <option value="card">
              {paymentLast4
                ? `Hoàn về thẻ tín dụng đuôi ${paymentLast4}`
                : refundMethodLabel("card")}
            </option>
          </select>
        </div>
      </div>

      <label className="resolution-form__field">
        <span>
          Lý do hủy <span className="resolution-form__required">*</span>
        </span>
        <select
          className="resolution-form__select"
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value)}
          disabled={!eligible}
        >
          <option value="">— Chọn lý do —</option>
          {REFUND_REASON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="resolution-form__field">
        <span>Chi tiết thêm (tùy chọn)</span>
        <textarea
          className="resolution-form__textarea"
          rows={3}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Mô tả thêm nếu cần..."
          disabled={!eligible}
        />
      </label>

      {!eligible ? (
        <p className="resolution-form__hint resolution-form__hint--warn">
          Yêu cầu hoàn tiền nhanh chỉ khả dụng khi đã nạp ký quỹ và freelancer chưa bắt đầu thực hiện
          (hoặc chưa có cập nhật tiến độ). Nếu đã có tiến độ, hãy dùng chỉnh sửa hoặc mở tranh chấp.
        </p>
      ) : null}

      <button
        type="button"
        className="resolution-form__btn"
        disabled={busy || !eligible || !reasonCode}
        onClick={handleSubmit}
      >
        {busy ? "Đang gửi..." : "Gửi yêu cầu hoàn tiền"}
      </button>
    </div>
  );
}
