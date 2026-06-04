"use client";

import Link from "next/link";
import { formatDate, formatVnd } from "@/lib/format";
import {
  contractStatusClass,
  contractStatusLabel,
  type JobsListItem,
} from "./jobs-filter";
import {
  isActiveJobContract,
  isCompletedJobContract,
  jobContractHref,
  jobContractStageLabel,
  jobContractStatusHint,
} from "@/lib/findwork/jobContractsDisplay";
import { isWorkspaceArchived } from "./jobs-filter";

type JobContractCardProps = {
  item: JobsListItem;
  counterpartyLabel?: string;
  viewerRole?: "client" | "freelancer";
};

function badgeClass(item: JobsListItem): string {
  if (isCompletedJobContract(item)) return "fw-contracts__badge fw-contracts__badge--completed";
  if (isWorkspaceArchived(item.contractStatus, item.jobStatus)) {
    return "fw-contracts__badge fw-contracts__badge--archived";
  }
  if (isActiveJobContract(item)) return "fw-contracts__badge fw-contracts__badge--active";
  return "fw-contracts__badge fw-contracts__badge--archived";
}

function cardClass(item: JobsListItem): string {
  let base = "fw-contracts__card";
  if (isCompletedJobContract(item)) return `${base} fw-contracts__card--completed`;
  if (isWorkspaceArchived(item.contractStatus, item.jobStatus)) {
    return `${base} fw-contracts__card--archived`;
  }
  if (isActiveJobContract(item)) return `${base} fw-contracts__card--active`;
  return base;
}

export default function JobContractCard({
  item,
  counterpartyLabel = "Client",
  viewerRole = "freelancer",
}: JobContractCardProps) {
  const price =
    item.agreedPrice != null ? formatVnd(item.agreedPrice) : formatVnd(item.budget);
  const href = jobContractHref(item, viewerRole);

  return (
    <li>
      <Link href={href} className={cardClass(item)}>
        <div className="fw-contracts__card-top">
          <h2 className="fw-contracts__card-title">{item.title}</h2>
          <span className={badgeClass(item)}>{jobContractStageLabel(item)}</span>
        </div>
        <p className="fw-contracts__card-meta">
          {counterpartyLabel}: <strong>{item.counterparty || "—"}</strong>
          <span className="fw-contracts__card-price"> · {price}</span>
        </p>
        <p className="fw-contracts__card-hint">{jobContractStatusHint(item)}</p>
        {item.progressNote ? (
          <p className="fw-contracts__card-meta" style={{ marginTop: "0.25rem" }}>
            {item.progressNote.slice(0, 140)}
            {item.progressNote.length > 140 ? "…" : ""}
          </p>
        ) : null}
        <div className="fw-contracts__card-foot">
          <span className={contractStatusClass(item.contractStatus)}>
            {contractStatusLabel(item.contractStatus)}
          </span>
          {item.hasSafepay ? (
            <span className="fw-contracts__badge fw-contracts__badge--safepay">Escrow</span>
          ) : null}
          {item.deliveredAt ? (
            <span>Bàn giao {formatDate(item.deliveredAt)}</span>
          ) : null}
          {item.jobDueAt ? <span>Hạn việc {formatDate(item.jobDueAt)}</span> : null}
          {item.reviewRating != null ? (
            <span>Đánh giá {item.reviewRating}/5</span>
          ) : null}
          <span>Cập nhật {formatDate(item.activityAt)}</span>
          <span className="fw-contracts__card-action">Mở hợp đồng →</span>
        </div>
      </Link>
    </li>
  );
}
