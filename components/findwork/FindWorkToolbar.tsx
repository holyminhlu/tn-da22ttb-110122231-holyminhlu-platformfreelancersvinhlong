"use client";

import { useId, useRef, useState } from "react";
import {
  FaChevronDown,
  FaMapMarkerAlt,
  FaSearch,
  FaSlidersH,
  FaTimes,
} from "react-icons/fa";
import type { JobSort } from "@/lib/api/jobs";
import {
  CLIENT_CRITERIA_OPTIONS,
  DEFAULT_JOB_CATEGORIES,
  JOB_SORT_OPTIONS,
  type ClientCriteria,
} from "./constants";
import FindWorkFiltersPanel from "./FindWorkFiltersPanel";
import { useClickOutside } from "./useClickOutside";

export type FindWorkQueryState = {
  q: string;
  category: string | null;
  location: string;
  clientCriteria: ClientCriteria;
  budgetMin: string;
  budgetMax: string;
  hasDue: boolean;
  sort: JobSort;
};

type CategoryOption = { name: string; jobCount?: number };

type FindWorkToolbarProps = {
  query: FindWorkQueryState;
  searchInput: string;
  categories: CategoryOption[];
  filtersOpen: boolean;
  activeFilterCount: number;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: () => void;
  onQueryChange: (patch: Partial<FindWorkQueryState>) => void;
  onFiltersOpenChange: (open: boolean) => void;
  onClearFilters: () => void;
};

function mergeCategoryOptions(apiCategories: CategoryOption[]): CategoryOption[] {
  const map = new Map<string, CategoryOption>();
  for (const name of DEFAULT_JOB_CATEGORIES) {
    map.set(name, { name });
  }
  for (const row of apiCategories) {
    const name = row.name?.trim();
    if (!name) continue;
    map.set(name, { name, jobCount: row.jobCount });
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export default function FindWorkToolbar({
  query,
  searchInput,
  categories,
  filtersOpen,
  activeFilterCount,
  onSearchInputChange,
  onSearchSubmit,
  onQueryChange,
  onFiltersOpenChange,
  onClearFilters,
}: FindWorkToolbarProps) {
  const categoryMenuId = useId();
  const criteriaMenuId = useId();
  const sortMenuId = useId();

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const categoryRef = useRef<HTMLDivElement>(null);
  const criteriaRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useClickOutside(categoryRef, () => setCategoryOpen(false), categoryOpen);
  useClickOutside(criteriaRef, () => setCriteriaOpen(false), criteriaOpen);
  useClickOutside(sortRef, () => setSortOpen(false), sortOpen);

  const categoryOptions = mergeCategoryOptions(categories);
  const categoryLabel = query.category ?? "Bất kỳ danh mục nào";
  const criteriaLabel =
    query.clientCriteria === "all"
      ? "Chỉ tiêu nhà tuyển dụng"
      : (CLIENT_CRITERIA_OPTIONS.find((o) => o.value === query.clientCriteria)?.label ??
        "Chỉ tiêu nhà tuyển dụng");
  const sortLabel =
    JOB_SORT_OPTIONS.find((o) => o.value === query.sort)?.label ?? "Mới nhất";

  function selectCategory(name: string | null) {
    onQueryChange({ category: name });
    setCategoryOpen(false);
  }

  function selectCriteria(value: ClientCriteria) {
    onQueryChange({ clientCriteria: value });
    setCriteriaOpen(false);
  }

  function selectSort(value: JobSort) {
    onQueryChange({ sort: value });
    setSortOpen(false);
  }

  return (
    <div className="fw-toolbar mb-6">
      <div className="fw-toolbar__row">
        <div className="fw-toolbar__search">
          <div className="fw-dropdown" ref={categoryRef}>
            <button
              type="button"
              className="fw-dropdown__trigger"
              aria-expanded={categoryOpen}
              aria-haspopup="listbox"
              aria-controls={categoryMenuId}
              onClick={() => setCategoryOpen((v) => !v)}
            >
              <span className="fw-dropdown__trigger-label">{categoryLabel}</span>
              <FaChevronDown className="fw-dropdown__chevron" aria-hidden />
            </button>
            {categoryOpen ? (
              <ul
                id={categoryMenuId}
                className="fw-dropdown__menu"
                role="listbox"
                aria-label="Danh mục việc làm"
              >
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={!query.category}
                    className={`fw-dropdown__item${!query.category ? " fw-dropdown__item--active" : ""}`}
                    onClick={() => selectCategory(null)}
                  >
                    Bất kỳ danh mục nào
                  </button>
                </li>
                {categoryOptions.map((opt) => (
                  <li key={opt.name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={query.category === opt.name}
                      className={`fw-dropdown__item${query.category === opt.name ? " fw-dropdown__item--active" : ""}`}
                      onClick={() => selectCategory(opt.name)}
                    >
                      <span>{opt.name}</span>
                      {opt.jobCount != null && opt.jobCount > 0 ? (
                        <span className="fw-dropdown__count">{opt.jobCount}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <form
            className="fw-toolbar__search-field"
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
          >
            <input
              type="search"
              placeholder="Tìm kiếm việc làm tự do"
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              className="fw-toolbar__input"
              aria-label="Tìm kiếm việc làm"
            />
            <button type="submit" className="fw-toolbar__search-btn" aria-label="Tìm kiếm">
              <FaSearch aria-hidden />
            </button>
          </form>
        </div>

        <div className="fw-toolbar__actions">
          <div className="fw-dropdown" ref={criteriaRef}>
            <button
              type="button"
              className="fw-toolbar__action-btn"
              aria-expanded={criteriaOpen}
              aria-haspopup="listbox"
              aria-controls={criteriaMenuId}
              onClick={() => setCriteriaOpen((v) => !v)}
            >
              <FaMapMarkerAlt className="mr-2 text-gray-400" aria-hidden />
              <span className="fw-toolbar__action-label">{criteriaLabel}</span>
              <FaChevronDown className="ml-2 text-xs opacity-60" aria-hidden />
            </button>
            {criteriaOpen ? (
              <ul
                id={criteriaMenuId}
                className="fw-dropdown__menu fw-dropdown__menu--right"
                role="listbox"
                aria-label="Chỉ tiêu nhà tuyển dụng"
              >
                {CLIENT_CRITERIA_OPTIONS.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={query.clientCriteria === opt.value}
                      className={`fw-dropdown__item${query.clientCriteria === opt.value ? " fw-dropdown__item--active" : ""}`}
                      onClick={() => selectCriteria(opt.value)}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <button
            type="button"
            className={`fw-toolbar__action-btn${filtersOpen ? " fw-toolbar__action-btn--active" : ""}`}
            aria-expanded={filtersOpen}
            onClick={() => onFiltersOpenChange(!filtersOpen)}
          >
            <FaSlidersH className="mr-2 text-gray-400" aria-hidden />
            Bộ lọc
            {activeFilterCount > 0 ? (
              <span className="fw-toolbar__badge">{activeFilterCount}</span>
            ) : null}
            <FaChevronDown className="ml-2 text-xs opacity-60" aria-hidden />
          </button>
        </div>
      </div>

      {filtersOpen ? (
        <FindWorkFiltersPanel
          query={query}
          onQueryChange={onQueryChange}
          onClear={onClearFilters}
        />
      ) : null}

      <div className="fw-toolbar__meta">
        <div className="fw-dropdown fw-dropdown--inline" ref={sortRef}>
          <span className="text-sm text-gray-500">Sắp xếp theo: </span>
          <button
            type="button"
            className="fw-sort-trigger"
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
            aria-controls={sortMenuId}
            onClick={() => setSortOpen((v) => !v)}
          >
            {sortLabel}
            <FaChevronDown className="ml-1 text-xs" aria-hidden />
          </button>
          {sortOpen ? (
            <ul
              id={sortMenuId}
              className="fw-dropdown__menu fw-dropdown__menu--sort"
              role="listbox"
              aria-label="Sắp xếp"
            >
              {JOB_SORT_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={query.sort === opt.value}
                    className={`fw-dropdown__item${query.sort === opt.value ? " fw-dropdown__item--active" : ""}`}
                    onClick={() => selectSort(opt.value)}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function FindWorkActiveChips({
  query,
  onQueryChange,
  onClearAll,
}: {
  query: FindWorkQueryState;
  onQueryChange: (patch: Partial<FindWorkQueryState>) => void;
  onClearAll: () => void;
}) {
  const chips: { key: string; label: string; clear: () => void }[] = [];

  if (query.category) {
    chips.push({
      key: "category",
      label: query.category,
      clear: () => onQueryChange({ category: null }),
    });
  }
  if (query.q) {
    chips.push({
      key: "q",
      label: `“${query.q}”`,
      clear: () => onQueryChange({ q: "" }),
    });
  }
  if (query.location.trim()) {
    chips.push({
      key: "location",
      label: `Địa điểm: ${query.location.trim()}`,
      clear: () => onQueryChange({ location: "" }),
    });
  }
  if (query.clientCriteria === "verified") {
    chips.push({
      key: "verified",
      label: "Email xác minh",
      clear: () => onQueryChange({ clientCriteria: "all" }),
    });
  }
  if (query.clientCriteria === "with_location") {
    chips.push({
      key: "has_loc",
      label: "Có địa điểm",
      clear: () => onQueryChange({ clientCriteria: "all" }),
    });
  }
  if (query.budgetMin.trim()) {
    chips.push({
      key: "bmin",
      label: `Từ ${query.budgetMin} ₫`,
      clear: () => onQueryChange({ budgetMin: "" }),
    });
  }
  if (query.budgetMax.trim()) {
    chips.push({
      key: "bmax",
      label: `Đến ${query.budgetMax} ₫`,
      clear: () => onQueryChange({ budgetMax: "" }),
    });
  }
  if (query.hasDue) {
    chips.push({
      key: "due",
      label: "Có hạn nộp",
      clear: () => onQueryChange({ hasDue: false }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="fw-chips mb-4">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="fw-chip"
          onClick={chip.clear}
          aria-label={`Bỏ lọc ${chip.label}`}
        >
          {chip.label}
          <FaTimes className="fw-chip__x" aria-hidden />
        </button>
      ))}
      <button type="button" className="fw-chip fw-chip--clear" onClick={onClearAll}>
        Xóa tất cả
      </button>
    </div>
  );
}
