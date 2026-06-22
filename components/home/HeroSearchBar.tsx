"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function HeroSearchBar() {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/freelancers?q=${encodeURIComponent(trimmed)}`);
      return;
    }
    router.push("/freelancers");
  }

  return (
    <form
      className="hero-search-bar hero-search-bar--white mx-auto mb-4 w-full max-w-2xl"
      onSubmit={handleSubmit}
      role="search"
    >
      <div className="hero-search-bar__field">
        <button type="submit" className="hero-search-bar__icon-btn" aria-label={t("homePage.searchAria")}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hero-search-bar__icon"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <label htmlFor="hero-skill-search" className="sr-only">
          {t("homePage.searchLabel")}
        </label>
        <input
          id="hero-skill-search"
          type="search"
          className="hero-search-bar__input"
          placeholder={t("homePage.searchPlaceholder")}
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
    </form>
  );
}
