"use client";

import { useState } from "react";
import type { SkillInput, UserSkill } from "@/lib/api/users";
import { updateSkills } from "@/lib/api/users";

type AddSkillDialogProps = {
  existing: UserSkill[];
  onClose: () => void;
  onSaved: () => void;
};

const LEVEL_OPTIONS = ["Junior", "Mid-level", "Senior", "Expert"];

export default function AddSkillDialog({ existing, onClose, onSaved }: AddSkillDialogProps) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [years, setYears] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Tên kỹ năng là bắt buộc.");
      return;
    }
    const yearsNum = years.trim() ? Number(years) : 0;
    const next: SkillInput[] = [
      ...existing.map((s) => ({
        name: s.name,
        level: s.level || undefined,
        yearsOfExperience: s.years_of_experience ?? 0,
      })),
      {
        name: trimmed,
        level: level.trim() || undefined,
        yearsOfExperience: Number.isFinite(yearsNum) ? yearsNum : 0,
      },
    ];
    setSaving(true);
    setError("");
    try {
      await updateSkills(next);
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể lưu kỹ năng.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mp-dialog-backdrop" role="presentation" onClick={() => !saving && onClose()}>
      <form
        className="mp-dialog"
        role="dialog"
        aria-labelledby="add-skill-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="mp-dialog__head">
          <div>
            <h3 id="add-skill-title" className="mp-dialog__title">
              Thêm kỹ năng
            </h3>
            <p className="mp-dialog__lead">
              Thêm kỹ năng để nhà tuyển dụng hiểu rõ năng lực và mức độ kinh nghiệm của bạn.
            </p>
          </div>
        </div>

        <label className="mp-dialog__field">
          <span className="mp-dialog__label">Tên kỹ năng *</span>
          <input
            className="mp-dialog__input"
            placeholder="VD: React, UI/UX Design, SEO..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className="mp-dialog__field">
          <span className="mp-dialog__label">Cấp độ</span>
          <select
            className="mp-dialog__input"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">Chọn cấp độ (tùy chọn)</option>
            {LEVEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="mp-dialog__field">
          <span className="mp-dialog__label">Số năm kinh nghiệm</span>
          <input
            className="mp-dialog__input"
            type="number"
            min={0}
            max={50}
            placeholder="VD: 3"
            value={years}
            onChange={(e) => setYears(e.target.value)}
          />
        </label>

        {error ? (
          <p className="mp-dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mp-dialog__actions">
          <button
            type="button"
            className="mp-dialog__btn mp-dialog__btn--ghost"
            disabled={saving}
            onClick={onClose}
          >
            Hủy
          </button>
          <button type="submit" className="mp-dialog__btn mp-dialog__btn--primary" disabled={saving}>
            {saving ? "Đang lưu..." : "Thêm kỹ năng"}
          </button>
        </div>
      </form>
    </div>
  );
}
