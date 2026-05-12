/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconStar } from "@/components/home/icons";
import { HOME_A11Y } from "@/components/home/theme";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";

type FreelancerRow = {
  id: string;
  full_name: string;
  title: string;
  rating_avg: number;
  total_reviews: number;
};

export default function FeaturedFreelancers() {
  const apiBaseUrl = getApiBaseUrl();
  const [rows, setRows] = useState<FreelancerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch(apiUrl(`${apiPaths.auth.freelancers}?limit=8`, apiBaseUrl));
        const payload = (await res.json()) as { freelancers?: FreelancerRow[] };
        if (!cancelled && res.ok) {
          setRows(payload.freelancers || []);
        }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  const cards = useMemo(() => rows.slice(0, 8), [rows]);

  return (
    <section className="bg-zinc-50 px-4 py-14 sm:px-6" aria-labelledby="featured-heading">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="featured-heading" className="text-2xl font-bold tracking-tight text-brand-navy md:text-3xl">
              Freelancer nổi bật
            </h2>
            <p className="mt-2 max-w-xl text-zinc-600">Được đánh giá cao bởi khách hàng địa phương — cập nhật thường xuyên.</p>
          </div>
          <Link
            href="/tim-kiem?sort=rating"
            className={`text-sm font-semibold ${HOME_A11Y.linkOnLight} hover:underline-offset-4`}
          >
            Xem thêm
          </Link>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <li key={`skeleton-${i}`} className="animate-pulse rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
                  <div className="h-14 w-14 rounded-2xl bg-zinc-200" />
                  <div className="mt-4 h-4 w-2/3 rounded bg-zinc-200" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-zinc-100" />
                  <div className="mt-6 h-3 w-1/2 rounded bg-zinc-100" />
                </li>
              ))
            : cards.map((f, idx) => {
                const initials = String(f.full_name || "F")
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase();
                const accent = idx % 2 === 0 ? "green" : "navy";
                return (
            <li key={f.id}>
              <article className="group flex h-full flex-col rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-green/30 hover:shadow-lg hover:shadow-brand-navy/5">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white ${
                      accent === "green"
                        ? "bg-gradient-to-br from-brand-green to-emerald-700"
                        : "bg-gradient-to-br from-brand-navy to-sky-900"
                    }`}
                  >
                    {initials || "F"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-zinc-900">{f.full_name}</h3>
                    <p className="mt-0.5 text-sm leading-snug text-zinc-600">{f.title}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <IconStar className="h-4 w-4 shrink-0 text-amber-400" />
                  <span className="font-semibold text-zinc-900">{Number(f.rating_avg || 0).toFixed(1)}</span>
                  <span className="text-sm text-zinc-500">({f.total_reviews || 0} đánh giá)</span>
                </div>

                <div className="mt-auto pt-6">
                  <Link
                    href={`/freelancer/${f.id}`}
                    className={`flex w-full items-center justify-center rounded-full py-2.5 text-sm font-semibold ${HOME_A11Y.outlineButton} ${HOME_A11Y.focusRing}`}
                  >
                    Liên hệ nhanh
                  </Link>
                </div>
              </article>
            </li>
                );
              })}
        </ul>
      </div>
    </section>
  );
}
