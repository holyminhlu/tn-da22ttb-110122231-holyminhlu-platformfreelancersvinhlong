"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listServiceOrders, type ServiceOrderListItem } from "@/lib/api/contracts";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import {
  escrowStatusLabel,
  escrowStatusTone,
  filterServiceOrders,
  orderCardPreviewText,
  orderCardStatusTone,
  orderCardTitle,
  orderCardToneClass,
  orderDeadlineTone,
  orderStatusBadgeClass,
  orderStatusChipClass,
  orderStatusHint,
  parsePackageName,
  workflowStageLabel,
  workflowStageTone,
  type OrderListFilter,
} from "@/lib/orders/serviceOrderDisplay";
import {
  orderCardProposalScopePreview,
  resolveProposalTimelineLabel,
} from "@/lib/orders/proposalDisplay";
import { orderDeadlineSubtitle } from "@/lib/orders/workflowSlaDisplay";
import HireShell from "./HireShell";
import "./hire.css";
import "../findwork/findwork-orders.css";

export default function ClientServiceOrdersPage() {
  const { t, formatDate } = useTranslation();

  const filters = useMemo(
    () => [
      { value: "all" as const, label: t("hireOrders.filterAll") },
      { value: "action" as const, label: t("hireOrders.filterAction") },
      { value: "active" as const, label: t("hireOrders.filterActive") },
      { value: "done" as const, label: t("hireOrders.filterDone") },
    ],
    [t],
  );

  const [orders, setOrders] = useState<ServiceOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<OrderListFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listServiceOrders();
      if (data.role !== "client") {
        setError(t("hirePage.clientOnly"));
        setOrders([]);
        return;
      }
      setOrders(data.orders ?? []);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : t("hirePage.loadOrdersError");
      setError(message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => filterServiceOrders(orders, filter, false),
    [orders, filter],
  );

  const proposalPending = useMemo(
    () =>
      orders.filter(
        (o) =>
          String(o.workflow_stage).toLowerCase() === "selection" &&
          Boolean(o.proposal_text?.trim()),
      ).length,
    [orders],
  );

  return (
    <HireShell>
      <div className="hire-page hire-orders hire-orders--full-width">
        <header className="hire-page__head">
          <div>
            <h1 className="hire-page__title">{t("hireOrders.title")}</h1>
            <p className="hire-page__lead">
              {t("hireOrders.lead")}
              {proposalPending > 0 ? t("hireOrders.proposalsPending", { count: proposalPending }) : ""}
            </p>
          </div>
          <Link href="/hire/search" className="hire-page__post-btn">
            {t("hirePage.findFreelancer")}
          </Link>
        </header>

        {proposalPending > 0 ? (
          <p className="hire-page__banner hire-page__banner--success" role="status">
            {t("hireOrders.proposalBanner")}
          </p>
        ) : null}

        <div className="fw-orders__filters" role="tablist" aria-label={t("hireOrders.filterAria")}>
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              className={`fw-orders__filter${filter === item.value ? " fw-orders__filter--active" : ""}`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="hire-page__state">{t("common.loading")}</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : filtered.length === 0 ? (
          <div className="fw-orders__empty">
            {filter === "all" ? t("hireOrders.emptyAll") : t("hireOrders.emptyFilter")}
          </div>
        ) : (
          <ul className="fw-orders__list">
            {filtered.map((order) => {
              const pkgName = parsePackageName(order.package_snapshot);
              const hint = orderStatusHint(order, false);
              const deadlineLine = orderDeadlineSubtitle(order);
              const proposalPreview = orderCardProposalScopePreview(order.proposal_text);
              const proposalTimeline = resolveProposalTimelineLabel(
                order.proposal_text || "",
                undefined,
                order.proposal_delivery_days,
              );
              const briefPreview = orderCardPreviewText(order.client_brief);
              const statusTone = orderCardStatusTone(order, false);
              const stageTone = workflowStageTone(order.workflow_stage, order);
              const escrowTone = escrowStatusTone(order.escrow_status);
              const deadlineTone = orderDeadlineTone(deadlineLine);
              const urgent =
                String(order.workflow_stage).toLowerCase() === "selection" && Boolean(proposalPreview);
              const badgeTone = urgent ? "warning" : statusTone;

              return (
                <li key={order.id}>
                  <Link
                    href={`/hire/orders/${order.id}${urgent ? "#de-xuat" : ""}`}
                    className={`fw-orders__card ${orderCardToneClass(statusTone)}${urgent ? " fw-orders__card--urgent" : ""}`}
                  >
                    <div className="fw-orders__card-top">
                      <h2 className="fw-orders__card-title">
                        {orderCardTitle(order.service_title, order.job_title)}
                      </h2>
                      <span className={orderStatusBadgeClass(badgeTone)}>
                        {urgent ? t("hirePage.newProposal") : hint}
                      </span>
                    </div>
                    <p className="fw-orders__card-meta">
                      {t("hirePage.freelancerLabel", { name: order.counterparty_name || "—" })}
                      {pkgName ? ` · ${t("hirePage.packageLabel", { name: pkgName })}` : ""}
                      {order.agreed_price != null
                        ? ` · ${formatPackagePrice(Number(order.agreed_price))}`
                        : ""}
                      {proposalTimeline !== "—" ? ` · ${proposalTimeline}` : ""}
                    </p>
                    {proposalPreview ? (
                      <>
                        <p className="fw-orders__card-preview fw-orders__card-preview--proposal">
                          <span className="fw-orders__card-preview-label">{t("hirePage.proposalLabel")}</span>{" "}
                          {proposalPreview}
                        </p>
                        {urgent ? (
                          <span className="fw-orders__card-proposal-cta">Xem chi tiết đề xuất</span>
                        ) : null}
                      </>
                    ) : briefPreview ? (
                      <p className="fw-orders__card-preview">{briefPreview}</p>
                    ) : null}
                    <div className="fw-orders__card-foot">
                      <span className={orderStatusChipClass(stageTone)}>
                        {workflowStageLabel(order.workflow_stage)}
                      </span>
                      <span className={orderStatusChipClass(escrowTone)}>
                        {t("hirePage.escrowLabel", { status: escrowStatusLabel(order.escrow_status) })}
                      </span>
                      {deadlineLine ? (
                        <span className={orderStatusChipClass(deadlineTone)}>{deadlineLine}</span>
                      ) : null}
                      <span className="fw-orders__card-foot-date">
                        {t("hirePage.updatedAt", {
                          date: formatDate(order.updated_at || order.created_at),
                        })}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </HireShell>
  );
}
