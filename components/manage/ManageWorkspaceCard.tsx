"use client";

import { formatDateUi, tUi, formatVndUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaEllipsisV, FaExternalLinkAlt } from "react-icons/fa";
import { formatDate, formatVnd } from "@/lib/format";
import { closeMyJob, deleteMyJob } from "@/lib/api/jobs";
import {
  contractStatusClass,
  contractStatusLabel,
  type JobsListItem,
} from "@/components/jobs/jobs-filter";
import { jobContractHref } from "@/lib/findwork/jobContractsDisplay";

type ManageWorkspaceCardProps = {
  item: JobsListItem;
  onChanged?: () => void;
};

function statusModifier(statusClass: string) {
  if (statusClass.includes("--active")) return "manage-workspace-card__status--active";
  if (statusClass.includes("--pending")) return "manage-workspace-card__status--pending";
  if (statusClass.includes("--completed")) return "manage-workspace-card__status--completed";
  return "manage-workspace-card__status--archived";
}

function normalizeStatus(s: string) {
  return String(s || "").toLowerCase();
}

function hasActiveContract(contractStatus: string | null | undefined) {
  const s = normalizeStatus(contractStatus || "");
  return s === "pending" || s === "active";
}

export default function ManageWorkspaceCard({ item, onChanged }: ManageWorkspaceCardProps) {  const { t, formatVnd, formatDate } = useTranslation();

  const price =
    item.agreedPrice != null ? formatVndUi(item.agreedPrice) : formatVndUi(item.budget);
  const statusClass = contractStatusClass(item.contractStatus);
  const jobOpen = normalizeStatus(item.jobStatus) === "open";
  const jobClosed = normalizeStatus(item.jobStatus) === "closed";
  const activeContract = hasActiveContract(
    item.contractStatus !== item.jobStatus ? item.contractStatus : null,
  );
  const canClose = jobOpen && !activeContract;
  const canEdit = jobOpen && !activeContract;
  const canDelete = jobOpen && !activeContract;

  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const runAction = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      setActionError("");
      try {
        await fn();
        setMenuOpen(false);
        onChanged?.();
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Thao tác thất bại.";
        setActionError(message);
      } finally {
        setBusy(false);
      }
    },
    [onChanged],
  );

  async function handleCloseRecruiting() {
    if (!canClose) return;
    const ok = window.confirm(
      "Gỡ tin khỏi tuyển dụng? Tin sẽ không nhận thêm báo giá mới nhưng vẫn lưu trong lịch sử.",
    );
    if (!ok) return;
    await runAction(() => closeMyJob(item.jobId));
  }

  async function handleDelete() {
    if (!canDelete) return;
    const ok = window.confirm(
      "Xóa công việc này? Hành động ẩn tin khỏi danh sách quản lý (xóa mềm) và không thể hoàn tác từ menu này.",
    );
    if (!ok) return;
    await runAction(() => deleteMyJob(item.jobId));
  }

  const showActions = canClose || canEdit || canDelete || jobClosed;
  const jobCode = item.jobId ? item.jobId.slice(0, 8).toUpperCase() : null;
  const isServiceOrder = Boolean(item.serviceId);
  const detailHref = isServiceOrder
    ? `/hire/orders/${item.id}`
    : jobContractHref(item, "client");
  const hasNewProposal =
    isServiceOrder &&
    Boolean(item.proposalText?.trim()) &&
    String(item.workflowStage || "").toLowerCase() === "selection";

  return (
    <article className="manage-workspace-card">
      <div className="manage-workspace-card__accent" aria-hidden />
      <div className="manage-workspace-card__body">
        <div className="manage-workspace-card__content">
          <div className="manage-workspace-card__top">
            <h2 className="manage-workspace-card__title">
              <Link href={detailHref} className="manage-workspace-card__title-link">
                {item.title}
              </Link>
              {hasNewProposal ? (
                <span className="manage-workspace-card__proposal-badge">Đề xuất mới</span>
              ) : null}
            </h2>
            {jobCode ? (
              <span className="manage-workspace-card__code" title={item.jobId}>
                #{jobCode}
              </span>
            ) : null}
          </div>

          <p className="manage-workspace-card__counterparty">
            {item.counterparty ? (
              <>
                <span className="manage-workspace-card__counterparty-label">Freelancer</span>
                {item.counterparty}
              </>
            ) : (
              <span className="manage-workspace-card__counterparty--muted">
                Chưa có freelancer được gán
              </span>
            )}
          </p>

          <div className="manage-workspace-card__meta-row">
            <span className={`manage-workspace-card__status ${statusModifier(statusClass)}`}>
              {contractStatusLabel(item.contractStatus)}
            </span>
            {jobClosed ? (
              <span className="manage-workspace-card__badge">Không tuyển nữa</span>
            ) : null}
            <span className="manage-workspace-card__price">{price}</span>
          </div>

          <p className="manage-workspace-card__activity">
            Hoạt động gần nhất: <time dateTime={item.activityAt}>{formatDateUi(item.activityAt)}</time>
          </p>
          {hasNewProposal ? (
            <Link href={`${detailHref}#de-xuat`} className="manage-workspace-card__proposal-cta">
              Xem chi tiết đề xuất
            </Link>
          ) : null}
        </div>

        <div className="manage-workspace-card__aside">
          <Link
            href={detailHref}
            className="manage-workspace-card__open"
            aria-label={`Mở phòng làm việc: ${item.title}`}
          >
            <FaExternalLinkAlt aria-hidden />
            <span>Mở</span>
          </Link>

          {showActions ? (
            <div className="manage-workspace-card__actions" ref={menuRef}>
              <button
                type="button"
                className="manage-workspace-card__menu-btn"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Thao tác nhanh"
                disabled={busy}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <FaEllipsisV aria-hidden />
              </button>
              {menuOpen ? (
                <div className="manage-workspace-card__menu" role="menu">
                  {canEdit ? (
                    <Link
                      href={`/hire/post?edit=${encodeURIComponent(item.jobId)}`}
                      className="manage-workspace-card__menu-item"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Chỉnh sửa tin
                    </Link>
                  ) : null}
                  {canClose ? (
                    <button
                      type="button"
                      className="manage-workspace-card__menu-item"
                      role="menuitem"
                      disabled={busy}
                      onClick={() => void handleCloseRecruiting()}
                    >
                      Gỡ — không tuyển nữa
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      className="manage-workspace-card__menu-item manage-workspace-card__menu-item--danger"
                      role="menuitem"
                      disabled={busy}
                      onClick={() => void handleDelete()}
                    >
                      Xóa tin
                    </button>
                  ) : null}
                  {!canClose && !canEdit && !canDelete ? (
                    <p className="manage-workspace-card__menu-hint" role="note">
                      {activeContract
                        ? "Đang có hợp đồng — không thể sửa hoặc xóa."
                        : "Không còn thao tác khả dụng cho tin này."}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {actionError ? (
        <p className="manage-workspace-card__error" role="alert">
          {actionError}
        </p>
      ) : null}
    </article>
  );
}
