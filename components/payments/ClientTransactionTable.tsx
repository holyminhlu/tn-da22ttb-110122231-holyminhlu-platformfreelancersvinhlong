"use client";

import { formatDateUi, tUi, formatVndUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useState } from "react";
import { FaChevronDown, FaFileDownload } from "react-icons/fa";
import { transactionCategoryLabel } from "@/lib/api/payments";
import {
  downloadInvoiceReceipt,
  type ClientBillingRow,
} from "@/lib/payments/clientTransactionDisplay";

type ClientTransactionTableProps = {
  rows: ClientBillingRow[];
};

function ProjectCell({ title, jobId }: { title: string; jobId: string | null }) {
  const inner = (
    <span className="payments-table__project-text" title={title}>
      {title}
    </span>
  );

  if (jobId) {
    return (
      <Link href="/manage" className="payments-table__project-link" title={`Xem dự án: ${title}`}>
        {inner}
      </Link>
    );
  }

  return inner;
}

function AmountCell({ amount }: { amount: number }) {
  const formatVnd = formatVndUi;
  return (
    <td className={`payments-table__col--amount ${amount < 0 ? "payments-neg" : "payments-pos"}`}>
      {formatVndUi(amount)}
    </td>
  );
}

function InvoiceCell({ invoiceNumber, tx }: { invoiceNumber: string | null; tx: ClientBillingRow["tx"] }) {
  const t = tUi;
  if (!invoiceNumber) {
    return <td className="payments-table__col--invoice">—</td>;
  }

  return (
    <td className="payments-table__col--invoice">
      <button
        type="button"
        className="payments-invoice-link"
        title={`Tải biên nhận ${invoiceNumber}`}
        onClick={() => downloadInvoiceReceipt(tx)}
      >
        <FaFileDownload className="payments-invoice-link__icon" aria-hidden />
        <span>{invoiceNumber}</span>
      </button>
    </td>
  );
}

function GroupRow({ row }: { row: Extract<ClientBillingRow, { type: "group" }> }) {
  const t = tUi;
  const formatDate = formatDateUi;
  const formatVnd = formatVndUi;
  const [open, setOpen] = useState(false);
  const { tx, children, combinedCategory } = row;

  return (
    <>
      <tr className="payments-table__row payments-table__row--group">
        <td className="payments-table__col--date">{formatDateUi(tx.occurredAt)}</td>
        <td className="payments-table__project">
          <div className="payments-table__project-line">
            <button
              type="button"
              className={`payments-table__expand${open ? " payments-table__expand--open" : ""}`}
              aria-expanded={open}
              aria-label={open ? tUi("Thu gọn chi tiết giao dịch") : tUi("Xem chi tiết giao dịch")}
              onClick={() => setOpen((prev) => !prev)}
            >
              <FaChevronDown aria-hidden />
            </button>
            <ProjectCell title={tx.projectTitle} jobId={tx.jobId} />
          </div>
        </td>
        <td>{tx.freelancerName}</td>
        <td>
          <span className="payments-table__category payments-table__category--combined">
            {combinedCategory}
          </span>
        </td>
        <AmountCell amount={tx.amount} />
        <InvoiceCell invoiceNumber={tx.invoiceNumber} tx={tx} />
      </tr>
      {open
        ? children.map((child) => (
            <tr key={child.id} className="payments-table__row payments-table__row--child">
              <td className="payments-table__col--date">{formatDateUi(child.occurredAt)}</td>
              <td className="payments-table__col--child" colSpan={3}>
                <span className="payments-table__child-step">
                  ↳ {transactionCategoryLabel(child.category)}
                </span>
              </td>
              <td
                className={`payments-table__col--amount payments-table__col--child ${child.amount < 0 ? "payments-neg" : "payments-pos"}`}
              >
                {formatVndUi(child.amount)}
              </td>
              <td className="payments-table__col--invoice">—</td>
            </tr>
          ))
        : null}
    </>
  );
}

export default function ClientTransactionTable({
  rows }: ClientTransactionTableProps) {
  const t = tUi;
  const formatDate = formatDateUi;
  return (
    <div className="payments-table-wrap">
      <table className="payments-table payments-table--client">
        <thead>
          <tr>
            <th className="payments-table__col--date">{t("Ngày")}</th>
            <th>{t("Dự án / mô tả")}</th>
            <th>Freelancer</th>
            <th>{t("Loại")}</th>
            <th className="payments-table__col--amount">{t("Số tiền")}</th>
            <th className="payments-table__col--invoice">{t("Hóa đơn")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            row.type === "group" ? (
              <GroupRow key={row.id} row={row} />
            ) : (
              <tr key={row.tx.id} className="payments-table__row">
                <td className="payments-table__col--date">{formatDateUi(row.tx.occurredAt)}</td>
                <td className="payments-table__project">
                  <ProjectCell title={row.tx.projectTitle} jobId={row.tx.jobId} />
                </td>
                <td>{row.tx.freelancerName}</td>
                <td>{transactionCategoryLabel(row.tx.category)}</td>
                <AmountCell amount={row.tx.amount} />
                <InvoiceCell invoiceNumber={row.tx.invoiceNumber} tx={row.tx} />
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
