"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaCheck, FaImage, FaMapMarkerAlt, FaMoneyBillWave, FaTimes } from "react-icons/fa";
import { DEFAULT_JOB_CATEGORIES } from "@/components/findwork/constants";
import { createJob, getJob, updateMyJob, uploadJobImages } from "@/lib/api/jobs";
import {
  isoToLocalDateInputValue,
  isDateInputBeforeToday,
  localDateInputValue,
} from "@/lib/format";
import { formatJobBudgetLine } from "@/lib/jobsDisplay";
import JobWorkLocationField, {
  REMOTE_WORK_LOCATION_LABEL,
  type WorkLocationMode,
} from "./JobWorkLocationField";

const STEPS = [
  { id: 1, title: tUi("Thông tin cơ bản"), icon: FaCheck },
  { id: 2, title: tUi("Ngân sách"), icon: FaMoneyBillWave },
  { id: 3, title: tUi("Địa điểm & thời hạn"), icon: FaMapMarkerAlt },
  { id: 4, title: tUi("Hình ảnh"), icon: FaImage },
  { id: 5, title: tUi("Xem lại & đăng"), icon: FaCheck },
] as const;

type BudgetType = "fixed" | "hourly";

type FormState = {
  title: string;
  description: string;
  category: string;
  tagsInput: string;
  budgetType: BudgetType;
  budget: string;
  budgetMax: string;
  locationMode: WorkLocationMode;
  locationLabel: string;
  locationLat: number | null;
  locationLng: number | null;
  dueAt: string;
};

const INITIAL: FormState = {
  title: "",
  description: "",
  category: "",
  tagsInput: "",
  budgetType: "fixed",
  budget: "",
  budgetMax: "",
  locationMode: "onsite",
  locationLabel: "",
  locationLat: null,
  locationLng: null,
  dueAt: "",
};

function parseTags(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function parseJobTags(raw: unknown): string {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean).join(", ");
  }
  return "";
}

function parseJobImages(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((u) => String(u).trim()).filter(Boolean).slice(0, 3);
  }
  return [];
}

type ClientPostJobWizardProps = {
  editJobId?: string | null;
};

export default function ClientPostJobWizard({
  editJobId = null }: ClientPostJobWizardProps) {
  const { t } = useTranslation();

  const router = useRouter();
  const isEdit = Boolean(editJobId);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [stepError, setStepError] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [loadingJob, setLoadingJob] = useState(isEdit);
  const [loadJobError, setLoadJobError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const tags = useMemo(() => parseTags(form.tagsInput), [form.tagsInput]);

  useEffect(() => {
    const urls = imageFiles.map((f) => URL.createObjectURL(f));
    setImagePreviews(urls);
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [imageFiles]);

  useEffect(() => {
    if (!editJobId) return;
    let cancelled = false;
    void (async () => {
      setLoadingJob(true);
      setLoadJobError("");
      try {
        const job = await getJob(editJobId);
        if (cancelled) return;
        if (job.status !== "open") {
          setLoadJobError("Chỉ chỉnh sửa được tin đang mở tuyển.");
          return;
        }
        const isRemote = job.location_label === REMOTE_WORK_LOCATION_LABEL;
        const dueLocal = (() => {
          const v = isoToLocalDateInputValue(job.due_at);
          return v && !isDateInputBeforeToday(v) ? v : "";
        })();
        setForm({
          title: job.title || "",
          description: job.description || "",
          category: job.category || "",
          tagsInput: parseJobTags(job.tags),
          budgetType: job.budget_type === "hourly" ? "hourly" : "fixed",
          budget: job.budget != null ? String(job.budget) : "",
          budgetMax: job.budget_max != null ? String(job.budget_max) : "",
          locationMode: isRemote ? "remote" : "onsite",
          locationLabel: isRemote ? "" : job.location_label || "",
          locationLat: job.location_lat ?? null,
          locationLng: job.location_lng ?? null,
          dueAt: dueLocal,
        });
        setExistingImages(parseJobImages(job.images));
      } catch (err) {
        if (cancelled) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Không thể tải tin cần chỉnh sửa.";
        setLoadJobError(message);
      } finally {
        if (!cancelled) setLoadingJob(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editJobId]);

  const patch = useCallback((partial: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...partial }));
    setStepError("");
  }, []);

  function validateStep(current: number): boolean {
    setStepError("");
    if (current === 1) {
      if (form.title.trim().length < 5) {
        setStepError(t("Tiêu đề cần ít nhất 5 ký tự."));
        return false;
      }
      if (form.description.trim().length < 20) {
        setStepError(t("Mô tả cần ít nhất 20 ký tự."));
        return false;
      }
      if (!form.category.trim()) {
        setStepError(t("Vui lòng chọn danh mục."));
        return false;
      }
      return true;
    }
    if (current === 2) {
      const min = form.budget.trim() ? Number(form.budget) : null;
      const max = form.budgetMax.trim() ? Number(form.budgetMax) : null;
      if (min !== null && (!Number.isFinite(min) || min < 0)) {
        setStepError(t("Ngân sách không hợp lệ."));
        return false;
      }
      if (max !== null && (!Number.isFinite(max) || max < 0)) {
        setStepError(t("Ngân sách tối đa không hợp lệ."));
        return false;
      }
      if (min === null && max === null) {
        setStepError(t("Nhập ít nhất mức ngân sách hoặc khoảng ngân sách."));
        return false;
      }
      if (min !== null && max !== null && max < min) {
        setStepError(t("Ngân sách tối đa phải lớn hơn hoặc bằng mức tối thiểu."));
        return false;
      }
      return true;
    }
    if (current === 3) {
      if (form.locationMode !== "remote" && !form.locationLabel.trim()) {
        setStepError(t("Vui lòng chọn địa chỉ tại Vĩnh Long hoặc dùng GPS."));
        return false;
      }
      if (form.dueAt) {
        if (isDateInputBeforeToday(form.dueAt)) {
          setStepError(t("Hạn hoàn thành dự kiến không được là ngày trong quá khứ."));
          return false;
        }
      }
      return true;
    }
    if (current === 4) {
      if (existingImages.length + imageFiles.length > 3) {
        setStepError(t("Tối đa 3 ảnh đính kèm."));
        return false;
      }
      return true;
    }
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(5, s + 1));
  }

  function goBack() {
    setStepError("");
    setStep((s) => Math.max(1, s - 1));
  }

  function onPickImages(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    if (!picked.length) return;
    setImageFiles((prev) => [...prev, ...picked].slice(0, 3));
    event.target.value = "";
  }

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      setSubmitError(t("Vui lòng kiểm tra lại các bước trước khi đăng."));
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      let imageUrls = [...existingImages];
      if (imageFiles.length > 0) {
        const uploaded = await uploadJobImages(imageFiles);
        imageUrls = [...imageUrls, ...uploaded].slice(0, 3);
      }
      const budget = form.budget.trim() ? Number(form.budget) : null;
      const budgetMax = form.budgetMax.trim() ? Number(form.budgetMax) : null;
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        tags,
        budget_type: form.budgetType,
        budget,
        budget_max: budgetMax,
        location_label:
          form.locationMode === "remote"
            ? REMOTE_WORK_LOCATION_LABEL
            : form.locationLabel.trim(),
        location_lat: form.locationMode === "onsite" ? form.locationLat : null,
        location_lng: form.locationMode === "onsite" ? form.locationLng : null,
        due_at: form.dueAt ? `${form.dueAt}T12:00:00` : null,
        images: imageUrls,
      };
      if (isEdit && editJobId) {
        await updateMyJob(editJobId, payload);
        router.push("/manage/phong-lam-viec");
        router.refresh();
        return;
      }
      const result = await createJob(payload);
      router.push(`/hire/joblist?posted=${encodeURIComponent(result.job?.id ?? "1")}`);
      router.refresh();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể đăng công việc.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const budgetPreview = formatJobBudgetLine({
    budget_type: form.budgetType,
    budget: form.budget || null,
    budget_max: form.budgetMax || null,
  });

  if (loadingJob) {
    return <p className="hire-page__state">{t("Đang tải tin cần chỉnh sửa...")}</p>;
  }
  if (loadJobError) {
    return (
      <p className="hire-page__state hire-page__state--error" role="alert">
        {loadJobError}
      </p>
    );
  }

  return (
    <div className="post-job-wizard">
      <ol className="post-job-wizard__steps" aria-label={t("Các bước đăng tin")}>
        {STEPS.map((s) => {
          const done = s.id < step;
          const active = s.id === step;
          return (
            <li
              key={s.id}
              className={`post-job-wizard__step${active ? " post-job-wizard__step--active" : ""}${
                done ? " post-job-wizard__step--done" : ""
              }`}
            >
              <span className="post-job-wizard__step-num">{done ? <FaCheck aria-hidden /> : s.id}</span>
              <span className="post-job-wizard__step-label">{s.title}</span>
            </li>
          );
        })}
      </ol>

      <div className="post-job-wizard__panel">
        {step === 1 ? (
          <div className="post-job-wizard__fields">
            <h2 className="post-job-wizard__heading">{t("Thông tin cơ bản")}</h2>
            <label className="post-job-field">
              <span>{t("Tiêu đề công việc *")}</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder={t("VD: Thiết kế landing page cho startup fintech")}
                maxLength={200}
              />
            </label>
            <label className="post-job-field">
              <span>{t("Mô tả chi tiết *")}</span>
              <textarea
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder={t("Mô tả phạm vi, yêu cầu, deliverables, timeline mong muốn...")}
                rows={6}
              />
            </label>
            <label className="post-job-field">
              <span>{t("Danh mục *")}</span>
              <select value={form.category} onChange={(e) => patch({ category: e.target.value })}>
                <option value="">{t("— Chọn danh mục —")}</option>
                {DEFAULT_JOB_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="post-job-field">
              <span>{t("Kỹ năng / thẻ (tối đa 12, phân cách bằng dấu phẩy)")}</span>
              <input
                type="text"
                value={form.tagsInput}
                onChange={(e) => patch({ tagsInput: e.target.value })}
                placeholder="React, Figma, UI/UX"
              />
            </label>
            {tags.length > 0 ? (
              <div className="post-job-wizard__tag-preview">
                {tags.map((t) => (
                  <span key={t} className="post-job-wizard__tag">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="post-job-wizard__fields">
            <h2 className="post-job-wizard__heading">{t("Ngân sách")}</h2>
            <fieldset className="post-job-wizard__radio-group">
              <legend>{t("Loại ngân sách")}</legend>
              <label>
                <input
                  type="radio"
                  name="budgetType"
                  checked={form.budgetType === "fixed"}
                  onChange={() => patch({ budgetType: "fixed" })}
                />
                Trọn gói (Fixed price)
              </label>
              <label>
                <input
                  type="radio"
                  name="budgetType"
                  checked={form.budgetType === "hourly"}
                  onChange={() => patch({ budgetType: "hourly" })}
                />
                Theo giờ (Hourly)
              </label>
            </fieldset>
            <div className="post-job-wizard__row-2">
              <label className="post-job-field">
                <span>{form.budgetType === "hourly" ? "Mức giờ tối thiểu (VND)" : "Ngân sách tối thiểu (VND)"}</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.budget}
                  onChange={(e) => patch({ budget: e.target.value })}
                  placeholder="1000"
                />
              </label>
              <label className="post-job-field">
                <span>{form.budgetType === "hourly" ? "Mức giờ tối đa (VND)" : "Ngân sách tối đa (VND)"}</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.budgetMax}
                  onChange={(e) => patch({ budgetMax: e.target.value })}
                  placeholder="2500"
                />
              </label>
            </div>
            <p className="post-job-wizard__hint">Xem trước: {budgetPreview}</p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="post-job-wizard__fields">
            <h2 className="post-job-wizard__heading">{t("Địa điểm & thời hạn")}</h2>
            <JobWorkLocationField
              mode={form.locationMode}
              onModeChange={(locationMode) => {
                patch({
                  locationMode,
                  ...(locationMode === "remote"
                    ? {
                        locationLabel: REMOTE_WORK_LOCATION_LABEL,
                        locationLat: null,
                        locationLng: null,
                      }
                    : { locationLabel: "" }),
                });
              }}
              locationLabel={form.locationLabel}
              onLocationLabelChange={(locationLabel) => patch({ locationLabel })}
              lat={form.locationLat}
              lng={form.locationLng}
              onCoordsChange={(locationLat, locationLng) => patch({ locationLat, locationLng })}
            />
            <label className="post-job-field">
              <span>{t("Hạn hoàn thành dự kiến (tùy chọn)")}</span>
              <input
                type="date"
                value={form.dueAt}
                min={localDateInputValue()}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value && isDateInputBeforeToday(value)) {
                    setStepError(t("Hạn hoàn thành dự kiến không được là ngày trong quá khứ."));
                    return;
                  }
                  setStepError("");
                  patch({ dueAt: value });
                }}
              />
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="post-job-wizard__fields">
            <h2 className="post-job-wizard__heading">{t("Hình ảnh minh họa")}</h2>
            <p className="post-job-wizard__hint">{t("Tải tối đa 3 ảnh (JPG, PNG). Giúp freelancer hiểu rõ yêu cầu.")}</p>
            <label className="post-job-upload">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={onPickImages}
                disabled={imageFiles.length >= 3}
              />
              <span>Chọn ảnh ({imageFiles.length}/3)</span>
            </label>
            {imagePreviews.length > 0 ? (
              <ul className="post-job-wizard__images">
                {imagePreviews.map((src, i) => (
                  <li key={src}>
                    <Image src={src} alt="" width={120} height={90} className="post-job-wizard__thumb" unoptimized />
                    <button
                      type="button"
                      className="post-job-wizard__remove-img"
                      onClick={() => removeImage(i)}
                      aria-label={t("Xóa ảnh")}
                    >
                      <FaTimes aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="post-job-wizard__fields post-job-wizard__review">
            <h2 className="post-job-wizard__heading">
              {isEdit ? "Xem lại trước khi lưu" : "Xem lại trước khi đăng"}
            </h2>
            <dl className="post-job-review">
              <div>
                <dt>{t("Tiêu đề")}</dt>
                <dd>{form.title}</dd>
              </div>
              <div>
                <dt>{t("Danh mục")}</dt>
                <dd>{form.category}</dd>
              </div>
              <div>
                <dt>{t("Mô tả")}</dt>
                <dd className="post-job-review__desc">{form.description}</dd>
              </div>
              <div>
                <dt>{t("Ngân sách")}</dt>
                <dd>{budgetPreview}</dd>
              </div>
              <div>
                <dt>{t("Địa điểm làm việc")}</dt>
                <dd>
                  {form.locationMode === "remote" ? "Làm tại nhà" : "Làm trực tiếp tại chỗ"}
                  <br />
                  {form.locationMode === "remote" ? REMOTE_WORK_LOCATION_LABEL : form.locationLabel}
                  {form.locationMode === "onsite" && form.locationLat != null && form.locationLng != null ? (
                    <>
                      <br />
                      <span className="post-job-review__coords">
                        GPS: {form.locationLat.toFixed(5)}, {form.locationLng.toFixed(5)}
                      </span>
                    </>
                  ) : null}
                </dd>
              </div>
              {form.dueAt ? (
                <div>
                  <dt>{t("Hạn hoàn thành")}</dt>
                  <dd>{form.dueAt}</dd>
                </div>
              ) : null}
              {tags.length > 0 ? (
                <div>
                  <dt>{t("Kỹ năng")}</dt>
                  <dd>{tags.join(", ")}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t("Ảnh đính kèm")}</dt>
                <dd>{existingImages.length + imageFiles.length} ảnh</dd>
              </div>
            </dl>
            {submitError ? (
              <p className="post-job-wizard__error" role="alert">
                {submitError}
              </p>
            ) : null}
          </div>
        ) : null}

        {stepError ? (
          <p className="post-job-wizard__error" role="alert">
            {stepError}
          </p>
        ) : null}
      </div>

      <div className="post-job-wizard__nav">
        <button type="button" className="post-job-wizard__btn post-job-wizard__btn--muted" disabled={step === 1 || submitting} onClick={goBack}>
          Quay lại
        </button>
        {step < 5 ? (
          <button type="button" className="post-job-wizard__btn post-job-wizard__btn--primary" onClick={goNext}>
            Tiếp theo
          </button>
        ) : (
          <button
            type="button"
            className="post-job-wizard__btn post-job-wizard__btn--primary"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting
              ? isEdit
                ? "Đang lưu..."
                : "Đang đăng..."
              : isEdit
                ? "Lưu thay đổi"
                : "Đăng tin tuyển dụng"}
          </button>
        )}
      </div>
    </div>
  );
}
