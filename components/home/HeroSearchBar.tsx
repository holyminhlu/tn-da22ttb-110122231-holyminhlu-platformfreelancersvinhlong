"use client";

import { FaSearch } from "./icons";

export default function HeroSearchBar() {
  return (
    <div className="hero-search-bar mb-4 max-w-xl">
      <div className="hero-search-bar__card">
        <div className="hero-search-bar__search-row">
          <label htmlFor="hero-skill-search" className="sr-only">
            What skill are you looking for?
          </label>
          <div className="hero-search-bar__input-wrap">
            <FaSearch className="hero-search-bar__input-icon" aria-hidden />
            <input
              id="hero-skill-search"
              type="search"
              placeholder="What skill are you looking for?"
              className="hero-search-bar__input"
              autoComplete="off"
            />
          </div>
          <button type="button" className="hero-search-bar__search-btn">
            Search
          </button>
        </div>

        <div className="hero-search-bar__divider" aria-hidden>
          <span className="hero-search-bar__or">Or</span>
        </div>

        <button type="button" className="hero-search-bar__cta">
          <span>Post a Job</span>
          <span className="hero-search-bar__cta-badge">It&apos;s Free</span>
        </button>
      </div>
    </div>
  );
}
