"use client";

import { FaSearch, FaTimes } from "react-icons/fa";

type JobsSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export default function JobsSearchBar({ value, onChange, onSubmit }: JobsSearchBarProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form className="jobs-search" onSubmit={handleSubmit}>
      <input
        type="search"
        className="jobs-search__input"
        placeholder="Nhập chức danh hoặc mã số công việc"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Tìm trong việc làm của bạn"
      />
      {value ? (
        <button
          type="button"
          className="jobs-search__clear"
          onClick={() => onChange("")}
          aria-label="Xóa từ khóa"
        >
          <FaTimes aria-hidden />
        </button>
      ) : null}
      <button type="submit" className="jobs-search__btn" aria-label="Tìm kiếm">
        <FaSearch aria-hidden />
      </button>
    </form>
  );
}
