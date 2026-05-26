"use client";

import { useState } from "react";
import type { SkillInput, UserSkill } from "@/lib/api/users";
import { updateSkills } from "@/lib/api/users";

type AddSkillDialogProps = {
  existing: UserSkill[];
  onClose: () => void;
  onSaved: () => void;
};

export default function AddSkillDialog({ existing, onClose, onSaved }: AddSkillDialogProps) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [years, setYears] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      alert("Tên kỹ năng là bắt buộc.");
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
    try {
      await updateSkills(next);
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể lưu kỹ năng.";
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ea-dialog-backdrop" role="presentation" onClick={() => !saving && onClose()}>
      <form
        className="ea-dialog"
        role="dialog"
        aria-labelledby="add-skill-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <h3 id="add-skill-title">Thêm kỹ năng</h3>
        <input
          className="ea-dialog-input"
          placeholder="Tên kỹ năng (VD: React)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <input
          className="ea-dialog-input"
          placeholder="Cấp độ (VD: Senior)"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        />
        <input
          className="ea-dialog-input"
          type="number"
          min={0}
          placeholder="Số năm kinh nghiệm"
          value={years}
          onChange={(e) => setYears(e.target.value)}
        />
        <div className="ea-dialog-actions">
          <button
            type="button"
            className="ea-dialog-btn ea-dialog-btn--ghost"
            disabled={saving}
            onClick={onClose}
          >
            Hủy
          </button>
          <button type="submit" className="ea-dialog-btn ea-dialog-btn--primary" disabled={saving}>
            {saving ? "Đang lưu..." : "Thêm"}
          </button>
        </div>
      </form>
    </div>
  );
}
