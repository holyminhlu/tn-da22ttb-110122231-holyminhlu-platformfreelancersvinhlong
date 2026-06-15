"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { createServiceQuote } from "@/lib/api/contracts";
import { getService } from "@/lib/api/services";
import { useClientIdentityVerification } from "@/hooks/useClientIdentityVerification";
import {
  formatPackagePrice,
  parseServicePackages,
  type ServicePackage,
} from "@/lib/hire/servicePackages";
import ClientIdentityVerifyGate from "./ClientIdentityVerifyGate";
import HireShell from "./HireShell";
import "./hire.css";
import "./hire-quote.css";

function defaultMilestones(total: number) {
  const p1 = Math.round(total * 0.3);
  const p2 = Math.round(total * 0.4);
  const p3 = Math.max(0, total - p1 - p2);
  return [
    { title: "Thiết kế / Phân tích yêu cầu", amount: p1 },
    { title: "Phát triển & triển khai", amount: p2 },
    { title: "Kiểm thử & bàn giao", amount: p3 },
  ];
}

export default function ClientServiceQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("serviceId") || "";
  const freelancerId = searchParams.get("freelancerId") || "";
  const { loading: verifyLoading, verified, user, idv } = useClientIdentityVerification();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [serviceTitle, setServiceTitle] = useState("");
  const [freelancerName, setFreelancerName] = useState("");
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [clientBrief, setClientBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = useCallback(async () => {
    if (!serviceId) {
      setError("Thiếu mã dịch vụ. Quay lại tìm kiếm và chọn freelancer.");
      setLoading(false);
      return;
    }
    if (!verified) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getService(serviceId);
      if (freelancerId && data.service.freelancer_id !== freelancerId) {
        setError("Dịch vụ không khớp với freelancer đã chọn.");
        return;
      }
      setServiceTitle(data.service.title);
      setFreelancerName(data.service.freelancer_name);
      const packs = parseServicePackages(
        data.service.packages,
        data.service.price,
        data.service.delivery_days,
      );
      setPackages(packs);
      setSelectedId(packs[0]?.id || "");
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải dịch vụ.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [serviceId, freelancerId, verified]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => packages.find((p) => p.id === selectedId) ?? null,
    [packages, selectedId],
  );

  const milestones = useMemo(
    () => (selected ? defaultMilestones(selected.price) : []),
    [selected],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !clientBrief.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await createServiceQuote({
        serviceId,
        packageId: selected.id,
        clientBrief: clientBrief.trim(),
        milestones: milestones.map((m, i) => ({
          title: m.title,
          amount: m.amount,
          sort_order: i + 1,
        })),
      });
      router.push(`/hire/orders/${result.contractId}`);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể gửi yêu cầu báo giá.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <HireShell>
      <div className="hire-page hire-quote hire-quote--full-width">
        <Link href="/hire/search" className="hire-fl-detail__back">
          <FaArrowLeft aria-hidden /> Quay lại tìm kiếm
        </Link>

        <header className="hire-page__head">
          <div>
            <h1 className="hire-page__title">Yêu cầu báo giá</h1>
            <p className="hire-page__lead">
              Chọn gói dịch vụ, mô tả yêu cầu và gửi đề xuất — freelancer sẽ phản hồi trước khi
              ký quỹ.
            </p>
          </div>
        </header>

        {verifyLoading ? (
          <p className="hire-page__state">Đang kiểm tra tài khoản...</p>
        ) : !verified ? (
          <ClientIdentityVerifyGate
            user={user}
            idv={idv}
            title="Xác minh danh tính trước khi gửi yêu cầu báo giá"
            lead="Hoàn thành 5 mục thông tin nhận dạng và xác minh thẻ tín dụng (bước 2) tại trang xác minh, sau đó bạn có thể gửi yêu cầu báo giá."
            backHref="/hire/search"
            backLabel="Quay lại tìm kiếm freelancer"
          />
        ) : loading ? (
          <p className="hire-page__state">Đang tải dịch vụ...</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : (
          <form className="hire-quote__layout" onSubmit={(e) => void handleSubmit(e)}>
            <div>
              <div className="hire-quote__service-head">
                <h2 className="hire-quote__service-title">{serviceTitle}</h2>
                <p className="hire-quote__freelancer">Freelancer: {freelancerName}</p>
              </div>

              <h3 className="hire-quote__section-title">Chọn gói dịch vụ</h3>
              <ul className="hire-quote__packages" role="listbox" aria-label="Gói dịch vụ">
                {packages.map((pack) => (
                  <li key={pack.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedId === pack.id}
                      className={`hire-quote__package${selectedId === pack.id ? " hire-quote__package--selected" : ""}`}
                      onClick={() => setSelectedId(pack.id)}
                    >
                      <p className="hire-quote__package-name">{pack.name}</p>
                      <p className="hire-quote__package-price">{formatPackagePrice(pack.price)}</p>
                      <p className="hire-quote__package-meta">
                        {pack.deliveryDays} ngày · {pack.revisions || "2 lần chỉnh sửa"}
                      </p>
                      {pack.features.length > 0 ? (
                        <ul className="hire-quote__package-features">
                          {pack.features.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>

              <h3 className="hire-quote__section-title" style={{ marginTop: "1.5rem" }}>
                Mô tả yêu cầu của bạn
              </h3>
              <textarea
                className="hire-quote__brief"
                placeholder="Mô tả mục tiêu, phạm vi, deadline, công nghệ mong muốn, tài liệu đính kèm..."
                value={clientBrief}
                onChange={(e) => setClientBrief(e.target.value)}
                required
                aria-label="Mô tả yêu cầu"
              />
            </div>

            <aside className="hire-quote__sidebar">
              <h3 className="hire-quote__section-title">Tóm tắt đơn hàng</h3>
              {selected ? (
                <>
                  <div className="hire-quote__summary-row">
                    <span>Gói</span>
                    <strong>{selected.name}</strong>
                  </div>
                  <div className="hire-quote__summary-row">
                    <span>Tổng dự kiến</span>
                    <strong>{formatPackagePrice(selected.price)}</strong>
                  </div>
                  <div className="hire-quote__summary-row">
                    <span>Thời gian</span>
                    <strong>{selected.deliveryDays} ngày</strong>
                  </div>
                  <h4 className="hire-quote__section-title" style={{ marginTop: "1rem" }}>
                    Cột mốc (Milestone) đề xuất
                  </h4>
                  <ul className="hire-quote__milestones">
                    {milestones.map((m) => (
                      <li key={m.title}>
                        <span>{m.title}</span>
                        <strong>{formatPackagePrice(m.amount)}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="hire-quote__hint">Chọn một gói dịch vụ.</p>
              )}

              {submitError ? (
                <p className="hire-page__state hire-page__state--error" role="alert">
                  {submitError}
                </p>
              ) : null}

              <button
                type="submit"
                className="hire-quote__submit"
                disabled={submitting || !selected || !clientBrief.trim()}
              >
                {submitting ? "Đang gửi..." : "Gửi yêu cầu báo giá"}
              </button>
              <p className="hire-quote__hint">
                Sau khi gửi, bạn theo dõi đề xuất của freelancer, phỏng vấn/trao đổi, nạp ký
                quỹ (Escrow) rồi nghiệm thu từng giai đoạn.
              </p>
            </aside>
          </form>
        )}
      </div>
    </HireShell>
  );
}
