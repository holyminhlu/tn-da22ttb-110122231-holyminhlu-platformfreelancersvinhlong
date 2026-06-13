"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaHeart, FaSearch } from "react-icons/fa";
import { getMyWork } from "@/lib/api/contracts";
import { getFreelancer } from "@/lib/api/freelancers";
import {
  readFavoriteFreelancerIds,
  toggleFavoriteFreelancerId,
} from "@/lib/hire/favoriteFreelancersStorage";
import {
  applyFreelancerProfile,
  entriesFromWorkedJobs,
  filterFavoriteEntries,
  mergeFavoriteIds,
} from "./clientHireFavorites";
import FreelancerChatWidget from "@/components/chat/FreelancerChatWidget";
import HireFavoriteCard from "./HireFavoriteCard";
import type { HireFavoriteEntry, HireFavoriteSource } from "./hireFavoritesTypes";
import HireShell from "./HireShell";
import "./hire.css";

type TabFilter = "all" | "worked" | "favorites";

const TABS: { value: TabFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "worked", label: "Đã làm việc cùng" },
  { value: "favorites", label: "My Favorites" },
];

export default function ClientHireFavoritesPage() {
  const [entries, setEntries] = useState<HireFavoriteEntry[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");
  const [chatEntry, setChatEntry] = useState<HireFavoriteEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const storedFavorites = readFavoriteFreelancerIds();
      setFavoriteIds(storedFavorites);

      const data = await getMyWork();
      if (data.role !== "client") {
        setError("Trang này dành cho tài khoản client.");
        setEntries([]);
        return;
      }

      const worked = entriesFromWorkedJobs(data.jobs ?? []);
      let merged = mergeFavoriteIds(worked, storedFavorites);

      const profileIds = merged
        .filter((e) => e.sources.includes("favorite") || e.title == null)
        .map((e) => e.id)
        .slice(0, 24);

      const profiles = await Promise.allSettled(
        profileIds.map((id) => getFreelancer(id)),
      );

      profiles.forEach((result, index) => {
        if (result.status !== "fulfilled") return;
        const id = profileIds[index];
        const idx = merged.findIndex((e) => e.id === id);
        if (idx >= 0) {
          merged[idx] = applyFreelancerProfile(merged[idx], result.value.freelancer);
        }
      });

      setEntries(merged);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải danh sách freelancer.";
      setError(message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => filterFavoriteEntries(entries, tab, searchQuery),
    [entries, tab, searchQuery],
  );

  const counts = useMemo(
    () => ({
      all: entries.length,
      worked: entries.filter((e) => e.sources.includes("worked")).length,
      favorites: entries.filter((e) => e.sources.includes("favorite")).length,
    }),
    [entries],
  );

  function applySearch() {
    setSearchQuery(searchInput.trim());
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      applySearch();
    }
  }

  function handleToggleFavorite(id: string) {
    const nowFavorite = toggleFavoriteFreelancerId(id);
    const nextIds = readFavoriteFreelancerIds();
    setFavoriteIds(nextIds);

    setEntries((prev) => {
      const existing = prev.find((e) => e.id === id);
      if (nowFavorite) {
        if (existing) {
          return prev.map((e) =>
            e.id === id && !e.sources.includes("favorite")
              ? { ...e, sources: [...e.sources, "favorite" as HireFavoriteSource] }
              : e,
          );
        }
        return [
          ...prev,
          {
            id,
            name: "Freelancer",
            email: null,
            title: null,
            avatarUrl: null,
            districtCity: null,
            hourlyRate: null,
            ratingAvg: null,
            totalReviews: null,
            skills: [],
            lastJobTitle: null,
            lastWorkedAt: null,
            featuredServiceId: null,
            sources: ["favorite"],
          },
        ];
      }

      if (!existing) return prev;

      const nextSources = existing.sources.filter((s) => s !== "favorite");
      if (nextSources.length === 0) {
        return prev.filter((e) => e.id !== id);
      }
      return prev.map((e) => (e.id === id ? { ...e, sources: nextSources } : e));
    });

    if (nowFavorite) {
      void getFreelancer(id)
        .then((payload) => {
          setEntries((prev) =>
            prev.map((e) => (e.id === id ? applyFreelancerProfile(e, payload.freelancer) : e)),
          );
        })
        .catch(() => undefined);
    }
  }

  const isEmpty = !loading && !error && entries.length === 0;
  const noMatches = !loading && !error && entries.length > 0 && filtered.length === 0;

  return (
    <HireShell>
      <div className="hire-page hire-favorites hire-favorites--full-width">
        <header className="hire-page__head">
          <div>
            <h1 className="hire-page__title">Favorite Freelancers</h1>
            <p className="hire-page__lead hire-favorites__lead">
              Hire, message, or request quotes from Freelancers you have worked with or added to My
              Favorites.
            </p>
            <p className="hire-favorites__lead-sub">
              Thuê, nhắn tin hoặc yêu cầu báo giá từ freelancer bạn đã từng hợp tác hoặc đã lưu vào
              danh sách yêu thích.
            </p>
          </div>
          <Link href="/hire/search" className="hire-page__post-btn">
            Tìm freelancer
          </Link>
        </header>

        <div className="hire-favorites__toolbar">
          <div className="hire-page__search-group hire-favorites__search">
            <input
              type="search"
              className="hire-page__search-input"
              placeholder="Tìm theo tên, kỹ năng, công việc..."
              value={searchInput}
              onChange={(e) => {
                const value = e.target.value;
                setSearchInput(value);
                if (!value.trim()) setSearchQuery("");
              }}
              onKeyDown={handleSearchKeyDown}
              aria-label="Tìm freelancer"
            />
            <button
              type="button"
              className="hire-page__search-btn"
              aria-label="Tìm kiếm"
              onClick={applySearch}
            >
              <FaSearch aria-hidden />
            </button>
          </div>

          <div className="hire-favorites__tabs" role="tablist" aria-label="Lọc freelancer">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={tab === item.value}
                className={`hire-favorites__tab${tab === item.value ? " hire-favorites__tab--active" : ""}`}
                onClick={() => setTab(item.value)}
              >
                {item.label}
                <span className="hire-favorites__tab-count">{counts[item.value]}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="hire-page__state">Đang tải...</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : isEmpty ? (
          <div className="hire-favorites__empty">
            <div className="hire-favorites__empty-icon" aria-hidden>
              <FaHeart />
            </div>
            <h2 className="hire-favorites__empty-title">Chưa có freelancer yêu thích</h2>
            <p className="hire-favorites__empty-text">
              Khi bạn hoàn thành hợp đồng với freelancer hoặc thêm họ vào My Favorites, họ sẽ hiện
              ở đây để bạn thuê lại, nhắn tin hoặc gửi yêu cầu báo giá.
            </p>
            <div className="hire-favorites__empty-actions">
              <Link href="/hire/search" className="hire-page__post-btn">
                Tìm freelancer
              </Link>
              <Link href="/freelancers" className="hire-favorites__empty-link">
                Duyệt danh sách freelancer
              </Link>
            </div>
          </div>
        ) : noMatches ? (
          <div className="hire-page__empty">
            <p className="hire-page__empty-text">Không tìm thấy freelancer phù hợp.</p>
          </div>
        ) : (
          <ul className="hire-favorites__list">
            {filtered.map((entry) => (
              <li key={entry.id}>
                <HireFavoriteCard
                  entry={entry}
                  isFavorite={favoriteIds.includes(entry.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onMessage={setChatEntry}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {chatEntry ? (
        <FreelancerChatWidget
          key={chatEntry.id}
          freelancerId={chatEntry.id}
          freelancerName={chatEntry.name?.trim() || "Freelancer"}
          serviceId={chatEntry.featuredServiceId}
          contextTitle={chatEntry.title}
          initialOpen
          onClose={() => setChatEntry(null)}
        />
      ) : null}
    </HireShell>
  );
}
