"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import HelpFaqAccordion from "./HelpFaqAccordion";
import {
  getCategoriesForRole,
  getCategoryById,
  searchHelpFaqs,
  type HelpRole,
} from "./help-data";
import "./help.css";

type HelpCenterProps = {
  initialRole: HelpRole;
};

const ROLE_LABEL_KEY: Record<HelpRole, string> = {
  employer: "helpPage.roleClient",
  freelancer: "helpPage.roleFreelancer",
};

const ROLE_PATH: Record<HelpRole, string> = {
  employer: "/help/employer",
  freelancer: "/help/freelancer",
};

export default function HelpCenter({ initialRole }: HelpCenterProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryFromUrl = searchParams.get("category") || "";
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(categoryFromUrl);

  useEffect(() => {
    setActiveCategoryId(categoryFromUrl);
  }, [categoryFromUrl]);

  const categories = useMemo(() => getCategoriesForRole(initialRole), [initialRole]);
  const activeCategory = activeCategoryId ? getCategoryById(initialRole, activeCategoryId) : undefined;

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return searchHelpFaqs(initialRole, search);
  }, [initialRole, search]);

  const isSearchMode = search.trim().length > 0;
  const roleLabel = t(ROLE_LABEL_KEY[initialRole]);
  const rolePath = ROLE_PATH[initialRole];

  function openCategory(categoryId: string) {
    setSearch("");
    router.push(`${rolePath}?category=${encodeURIComponent(categoryId)}`, { scroll: false });
  }

  function backToCategories() {
    setSearch("");
    router.push(rolePath, { scroll: false });
  }

  return (
    <div className="home-landing help-page help-center flex min-h-screen flex-col text-gray-900">
      <HomeNavbar />
      <main id="main-content" className="flex-grow">
        <section className="help-center-hero" aria-labelledby="help-center-title">
          <h1 id="help-center-title" className="help-center-hero__title">
            {t("helpPage.centerTitle")} — {roleLabel}
          </h1>
          <form
            className="help-center-hero__search"
            onSubmit={(e) => e.preventDefault()}
            role="search"
          >
            <input
              type="search"
              className="help-center-hero__input"
              placeholder={t("helpPage.searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value.trim()) {
                  router.push(rolePath, { scroll: false });
                }
              }}
              aria-label={t("helpPage.searchAria")}
            />
            <button type="submit" className="help-center-hero__search-btn" aria-label={t("helpPage.searchBtn")}>
              <FaSearch aria-hidden />
            </button>
          </form>
        </section>

        <section className="help-center-panel" aria-label={t("helpPage.faqAria")}>
          <div className="help-center-panel__tabs">
            <div className="help-center-panel__breadcrumb">
              <Link href="/help" className="help-center-panel__crumb">
                {t("helpPage.breadcrumbHelp")}
              </Link>
              <span aria-hidden> / </span>
              <span>{roleLabel}</span>
              {activeCategory && !isSearchMode ? (
                <>
                  <span aria-hidden> / </span>
                  <span>{t(activeCategory.title)}</span>
                </>
              ) : null}
            </div>
            <Link href="/how-vlc-works" className="help-center-panel__home-link">
              {t("helpPage.howVlcWorks")}
            </Link>
          </div>

          <div className="help-center-panel__body">
            {isSearchMode ? (
              <>
                <h2 className="help-center-panel__heading">
                  {t("helpPage.searchResults")} ({searchResults.length})
                </h2>
                <div className="help-center-panel__accent" aria-hidden />
                {searchResults.length === 0 ? (
                  <p className="help-center-empty">{t("helpPage.searchEmpty")}</p>
                ) : (
                  <div className="help-faq-list">
                    {searchResults.map(({ category, item }) => (
                      <HelpFaqAccordion
                        key={`${category.id}-${item.id}`}
                        item={item}
                        categoryLabel={category.title}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : activeCategory ? (
              <>
                <button type="button" className="help-faq-back" onClick={backToCategories}>
                  <FaArrowLeft aria-hidden />
                  {t("helpPage.allCategories")}
                </button>
                <h2 className="help-center-panel__heading">{t(activeCategory.title)}</h2>
                <p className="help-category-detail__desc">{t(activeCategory.desc)}</p>
                <div className="help-center-panel__accent" aria-hidden />
                <div className="help-faq-list">
                  {activeCategory.items.map((item, idx) => (
                    <HelpFaqAccordion key={item.id} item={item} defaultOpen={idx === 0} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="help-center-panel__heading">{t("helpPage.chooseCategory")}</h2>
                <div className="help-center-panel__accent" aria-hidden />
                <div className="help-category-grid">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className="help-category-item help-category-item--btn"
                      onClick={() => openCategory(cat.id)}
                    >
                      <h3 className="help-category-item__title">{t(cat.title)}</h3>
                      <p className="help-category-item__desc">{t(cat.desc)}</p>
                      <span className="help-category-item__count">
                        {cat.items.length} {t("helpPage.questionCount")}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="help-center-cta">
            <div className="help-center-cta__block">
              <p className="help-center-cta__text">
                {initialRole === "employer"
                  ? t("helpPage.hireCta")
                  : t("helpPage.findJobCta")}
              </p>
              <Link
                href={initialRole === "employer" ? "/hire/post" : "/findwork"}
                className="help-center-cta__btn"
              >
                {initialRole === "employer" ? t("helpPage.postJob") : t("helpPage.quickFindJobBtn")}
              </Link>
            </div>
            <div className="help-center-cta__block">
              <p className="help-center-cta__text">{t("helpPage.contactCta")}</p>
              <Link href="/lien-he" className="help-center-cta__btn">
                {t("helpPage.contactBtn")}
              </Link>
            </div>
          </div>

          <p className="help-center-back">
            <Link href="/help" className="text-[#1b75bb] hover:underline">
              {t("helpPage.rechooseRole")}
            </Link>
          </p>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
