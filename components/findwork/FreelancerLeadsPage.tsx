"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStoredUser } from "@/hooks/useStoredUser";
import { listServiceOrders, type ServiceOrderListItem } from "@/lib/api/contracts";
import { listJobs, type JobListing } from "@/lib/api/jobs";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import {
  filterJobLeads,
  filterServiceLeads,
  isJobLeadVisible,
  isServiceLead,
  jobLeadKind,
  jobLeadStatusLabel,
  mergeLeadCounts,
  countJobLeadsByFilter,
  type LeadFilter,
} from "@/lib/findwork/leadsDisplay";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import { formatDate, formatVnd } from "@/lib/format";
import { relativePosted } from "@/lib/jobsDisplay";
import FreelancerWorkShell from "./FreelancerWorkShell";
import "./findwork-leads.css";

const FILTERS: { value: LeadFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "new", label: "Việc mới" },
  { value: "interested", label: "Client quan tâm" },
  { value: "service", label: "Đơn chờ đề xuất" },
];

const JOB_FETCH_LIMIT = 80;

function leadBadgeClass(kind: ReturnType<typeof jobLeadKind>): string {
  if (kind === "new") return "fw-leads__badge fw-leads__badge--new";
  if (kind === "hot") return "fw-leads__badge fw-leads__badge--hot";
  if (kind === "pending") return "fw-leads__badge fw-leads__badge--pending";
  return "fw-leads__badge";
}

export default function FreelancerLeadsPage() {
  const { user, ready, isFreelancer } = useStoredUser({ refreshFromApi: false });
  const isGuest = ready && !user;

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [orders, setOrders] = useState<ServiceOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<LeadFilter>("all");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async () => {
    if (!user || !isFreelancer) {
      setLoading(false);
      setJobs([]);
      setOrders([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [jobsData, ordersData] = await Promise.all([
        listJobs({ limit: JOB_FETCH_LIMIT, offset: 0, sort: "newest" }, { auth: true }),
        listServiceOrders(),
      ]);

      if (ordersData.role !== "freelancer") {
        setError("Trang này dành cho tài khoản freelancer.");
        setJobs([]);
        setOrders([]);
        return;
      }

      setJobs((jobsData.jobs ?? []).filter(isJobLeadVisible));
      setOrders((ordersData.orders ?? []).filter(isServiceLead));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải khách hàng tiềm năng.";
      setError(message);
      setJobs([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user, isFreelancer]);

  useEffect(() => {
    void load();
  }, [load]);

  const jobCounts = useMemo(() => countJobLeadsByFilter(jobs), [jobs]);
  const serviceCount = orders.length;
  const counts = useMemo(
    () => mergeLeadCounts(jobCounts, serviceCount),
    [jobCounts, serviceCount],
  );

  const filteredJobs = useMemo(
    () => filterJobLeads(jobs, filter, searchInput),
    [jobs, filter, searchInput],
  );

  const filteredOrders = useMemo(
    () => filterServiceLeads(orders, filter, searchInput),
    [orders, filter, searchInput],
  );

  const showJobs = filter !== "service";
  const showOrders = filter === "all" || filter === "service";
  const hasJobRows = showJobs && filteredJobs.length > 0;
  const hasOrderRows = showOrders && filteredOrders.length > 0;
  const isEmpty = !loading && !error && !hasJobRows && !hasOrderRows;

  return (
    <FreelancerWorkShell>
      <div className="fw-leads">
        <header className="fw-leads__head">
          <div>
            <h1 className="fw-leads__title">Khách hàng tiềm năng</h1>
            <p className="fw-leads__lead">
              Theo dõi client đang tuyển việc, phản hồi báo giá của bạn và đơn dịch vụ cần gửi đề
              xuất — tập trung cơ hội cần hành động sớm.
            </p>
          </div>
          <Link href="/findwork" className="fw-leads__cta">
            Tìm thêm việc
          </Link>
        </header>

        {isGuest ? (
          <div className="fw-leads__guest">
            <p>Đăng nhập với tài khoản freelancer để xem khách hàng tiềm năng và gửi báo giá.</p>
            <Link href="/dang-nhap" className="fw-leads__cta">
              Đăng nhập
            </Link>
          </div>
        ) : ready && user && !isFreelancer ? (
          <p className="text-sm text-red-700" role="alert">
            Trang này dành cho tài khoản freelancer.
          </p>
        ) : (
          <>
            <div className="fw-leads__stats" aria-label="Tóm tắt cơ hội">
              <div className="fw-leads__stat">
                <span className="fw-leads__stat-value">{counts.all}</span>
                <span className="fw-leads__stat-label">Tổng cơ hội</span>
              </div>
              <div className="fw-leads__stat">
                <span className="fw-leads__stat-value">{counts.new}</span>
                <span className="fw-leads__stat-label">Việc chưa báo giá</span>
              </div>
              <div className="fw-leads__stat">
                <span className="fw-leads__stat-value">{counts.interested}</span>
                <span className="fw-leads__stat-label">Đang theo dõi</span>
              </div>
              <div className="fw-leads__stat">
                <span className="fw-leads__stat-value">{counts.service}</span>
                <span className="fw-leads__stat-label">Đơn chờ đề xuất</span>
              </div>
            </div>

            <div className="fw-leads__toolbar">
              <input
                type="search"
                className="fw-leads__search"
                placeholder="Tìm theo tên client, việc, dịch vụ..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Tìm khách hàng tiềm năng"
              />
              <div className="fw-leads__filters" role="tablist" aria-label="Lọc cơ hội">
                {FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="tab"
                    aria-selected={filter === item.value}
                    className={`fw-leads__filter${filter === item.value ? " fw-leads__filter--active" : ""}`}
                    onClick={() => setFilter(item.value)}
                  >
                    {item.label}
                    <span className="fw-leads__filter-count">{counts[item.value]}</span>
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500">Đang tải...</p>
            ) : error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : isEmpty ? (
              <div className="fw-leads__empty">
                {filter === "all"
                  ? "Chưa có khách hàng tiềm năng. Hãy duyệt Tìm việc làm và gửi báo giá, hoặc chờ client đặt gói dịch vụ của bạn."
                  : "Không có mục nào trong bộ lọc này."}
              </div>
            ) : (
              <>
                {showJobs && filteredJobs.length > 0 ? (
                  <section className="fw-leads__section" aria-labelledby="fw-leads-jobs-heading">
                    <h2 id="fw-leads-jobs-heading" className="fw-leads__section-title">
                      Việc đăng tuyển
                    </h2>
                    <ul className="fw-leads__list">
                      {filteredJobs.map((job) => {
                        const kind = jobLeadKind(job);
                        const avatarSrc = resolveAvatarSrc(job.client_avatar_url);
                        const initials = getUserInitials(job.client_name ?? undefined);
                        const budgetText =
                          job.budget != null ? formatVnd(job.budget) : "Thỏa thuận";

                        return (
                          <li key={job.id}>
                            <Link
                              href={`/work/detail/${job.id}`}
                              className={`fw-leads__card${kind === "hot" ? " fw-leads__card--hot" : ""}`}
                            >
                              {avatarSrc ? (
                                <Image
                                  src={avatarSrc}
                                  alt=""
                                  width={44}
                                  height={44}
                                  className="fw-leads__avatar"
                                  unoptimized
                                />
                              ) : (
                                <span className="fw-leads__avatar" aria-hidden>
                                  {initials}
                                </span>
                              )}
                              <div className="fw-leads__card-main">
                                <p className="fw-leads__card-client">
                                  {job.client_name?.trim() || "Client"}
                                  {job.client_email_verified ? " · Đã xác minh email" : ""}
                                </p>
                                <p className="fw-leads__card-job">{job.title}</p>
                                <p className="fw-leads__card-meta">
                                  Ngân sách {budgetText}
                                  {job.location_label ? ` · ${job.location_label}` : ""}
                                  {job.category ? ` · ${job.category}` : ""}
                                  <br />
                                  Đăng {relativePosted(job.created_at)}
                                  {job.quote_count != null && job.quote_count > 0
                                    ? ` · ${job.quote_count} báo giá`
                                    : ""}
                                </p>
                              </div>
                              <div className="fw-leads__card-aside">
                                <span className={leadBadgeClass(kind)}>
                                  {jobLeadStatusLabel(job)}
                                </span>
                                <span className="fw-leads__action">
                                  {kind === "new" ? "Gửi báo giá →" : "Xem chi tiết →"}
                                </span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null}

                {showOrders && filteredOrders.length > 0 ? (
                  <section className="fw-leads__section" aria-labelledby="fw-leads-orders-heading">
                    <h2 id="fw-leads-orders-heading" className="fw-leads__section-title">
                      Đơn dịch vụ
                    </h2>
                    <ul className="fw-leads__list">
                      {filteredOrders.map((order) => (
                        <li key={order.id}>
                          <Link
                            href={`/findwork/orders/${order.id}`}
                            className="fw-leads__card fw-leads__card--service"
                          >
                            <span className="fw-leads__avatar" aria-hidden>
                              {getUserInitials(order.counterparty_name ?? undefined)}
                            </span>
                            <div className="fw-leads__card-main">
                              <p className="fw-leads__card-client">
                                {order.counterparty_name?.trim() || "Client"}
                              </p>
                              <p className="fw-leads__card-job">
                                {order.service_title || order.job_title || "Đơn dịch vụ"}
                              </p>
                              <p className="fw-leads__card-meta">
                                {order.client_brief
                                  ? `${order.client_brief.slice(0, 120)}${order.client_brief.length > 120 ? "…" : ""}`
                                  : "Client đã đặt gói — cần gửi đề xuất của bạn."}
                                {order.agreed_price != null ? (
                                  <>
                                    <br />
                                    Giá gói {formatPackagePrice(Number(order.agreed_price))}
                                  </>
                                ) : null}
                                <br />
                                Tạo {formatDate(order.created_at)}
                              </p>
                            </div>
                            <div className="fw-leads__card-aside">
                              <span className="fw-leads__badge fw-leads__badge--service">
                                Chờ đề xuất
                              </span>
                              <span className="fw-leads__action">Soạn đề xuất →</span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            )}
          </>
        )}
      </div>
    </FreelancerWorkShell>
  );
}
