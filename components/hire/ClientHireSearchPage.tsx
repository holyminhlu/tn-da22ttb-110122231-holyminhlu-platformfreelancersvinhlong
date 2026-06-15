"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaListUl,
  FaMapMarkerAlt,
  FaSearch,
} from "react-icons/fa";
import { listFreelancers, type FreelancerSearchRow } from "@/lib/api/freelancers";
import { useClientIdentityVerification } from "@/hooks/useClientIdentityVerification";
import {
  readFavoriteFreelancerIds,
  toggleFavoriteFreelancerId,
} from "@/lib/hire/favoriteFreelancersStorage";
import HireSearchFreelancerCard from "./HireSearchFreelancerCard";
import HireShell from "./HireShell";
import "./hire.css";

const PAGE_SIZE = 12;
const ALL = "Tất cả";

export default function ClientHireSearchPage() {
  const { verified: clientIdentityVerified, loading: clientIdentityLoading } =
    useClientIdentityVerification({ refreshOnVisible: false });
  const [rows, setRows] = useState<FreelancerSearchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [servicesTotal, setServicesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [skill, setSkill] = useState(ALL);
  const [district, setDistrict] = useState(ALL);
  const [category, setCategory] = useState(ALL);

  const [skillOptions, setSkillOptions] = useState<string[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const [skillOpen, setSkillOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const skillRef = useRef<HTMLDivElement>(null);
  const districtRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listFreelancers({
        q: searchQuery || undefined,
        skill: skill !== ALL ? skill : undefined,
        district: district !== ALL ? district : undefined,
        category: category !== ALL ? category : undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setRows(data.freelancers ?? []);
      setTotal(data.total ?? 0);
      setServicesTotal(data.servicesTotal ?? 0);
      if (data.filters) {
        setSkillOptions(data.filters.skills ?? []);
        setDistrictOptions(data.filters.districts ?? []);
        setCategoryOptions(data.filters.categories ?? []);
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải danh sách freelancer.";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, skill, district, category, offset]);

  useEffect(() => {
    setFavoriteIds(readFavoriteFreelancerIds());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!skillRef.current?.contains(target)) setSkillOpen(false);
      if (!districtRef.current?.contains(target)) setDistrictOpen(false);
      if (!categoryRef.current?.contains(target)) setCategoryOpen(false);
      if (!filtersRef.current?.contains(target)) setFiltersOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  const allSelectedOnPage = useMemo(
    () => rows.length > 0 && rows.every((r) => selectedIds.has(r.id)),
    [rows, selectedIds],
  );

  function applySearch() {
    setSearchQuery(searchInput.trim());
    setOffset(0);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      applySearch();
    }
  }

  function handleFilterChange(
    type: "skill" | "district" | "category",
    value: string,
  ) {
    if (type === "skill") {
      setSkill(value);
      setSkillOpen(false);
    } else if (type === "district") {
      setDistrict(value);
      setDistrictOpen(false);
    } else {
      setCategory(value);
      setCategoryOpen(false);
    }
    setOffset(0);
  }

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSelectAllOnPage(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const row of rows) {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      }
      return next;
    });
  }

  function handleToggleFavorite(id: string) {
    toggleFavoriteFreelancerId(id);
    setFavoriteIds(readFavoriteFreelancerIds());
  }

  return (
    <HireShell>
      <div className="hire-page hire-search hire-search--full-width">
        <header className="hire-search__intro">
          <div>
            <h1 className="hire-page__title">Tìm và thuê freelancer</h1>
            <p className="hire-search__summary">
              {loading
                ? "Đang tải..."
                : `Có ${total.toLocaleString("vi-VN")} freelancer cung cấp ${servicesTotal.toLocaleString("vi-VN")} dịch vụ trực tuyến.`}
            </p>
            <p className="hire-favorites__lead-sub">
              Thuê, nhắn tin hoặc yêu cầu báo giá từ freelancer bạn đã từng hợp tác hoặc đã lưu vào
              danh sách yêu thích.{" "}
              <Link href="/hire/favorites" className="hire-search__inline-link">
                Xem danh sách yêu thích
              </Link>
            </p>
          </div>
        </header>

        <div className="hire-search__toolbar">
          <div className="hire-search__toolbar-main">
            <div className="hire-search__search-wrap">
              <div className="hire-search__category-slot" ref={categoryRef}>
                <button
                  type="button"
                  className="hire-search__category-btn"
                  aria-expanded={categoryOpen}
                  onClick={() => setCategoryOpen((v) => !v)}
                >
                  <FaListUl aria-hidden />
                  <span className="hire-search__category-label">
                    {category === ALL ? "Tất cả danh mục" : category}
                  </span>
                  <FaChevronDown className="hire-search__chevron" aria-hidden />
                </button>
                {categoryOpen ? (
                  <div className="hire-page__filter-panel hire-search__dropdown" role="listbox">
                    <button
                      type="button"
                      className={`hire-page__filter-option${category === ALL ? " hire-page__filter-option--active" : ""}`}
                      onClick={() => handleFilterChange("category", ALL)}
                    >
                      Tất cả danh mục
                    </button>
                    {categoryOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`hire-page__filter-option${category === opt ? " hire-page__filter-option--active" : ""}`}
                        onClick={() => handleFilterChange("category", opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <input
                type="search"
                className="hire-search__search-input"
                placeholder="Tìm freelancer"
                value={searchInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchInput(value);
                  if (!value.trim()) {
                    setSearchQuery("");
                    setOffset(0);
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                aria-label="Tìm freelancer"
              />
              <button
                type="button"
                className="hire-search__search-btn"
                aria-label="Tìm kiếm"
                onClick={applySearch}
              >
                <FaSearch aria-hidden />
              </button>
            </div>

            <div className="hire-search__filter-row">
              <div className="hire-page__filter-wrap" ref={districtRef}>
                <button
                  type="button"
                  className="hire-search__filter-chip"
                  aria-expanded={districtOpen}
                  onClick={() => setDistrictOpen((v) => !v)}
                >
                  <FaMapMarkerAlt aria-hidden />
                  {district === ALL ? "Địa điểm" : district}
                  <FaChevronDown className="hire-search__chevron" aria-hidden />
                </button>
                {districtOpen ? (
                  <div className="hire-page__filter-panel hire-search__dropdown" role="listbox">
                    <button
                      type="button"
                      className={`hire-page__filter-option${district === ALL ? " hire-page__filter-option--active" : ""}`}
                      onClick={() => handleFilterChange("district", ALL)}
                    >
                      Tất cả địa điểm
                    </button>
                    {districtOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`hire-page__filter-option${district === opt ? " hire-page__filter-option--active" : ""}`}
                        onClick={() => handleFilterChange("district", opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="hire-search__filters-mobile" ref={filtersRef}>
                <button
                  type="button"
                  className="hire-search__filter-chip"
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((v) => !v)}
                >
                  <FaFilter aria-hidden />
                  Bộ lọc
                  <FaChevronDown className="hire-search__chevron" aria-hidden />
                </button>
                {filtersOpen ? (
                  <div className="hire-page__filter-panel hire-search__dropdown hire-search__dropdown--wide">
                    <p className="hire-search__dropdown-title">Kỹ năng</p>
                    <button
                      type="button"
                      className={`hire-page__filter-option${skill === ALL ? " hire-page__filter-option--active" : ""}`}
                      onClick={() => handleFilterChange("skill", ALL)}
                    >
                      Tất cả kỹ năng
                    </button>
                    {skillOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`hire-page__filter-option${skill === opt ? " hire-page__filter-option--active" : ""}`}
                        onClick={() => handleFilterChange("skill", opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="hire-page__filter-wrap hire-search__skill-desktop" ref={skillRef}>
                <button
                  type="button"
                  className="hire-search__filter-chip"
                  aria-expanded={skillOpen}
                  onClick={() => setSkillOpen((v) => !v)}
                >
                  <FaFilter aria-hidden />
                  {skill === ALL ? "Kỹ năng" : skill}
                  <FaChevronDown className="hire-search__chevron" aria-hidden />
                </button>
                {skillOpen ? (
                  <div className="hire-page__filter-panel hire-search__dropdown" role="listbox">
                    <button
                      type="button"
                      className={`hire-page__filter-option${skill === ALL ? " hire-page__filter-option--active" : ""}`}
                      onClick={() => handleFilterChange("skill", ALL)}
                    >
                      Tất cả kỹ năng
                    </button>
                    {skillOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`hire-page__filter-option${skill === opt ? " hire-page__filter-option--active" : ""}`}
                        onClick={() => handleFilterChange("skill", opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="hire-search__results-bar">
          <label className="hire-search__select-all">
            <input
              type="checkbox"
              checked={allSelectedOnPage}
              onChange={(e) => handleSelectAllOnPage(e.target.checked)}
            />
            <span>
              {total.toLocaleString("vi-VN")} kết quả
              {selectedIds.size > 0 ? ` · ${selectedIds.size} đã chọn` : ""}
            </span>
          </label>
          <p className="hire-search__sort">
            Sắp xếp: <strong>Phù hợp nhất</strong>
          </p>
        </div>

        {loading ? (
          <p className="hire-page__state">Đang tải freelancer...</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : rows.length === 0 ? (
          <div className="hire-page__empty">
            <p className="hire-page__empty-text">Không tìm thấy freelancer phù hợp.</p>
            <p className="hire-favorites__lead-sub">
              Thử đổi từ khóa hoặc bộ lọc. Nếu thiếu cột địa điểm, chạy{" "}
              <code>backend/sql/freelancer_search_listing.sql</code> trên PostgreSQL.
            </p>
          </div>
        ) : (
          <>
            <div className="hire-search__list">
              {rows.map((row) => (
                <HireSearchFreelancerCard
                  key={row.id}
                  row={row}
                  selected={selectedIds.has(row.id)}
                  onSelect={handleSelect}
                  isFavorite={favoriteIds.includes(row.id)}
                  onToggleFavorite={handleToggleFavorite}
                  clientIdentityVerified={clientIdentityVerified}
                  clientIdentityLoading={clientIdentityLoading}
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <nav className="hire-search__pagination" aria-label="Phân trang">
                <button
                  type="button"
                  className="hire-search__page-btn"
                  disabled={!canPrev}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  <FaChevronLeft aria-hidden />
                  Trước
                </button>
                <span className="hire-search__page-label">
                  Trang {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className="hire-search__page-btn"
                  disabled={!canNext}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  Sau
                  <FaChevronRight aria-hidden />
                </button>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </HireShell>
  );
}
