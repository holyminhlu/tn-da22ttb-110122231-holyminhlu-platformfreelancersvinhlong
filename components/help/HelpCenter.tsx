"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FaSearch } from "react-icons/fa";
import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import {
  EMPLOYER_CATEGORIES,
  FREELANCER_CATEGORIES,
  type HelpCategoryItem,
  type HelpRole,
} from "./help-data";
import "./help.css";

type HelpCenterProps = {
  initialRole: HelpRole;
};

function filterCategories(
  items: (HelpCategoryItem | null)[],
  query: string,
): (HelpCategoryItem | null)[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.map((item) => {
    if (!item) return null;
    const hay = `${item.title} ${item.desc}`.toLowerCase();
    return hay.includes(q) ? item : null;
  });
}

export default function HelpCenter({ initialRole }: HelpCenterProps) {
  const [activeTab, setActiveTab] = useState<HelpRole>(initialRole);
  const [search, setSearch] = useState("");

  const categories = useMemo(() => {
    const source = activeTab === "employer" ? EMPLOYER_CATEGORIES : FREELANCER_CATEGORIES;
    return filterCategories(source, search);
  }, [activeTab, search]);

  const hasVisibleCategory = categories.some((c) => c !== null);

  return (
    <div className="home-landing help-page help-center flex min-h-screen flex-col text-gray-900">
      <HomeNavbar />
      <main id="main-content" className="flex-grow">
        <section className="help-center-hero" aria-labelledby="help-center-title">
          <h1 id="help-center-title" className="help-center-hero__title">
            Chúng tôi có thể giúp gì cho bạn?
          </h1>
          <form
            className="help-center-hero__search"
            onSubmit={(e) => e.preventDefault()}
            role="search"
          >
            <input
              type="search"
              className="help-center-hero__input"
              placeholder="Tôi muốn biết về..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm trong trung tâm trợ giúp"
            />
            <button type="submit" className="help-center-hero__search-btn" aria-label="Tìm kiếm">
              <FaSearch aria-hidden />
            </button>
          </form>
        </section>

        <section className="help-center-panel" aria-label="Danh mục trợ giúp">
          <div className="help-center-panel__tabs">
            <div className="help-center-panel__tab-list" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "employer"}
                className={`help-center-tab${activeTab === "employer" ? " help-center-tab--active" : ""}`}
                onClick={() => setActiveTab("employer")}
              >
                Nhà tuyển dụng
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "freelancer"}
                className={`help-center-tab${activeTab === "freelancer" ? " help-center-tab--active" : ""}`}
                onClick={() => setActiveTab("freelancer")}
              >
                Freelancer
              </button>
            </div>
            <Link href="/" className="help-center-panel__home-link">
              Về Vĩnh Long Connected &gt;
            </Link>
          </div>

          <div className="help-center-panel__body">
            <h2 className="help-center-panel__heading">Chọn danh mục</h2>
            <div className="help-center-panel__accent" aria-hidden />

            {!hasVisibleCategory ? (
              <p className="help-center-empty">Không tìm thấy danh mục phù hợp với từ khóa.</p>
            ) : (
              <div className="help-category-grid">
                {categories.map((cat, idx) => (
                  <div key={`${activeTab}-${idx}`} className="help-category-item">
                    {cat ? (
                      <>
                        <h3 className="help-category-item__title">{cat.title}</h3>
                        <p className="help-category-item__desc">{cat.desc}</p>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="help-center-cta">
            <div className="help-center-cta__block">
              <p className="help-center-cta__text">Muốn thuê chuyên gia hoàn thành việc?</p>
              <Link href="/jobs" className="help-center-cta__btn">
                Đăng tin việc ngay
              </Link>
            </div>
            <div className="help-center-cta__block">
              <p className="help-center-cta__text">Không tìm thấy thông tin bạn cần?</p>
              <Link href="/about" className="help-center-cta__btn">
                Liên hệ chúng tôi
              </Link>
            </div>
          </div>

          <p className="help-center-back">
            <Link href="/help" className="text-[#1b75bb] hover:underline">
              ← Chọn lại loại tài khoản
            </Link>
          </p>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
