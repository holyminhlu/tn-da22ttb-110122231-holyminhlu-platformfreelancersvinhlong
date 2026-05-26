"use client";

import type { FindWorkQueryState } from "./FindWorkToolbar";

type FindWorkFiltersPanelProps = {
  query: FindWorkQueryState;
  onQueryChange: (patch: Partial<FindWorkQueryState>) => void;
  onClear: () => void;
};

export default function FindWorkFiltersPanel({
  query,
  onQueryChange,
  onClear,
}: FindWorkFiltersPanelProps) {
  return (
    <div className="fw-filters-panel" role="region" aria-label="Bộ lọc nâng cao">
      <div className="fw-filters-panel__grid">
        <label className="fw-filters-panel__field">
          <span className="fw-filters-panel__label">Địa điểm</span>
          <input
            type="text"
            placeholder="Vĩnh Long, quận/huyện..."
            value={query.location}
            onChange={(e) => onQueryChange({ location: e.target.value })}
            className="fw-filters-panel__input"
          />
        </label>

        <label className="fw-filters-panel__field">
          <span className="fw-filters-panel__label">Ngân sách tối thiểu (VND)</span>
          <input
            type="number"
            min={0}
            step={100000}
            placeholder="VD: 1000000"
            value={query.budgetMin}
            onChange={(e) => onQueryChange({ budgetMin: e.target.value })}
            className="fw-filters-panel__input"
          />
        </label>

        <label className="fw-filters-panel__field">
          <span className="fw-filters-panel__label">Ngân sách tối đa (VND)</span>
          <input
            type="number"
            min={0}
            step={100000}
            placeholder="VD: 50000000"
            value={query.budgetMax}
            onChange={(e) => onQueryChange({ budgetMax: e.target.value })}
            className="fw-filters-panel__input"
          />
        </label>

        <div className="fw-filters-panel__checks">
          <label className="fw-filters-panel__check">
            <input
              type="checkbox"
              checked={query.hasDue}
              onChange={(e) => onQueryChange({ hasDue: e.target.checked })}
            />
            <span>Chỉ việc có hạn nộp đơn</span>
          </label>
        </div>
      </div>

      <div className="fw-filters-panel__footer">
        <button type="button" className="fw-filters-panel__clear" onClick={onClear}>
          Đặt lại bộ lọc
        </button>
      </div>
    </div>
  );
}
