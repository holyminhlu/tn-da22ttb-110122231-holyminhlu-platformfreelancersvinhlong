"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useRef, useState } from "react";
import { FaBars, FaCaretDown } from "react-icons/fa";
import {
  JOBS_FILTER_OPTIONS,
  JOBS_SORT_OPTIONS,
  type JobsFilter,
  type JobsSort,
} from "./constants";

type JobsFilterPanelProps = {
  filter: JobsFilter;
  sort: JobsSort;
  onFilterApply: (filter: JobsFilter) => void;
  onSortChange: (sort: JobsSort) => void;
};

export default function JobsFilterPanel({
  filter,
  sort,
  onFilterApply,
  onSortChange,
}: JobsFilterPanelProps) {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<JobsFilter>(filter);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const filterLabel =
    JOBS_FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "Tất cả các công việc";
  const sortLabel = JOBS_SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Hoạt động gần đây";

  useEffect(() => {
    if (!open) setDraft(filter);
  }, [open, filter]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
  if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="jobs-controls">
        <div className="jobs-filter" ref={filterRef}>
          <button
            type="button"
            className="jobs-filter__trigger"
            onClick={() => {
              setOpen((v) => !v);
              setSortOpen(false);
            }}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <span className="jobs-filter__trigger-label">Lọc theo: {filterLabel}</span>
            <FaCaretDown className="jobs-filter__caret" aria-hidden />
          </button>

          {open ? (
            <div className="jobs-filter__panel" role="dialog" aria-label={t("Lọc công việc")}>
              <div className="jobs-filter__options">
                {JOBS_FILTER_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`jobs-filter__option${draft === opt.value ? " jobs-filter__option--active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="jobs-filter"
                      className="jobs-filter__radio"
                      checked={draft === opt.value}
                      onChange={() => setDraft(opt.value)}
                    />
                    <span>{t(opt.label)}</span>
                  </label>
                ))}
              </div>
              <div className="jobs-filter__footer">
                <button
                  type="button"
                  className="jobs-filter__apply"
                  onClick={() => {
                    onFilterApply(draft);
                    setOpen(false);
                  }}
                >
                  {t("Áp dụng")}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="jobs-sort-wrap" ref={sortRef}>
          <button
            type="button"
            className="jobs-sort"
            onClick={() => {
              setSortOpen((v) => !v);
              setOpen(false);
            }}
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
          >
            <span>{sortLabel}</span>
            <FaBars className="jobs-sort__icon" aria-hidden />
          </button>
          {sortOpen ? (
            <div className="jobs-sort__panel" role="listbox" aria-label={t("Sắp xếp")}>
              {JOBS_SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={sort === opt.value}
                  className={`jobs-sort__option${sort === opt.value ? " jobs-sort__option--active" : ""}`}
                  onClick={() => {
                    onSortChange(opt.value);
                    setSortOpen(false);
                  }}
                >
                  {t(opt.label)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
    </div>
  );
}
