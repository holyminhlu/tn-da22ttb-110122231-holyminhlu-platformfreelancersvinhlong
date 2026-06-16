"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FaBalanceScale,
  FaGavel,
  FaHandHoldingUsd,
  FaUndo,
  FaUserCheck,
} from "react-icons/fa";
import type { AdminResolveDisputeAction } from "@/lib/api/admin";
import { formatVnd } from "@/lib/format";

type ResolveMode = AdminResolveDisputeAction;

type AdminDisputeResolvePanelProps = {
  agreedPrice: number | string | null;
  escrowStatus?: string | null;
  isCancelRejectedDispute?: boolean;
  busy?: boolean;
  error?: string;
  onResolve: (
    resolution: ResolveMode,
    payload: { adminNote?: string; clientAmount?: number; freelancerAmount?: number },
  ) => void | Promise<void>;
};

type ModeOption = {
  id: ResolveMode;
  title: string;
  description: string;
  icon: ReactNode;
  hidden?: boolean;
};

const SPLIT_PRESETS = [
  { label: "50 / 50", clientPct: 0.5 },
  { label: "70% C", clientPct: 0.7 },
  { label: "30% C", clientPct: 0.3 },
  { label: "100% C", clientPct: 1 },
  { label: "100% F", clientPct: 0 },
] as const;

function roundVnd(n: number) {
  return Math.max(0, Math.round(n));
}

export default function AdminDisputeResolvePanel({
  agreedPrice,
  escrowStatus,
  isCancelRejectedDispute = false,
  busy = false,
  error,
  onResolve,
}: AdminDisputeResolvePanelProps) {
  const total = Math.max(0, Number(agreedPrice) || 0);
  const escrowFunded = String(escrowStatus || "").toLowerCase() === "funded";

  const [mode, setMode] = useState<ResolveMode>("split");
  const [clientAmount, setClientAmount] = useState(0);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    if (total > 0) {
      const half = roundVnd(total / 2);
      setClientAmount(half);
    } else {
      setClientAmount(0);
    }
  }, [total]);

  const freelancerAmount = Math.max(0, total - clientAmount);
  const clientPct = total > 0 ? (clientAmount / total) * 100 : 0;

  const modeOptions: ModeOption[] = useMemo(
    () => [
      {
        id: "split",
        title: "Phân chia ký quỹ",
        description: "Tự nhập tỷ lệ hoàn cho Client và thanh toán cho Freelancer.",
        icon: <FaBalanceScale aria-hidden />,
      },
      {
        id: "full_refund",
        title: "Hoàn 100% cho Client",
        description: "Toàn bộ số tiền trong escrow về ví VLC của Client.",
        icon: <FaUndo aria-hidden />,
      },
      {
        id: "release",
        title: "Giải ngân cho Freelancer",
        description: "Freelancer nhận toàn bộ ký quỹ; đơn chuyển hoàn tất.",
        icon: <FaHandHoldingUsd aria-hidden />,
      },
      {
        id: "dismiss",
        title: "Bác tranh chấp",
        description: "Đơn tiếp tục như trước khi mở tranh chấp.",
        icon: <FaUserCheck aria-hidden />,
        hidden: isCancelRejectedDispute,
      },
    ],
    [isCancelRejectedDispute],
  );

  const visibleModes = modeOptions.filter((o) => !o.hidden);

  useEffect(() => {
    if (mode === "dismiss" && isCancelRejectedDispute) {
      setMode("split");
    }
  }, [mode, isCancelRejectedDispute]);

  function applyClientAmount(next: number) {
    const clamped = roundVnd(Math.min(total, Math.max(0, next)));
    setClientAmount(clamped);
  }

  function applyPreset(clientPctValue: number) {
    applyClientAmount(roundVnd(total * clientPctValue));
  }

  function handleSlider(value: number) {
    applyClientAmount(roundVnd((value / 100) * total));
  }

  const splitValid = total > 0 && clientAmount + freelancerAmount === total;
  const canSubmit =
    !busy &&
    escrowFunded &&
    (mode !== "split" || splitValid) &&
    (mode !== "dismiss" || !isCancelRejectedDispute);

  const confirmLabel = useMemo(() => {
    switch (mode) {
      case "split":
        return `Xác nhận phân chia — C ${formatVnd(clientAmount)} · F ${formatVnd(freelancerAmount)}`;
      case "full_refund":
        return `Xác nhận hoàn ${formatVnd(total)} cho Client`;
      case "release":
        return `Xác nhận giải ngân ${formatVnd(total)} cho Freelancer`;
      case "dismiss":
        return "Xác nhận bác tranh chấp";
      default:
        return "Xác nhận quyết định";
    }
  }, [mode, clientAmount, freelancerAmount, total]);

  function handleSubmit() {
    if (!canSubmit) return;
    void onResolve(mode, {
      adminNote: adminNote.trim() || undefined,
      ...(mode === "split" ? { clientAmount, freelancerAmount } : {}),
    });
  }

  return (
    <section className="admin-dispute-resolve" aria-label="Quyết định của Admin">
      <header className="admin-dispute-resolve__head">
        <div className="admin-dispute-resolve__head-text">
          <FaGavel className="admin-dispute-resolve__head-icon" aria-hidden />
          <div>
            <h4 className="admin-dispute-resolve__title">Quyết định của Admin</h4>
            <p className="admin-dispute-resolve__lead">
              {isCancelRejectedDispute
                ? "Tranh chấp từ từ chối hủy đơn — phân chia ký quỹ và đóng case. Không thể bác để tiếp tục đơn."
                : "Chọn phương án xử lý, xem trước phân bổ rồi xác nhận. Hành động không thể hoàn tác."}
            </p>
          </div>
        </div>
        <div className="admin-dispute-resolve__escrow-badge">
          <span className="admin-dispute-resolve__escrow-label">Ký quỹ</span>
          <strong className="admin-dispute-resolve__escrow-value">{formatVnd(total)}</strong>
          <span
            className={`admin-dispute-resolve__escrow-status${escrowFunded ? "" : " admin-dispute-resolve__escrow-status--warn"}`}
          >
            {escrowFunded ? "Đang giữ (funded)" : escrowStatus || "Không funded"}
          </span>
        </div>
      </header>

      {!escrowFunded ? (
        <p className="admin-dispute-resolve__warn" role="alert">
          Ký quỹ không ở trạng thái funded — không thể chia tiền cho đến khi escrow hợp lệ.
        </p>
      ) : null}

      {error ? (
        <p className="admin-toast admin-toast--err admin-dispute-resolve__error" role="alert">
          {error}
        </p>
      ) : null}

      <fieldset className="admin-dispute-resolve__modes" disabled={busy || !escrowFunded}>
        <legend className="admin-dispute-resolve__legend">Phương án xử lý</legend>
        <div className="admin-dispute-resolve__mode-grid">
          {visibleModes.map((opt) => (
            <label
              key={opt.id}
              className={`admin-dispute-resolve__mode${mode === opt.id ? " admin-dispute-resolve__mode--active" : ""}`}
            >
              <input
                type="radio"
                name="dispute-resolve-mode"
                value={opt.id}
                checked={mode === opt.id}
                onChange={() => setMode(opt.id)}
                className="admin-dispute-resolve__mode-input"
              />
              <span className="admin-dispute-resolve__mode-icon">{opt.icon}</span>
              <span className="admin-dispute-resolve__mode-title">{opt.title}</span>
              <span className="admin-dispute-resolve__mode-desc">{opt.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {mode === "split" && total > 0 ? (
        <div className="admin-dispute-resolve__split">
          <div className="admin-dispute-resolve__split-head">
            <span className="admin-dispute-resolve__split-label">Tỷ lệ phân chia</span>
            <div className="admin-dispute-resolve__presets">
              {SPLIT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="admin-dispute-resolve__preset"
                  disabled={busy || !escrowFunded}
                  onClick={() => applyPreset(preset.clientPct)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <input
            type="range"
            className="admin-dispute-resolve__slider"
            min={0}
            max={100}
            step={1}
            value={Math.round(clientPct)}
            disabled={busy || !escrowFunded}
            onChange={(e) => handleSlider(Number(e.target.value))}
            aria-label="Tỷ lệ hoàn cho Client"
          />

          <div className="admin-dispute-resolve__split-bar" aria-hidden>
            <span
              className="admin-dispute-resolve__split-bar-client"
              style={{ width: `${clientPct}%` }}
            />
            <span
              className="admin-dispute-resolve__split-bar-freelancer"
              style={{ width: `${100 - clientPct}%` }}
            />
          </div>

          <div className="admin-dispute-resolve__amount-row">
            <label className="admin-dispute-resolve__amount-field admin-dispute-resolve__amount-field--client">
              <span>Client được hoàn</span>
              <input
                type="number"
                min={0}
                max={total}
                step={1000}
                value={clientAmount}
                disabled={busy || !escrowFunded}
                onChange={(e) => applyClientAmount(Number(e.target.value) || 0)}
              />
              <em>{formatVnd(clientAmount)}</em>
            </label>
            <label className="admin-dispute-resolve__amount-field admin-dispute-resolve__amount-field--freelancer">
              <span>Freelancer nhận</span>
              <input
                type="number"
                min={0}
                max={total}
                step={1000}
                value={freelancerAmount}
                disabled={busy || !escrowFunded}
                onChange={(e) => applyClientAmount(total - (Number(e.target.value) || 0))}
              />
              <em>{formatVnd(freelancerAmount)}</em>
            </label>
          </div>

          {!splitValid ? (
            <p className="admin-dispute-resolve__warn" role="alert">
              Tổng phải bằng {formatVnd(total)} (hiện {formatVnd(clientAmount + freelancerAmount)}).
            </p>
          ) : null}
        </div>
      ) : null}

      {mode !== "split" && total > 0 ? (
        <div className="admin-dispute-resolve__preview">
          <div className="admin-dispute-resolve__preview-row">
            <span>Client</span>
            <strong>
              {mode === "full_refund" ? formatVnd(total) : mode === "release" ? formatVnd(0) : "—"}
            </strong>
          </div>
          <div className="admin-dispute-resolve__preview-row">
            <span>Freelancer</span>
            <strong>
              {mode === "release" ? formatVnd(total) : mode === "full_refund" ? formatVnd(0) : "—"}
            </strong>
          </div>
          {mode === "dismiss" ? (
            <p className="admin-dispute-resolve__preview-note">
              Không chia tiền — đơn quay lại trạng thái active.
            </p>
          ) : null}
        </div>
      ) : null}

      <label className="admin-field admin-dispute-resolve__note">
        <span className="admin-field__label">Ghi chú gửi các bên (tùy chọn)</span>
        <textarea
          className="admin-textarea"
          rows={3}
          value={adminNote}
          disabled={busy}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Lý do phán quyết, căn cứ bằng chứng đã xem xét..."
        />
      </label>

      <footer className="admin-dispute-resolve__foot">
        <button
          type="button"
          className="admin-btn admin-btn--primary admin-dispute-resolve__submit"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {busy ? "Đang xử lý..." : confirmLabel}
        </button>
      </footer>
    </section>
  );
}
