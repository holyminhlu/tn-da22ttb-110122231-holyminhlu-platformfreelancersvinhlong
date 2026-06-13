"use client";

import { FaSearch } from "./icons";

export default function HeroSearchBar() {
  return (
    <div className="hero-search-bar mb-4 max-w-xl">
      <div className="hero-search-bar__card">
        <div className="hero-search-bar__search-row">
          <label htmlFor="hero-skill-search" className="sr-only">
            Bạn đang tìm kỹ năng gì?
          </label>
          <div className="hero-search-bar__input-wrap">
            <FaSearch className="hero-search-bar__input-icon" aria-hidden />
            <input
              id="hero-skill-search"
              type="search"
              placeholder="Bạn đang tìm kỹ năng gì?"
              className="hero-search-bar__input"
              autoComplete="off"
            />
          </div>
          <button type="button" className="hero-search-bar__search-btn">
            Tìm kiếm
          </button>
        </div>

        <div className="hero-search-bar__divider" aria-hidden>
          <span className="hero-search-bar__or">Hoặc</span>
        </div>

        <button type="button" className="hero-search-bar__cta">
          <span>Đăng việc</span>
          <span className="hero-search-bar__cta-badge">Miễn phí</span>
        </button>
      </div>
    </div>
  );
}
