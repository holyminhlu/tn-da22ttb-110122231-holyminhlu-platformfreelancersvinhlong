"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DISTRICT_OPTIONS } from "@/components/home/data";
import { IconSearch } from "@/components/home/icons";
import { HOME_A11Y } from "@/components/home/theme";

export default function Hero() {
  const [intent, setIntent] = useState<"hire" | "work">("hire");

  return (
    <section className="relative px-4 pb-6 pt-8 sm:px-6 sm:pt-12" aria-labelledby="hero-heading">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.6rem] bg-white p-4 shadow-xl ring-1 ring-zinc-200/80 sm:p-6">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Image
            src="/Media/hero.jpg"
            alt="Khung cảnh làm việc chuyên nghiệp"
            fill
            className="object-cover object-center opacity-100 blur-0 scale-[1.0]"           
          />
          <div className="absolute inset-0 bg-white/22" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl overflow-hidden rounded-[1.7rem] bg-white/20 shadow-2xl shadow-black/20 ring-1 ring-white/30 backdrop-blur-[2px]">
        <div className="relative px-5 py-10 sm:px-10 sm:py-14">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.2em] text-white/85 sm:text-left">
            Nền tảng kết nối địa phương
          </p>
          <h1
            id="hero-heading"
            className="mx-auto max-w-3xl text-center text-2xl font-bold leading-snug tracking-tight text-white sm:mx-0 sm:text-left sm:text-3xl md:text-4xl"
          >
            Tìm thợ giỏi, chuyên gia hay quanh khu vực Vĩnh Long
          </h1>
          <p className={`mx-auto mt-4 max-w-2xl text-center text-base ${HOME_A11Y.textOnDarkMuted} sm:mx-0 sm:text-left sm:text-lg`}>
            Kết nối nhanh — minh bạch đánh giá — phù hợp nhu cầu tại chỗ, đúng người đúng việc.
          </p>

          <div className="mx-auto mt-8 inline-flex w-fit gap-2 rounded-full bg-white/10 p-1 sm:mx-0">
            <button
              type="button"
              onClick={() => setIntent("hire")}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 sm:flex-none sm:px-6 ${
                intent === "hire"
                  ? "bg-white text-brand-navy shadow-md"
                  : "text-white hover:bg-white/20"
              }`}
            >
              Tôi muốn thuê
            </button>
            <button
              type="button"
              onClick={() => setIntent("work")}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 sm:flex-none sm:px-6 ${
                intent === "work"
                  ? "bg-white text-brand-navy shadow-md"
                  : "text-white hover:bg-white/20"
              }`}
            >
              Tôi muốn nhận việc
            </button>
          </div>

          <form
            className="mx-auto mt-8 max-w-3xl space-y-3 sm:mx-0"
            action="/tim-kiem"
            method="get"
            role="search"
          >
            <input type="hidden" name="intent" value={intent} />
            <div className="flex flex-col gap-3 rounded-full bg-white p-2 shadow-lg sm:flex-row sm:items-stretch sm:rounded-full sm:p-2">
              <label className="sr-only" htmlFor="hero-q">
                Từ khóa dịch vụ
              </label>
              <input
                id="hero-q"
                name="q"
                type="search"
                placeholder="Ví dụ: sửa điều hòa, gia sư lớp 12, quay TikTok shop..."
                className="min-h-12 flex-1 rounded-full border-0 bg-transparent px-4 text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-green/50 sm:min-h-14 sm:px-5"
                autoComplete="off"
              />
              <label className="sr-only" htmlFor="hero-area">
                Khu vực
              </label>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  id="hero-area"
                  name="area"
                  className="min-h-12 w-full cursor-pointer rounded-full border border-zinc-300 bg-zinc-50 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-green/50 sm:min-h-14 sm:w-52 sm:border-0 sm:bg-white/95"
                  defaultValue=""
                >
                  {DISTRICT_OPTIONS.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold ${HOME_A11Y.primaryButton} ${HOME_A11Y.focusRing} sm:min-h-14 sm:px-8`}
                >
                  <IconSearch className="h-5 w-5 text-amber-300" />
                  Tìm kiếm
                </button>
              </div>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-white/85 sm:text-left">
            {intent === "hire" ? (
              <>
                Gợi ý: chọn huyện để lọc thợ gần bạn nhất.{" "}
                <Link href="/tim-kiem" className={HOME_A11Y.linkOnDark}>
                  Xem tất cả dịch vụ
                </Link>
              </>
            ) : (
              <>
                Đăng ký hồ sơ freelancer để nhận việc phù hợp khu vực bạn chọn.{" "}
                <Link href="/tro-thanh-freelancer" className={HOME_A11Y.linkOnDark}>
                  Bắt đầu
                </Link>
              </>
            )}
          </p>
        </div>
        </div>
      </div>
    </section>
  );
}
