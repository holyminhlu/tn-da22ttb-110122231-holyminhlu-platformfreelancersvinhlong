import {
  transactionCategoryLabel,
  type BillingTransaction,
} from "@/lib/api/payments";
import { formatDate, formatVnd } from "@/lib/format";

export type ClientBillingRow =
  | { type: "single"; tx: BillingTransaction }
  | {
      type: "group";
      id: string;
      tx: BillingTransaction;
      children: BillingTransaction[];
      combinedCategory: string;
    };

function billingGroupKey(tx: BillingTransaction) {
  const day = tx.occurredAt?.slice(0, 10) ?? "";
  return [
    day,
    tx.jobId ?? tx.projectTitle,
    tx.freelancerId ?? tx.freelancerName,
    Math.abs(tx.amount),
  ].join("|");
}

/** Gộp cặp Nạp ký quỹ + Thanh toán milestone cùng ngày, cùng số tiền, cùng dự án. */
export function groupClientBillingTransactions(
  list: BillingTransaction[],
): ClientBillingRow[] {
  const byKey = new Map<string, BillingTransaction[]>();
  for (const tx of list) {
    const key = billingGroupKey(tx);
    const bucket = byKey.get(key) ?? [];
    bucket.push(tx);
    byKey.set(key, bucket);
  }

  const consumed = new Set<string>();
  const rows: ClientBillingRow[] = [];

  for (const tx of list) {
    if (consumed.has(tx.id)) continue;

    const bucket = byKey.get(billingGroupKey(tx)) ?? [tx];
    const escrow = bucket.find((t) => t.category === "escrow_hold");
    const milestone = bucket.find((t) => t.category === "milestone");

    if (escrow && milestone) {
      consumed.add(escrow.id);
      consumed.add(milestone.id);
      const children = [escrow, milestone].sort(
        (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
      );
      rows.push({
        type: "group",
        id: `grp-${escrow.id}-${milestone.id}`,
        tx: milestone,
        children,
        combinedCategory: "Thanh toán milestone (qua Escrow)",
      });

      for (const other of bucket) {
        if (other.id === escrow.id || other.id === milestone.id) continue;
        if (consumed.has(other.id)) continue;
        consumed.add(other.id);
        rows.push({ type: "single", tx: other });
      }
      continue;
    }

    consumed.add(tx.id);
    rows.push({ type: "single", tx });
  }

  return rows;
}

export function downloadInvoiceReceipt(tx: BillingTransaction) {
  if (!tx.invoiceNumber) return;

  const body = [
    "VĨNH LONG CONNECTED — BIÊN NHẬN / HÓA ĐƠN",
    "========================================",
    `Mã hóa đơn: ${tx.invoiceNumber}`,
    `Ngày: ${formatDate(tx.occurredAt)}`,
    `Dự án: ${tx.projectTitle}`,
    `Freelancer: ${tx.freelancerName}`,
    `Loại: ${transactionCategoryLabel(tx.category)}`,
    `Số tiền: ${formatVnd(tx.amount)}`,
    "",
    "Tài liệu tham chiếu từ hệ thống VLC. Liên hệ hỗ trợ nếu cần bản PDF chính thức.",
  ].join("\n");

  const blob = new Blob([`\uFEFF${body}`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${tx.invoiceNumber}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
