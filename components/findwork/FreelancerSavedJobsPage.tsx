"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DashboardPagination from "@/components/dashboard/DashboardPagination";
import "@/components/dashboard/dashboardPagination.css";
import { useStoredUser } from "@/hooks/useStoredUser";
import { listSavedJobs, type JobListing } from "@/lib/api/jobs";
import JobCard from "./JobCard";
import FreelancerWorkShell from "./FreelancerWorkShell";

const PAGE_SIZE = 12;

export default function FreelancerSavedJobsPage() {
  const { user, ready, isFreelancer } = useStoredUser({ refreshFromApi: false });
  const isGuest = ready && !user;

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!user || !isFreelancer) {
      setLoading(false);
      setJobs([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const data = await listSavedJobs({ limit: PAGE_SIZE, offset });
      setJobs(data.jobs ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải công việc đã lưu.";
      setError(message);
      setJobs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [user, isFreelancer, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleUnsaved(jobId: string) {
    setJobs((prev) => prev.filter((job) => job.id !== jobId));
    setTotal((prev) => Math.max(0, prev - 1));
  }

  return (
    <FreelancerWorkShell>
      <div className="fw-saved">
        {isGuest ? (
          <div className="fw-saved__empty">
            <p>Đăng nhập tài khoản freelancer để xem việc đã lưu.</p>
            <Link href="/dang-nhap?next=/findwork/saved" className="fw-saved__cta">
              Đăng nhập
            </Link>
          </div>
        ) : !isFreelancer ? (
          <div className="fw-saved__empty">
            <p>Chỉ freelancer mới lưu và xem danh sách việc này.</p>
            <Link href="/findwork" className="fw-saved__cta">
              Về Tìm việc làm
            </Link>
          </div>
        ) : loading ? (
          <p className="text-sm text-gray-500">Đang tải...</p>
        ) : error ? (
          <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : jobs.length === 0 ? (
          <div className="fw-saved__empty">
            <p>Bạn chưa lưu công việc nào.</p>
            <p className="text-sm text-gray-500">
              Bấm biểu tượng sao trên thẻ việc hoặc trang chi tiết để lưu lại.
            </p>
            <Link href="/findwork" className="fw-saved__cta">
              Tìm việc ngay
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-600">
              {total} công việc đã lưu
              {totalPages > 1 ? ` · trang ${page}/${totalPages}` : ""}
            </p>
            <div>
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onSavedChange={(saved) => {
                    if (!saved) handleUnsaved(job.id);
                  }}
                />
              ))}
            </div>
            <DashboardPagination
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
              className="fw-saved__pagination"
            />
          </>
        )}
      </div>
    </FreelancerWorkShell>
  );
}
