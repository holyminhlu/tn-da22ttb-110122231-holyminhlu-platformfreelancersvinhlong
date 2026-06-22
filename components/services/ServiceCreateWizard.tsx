"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaCheck, FaTrashAlt } from "react-icons/fa";
import {
  createMyService,
  getMyService,
  listServiceCategories,
  patchMyServiceStatus,
  updateMyService,
  uploadServiceDemo,
  uploadServiceImages,
  uploadServiceThumbnail,
  type CreateServicePayload,
  type ServiceListingStatus,
  type ServicePackage,
} from "@/lib/api/services";
import { serviceFormFromRow } from "@/lib/services/serviceDetailDisplay";
import {
  buildDefaultServicePackages,
  formatPackagePrice,
  normalizeServiceRevision,
  SERVICE_REVISION_OPTIONS,
  type ServiceRevisionOption,
} from "@/lib/hire/servicePackages";
import ServicesShell from "./ServicesShell";
import "../hire/post-job.css";

const STEPS = [
  { id: 1, title: "Tổng quan" },
  { id: 2, title: "Giá & Gói" },
  { id: 3, title: "Mô tả & FAQ" },
  { id: 4, title: "Yêu cầu" },
  { id: 5, title: "Gallery" },
] as const;

const DEFAULT_CATEGORIES = [
  "Lập trình & Phần mềm",
  "Thiết kế đồ họa & UI/UX",
  "Viết lách & Biên tập",
  "Dịch thuật",
  "Digital Marketing",
  "SEO & Quảng cáo",
  "Video & Hoạt hình",
  "Âm thanh & Lồng tiếng",
  "Kinh doanh & Tư vấn",
  "Kế toán & Pháp lý",
  "Giáo dục & Gia sư",
  "Nhiếp ảnh",
  "Trợ lý ảo & Hành chính",
];

const EMPTY_FAQ = { q: "", a: "" };
const REQUIREMENT_EXAMPLES = [
  "Brief / mô tả dự án (file Word hoặc Google Doc)",
  "Logo, font, bảng màu thương hiệu (nếu có)",
  "Ảnh tham khảo phong cách mong muốn",
  "Tài khoản / quyền truy cập cần thiết (nếu có)",
];

type PricingMode = "single" | "packages";

function parseTags(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function RevisionSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (next: ServiceRevisionOption) => void;
  label: string;
}) {
  const safe = normalizeServiceRevision(value);
  return (
    <label className="post-job-field">
      <span>{label}</span>
      <select value={safe} onChange={(e) => onChange(e.target.value as ServiceRevisionOption)}>
        {SERVICE_REVISION_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildRequirementsBody(items: string[], notes: string): string {
  const lines = items.map((t) => t.trim()).filter(Boolean);
  const numbered = lines.map((line, i) => `${i + 1}. ${line}`);
  const extra = notes.trim();
  if (!numbered.length && !extra) return "";
  if (!extra) return numbered.join("\n");
  if (!numbered.length) return extra;
  return `${numbered.join("\n")}\n\nGhi chú thêm:\n${extra}`;
}

type ServiceCreateWizardProps = {
  editServiceId?: string;
};

type SubmitMode = "draft" | "pending" | "save";

export default function ServiceCreateWizard({
  editServiceId }: ServiceCreateWizardProps = {}) {
  const { t } = useTranslation();

  const router = useRouter();
  const isEdit = Boolean(editServiceId);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const [loadEditError, setLoadEditError] = useState("");
  const [listingStatus, setListingStatus] = useState<ServiceListingStatus>("draft");
  const [error, setError] = useState("");
  const [stepError, setStepError] = useState("");
  const [apiCategories, setApiCategories] = useState<string[]>([]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [description, setDescription] = useState("");
  const [requirementItems, setRequirementItems] = useState([""]);
  const [requirementNotes, setRequirementNotes] = useState("");
  const [pricingMode, setPricingMode] = useState<PricingMode>("packages");
  const [basePrice, setBasePrice] = useState("1500000");
  const [deliveryDays, setDeliveryDays] = useState("5");
  const [singleRevisions, setSingleRevisions] = useState("2 lần");
  const [packages, setPackages] = useState<ServicePackage[]>(
    buildDefaultServicePackages(1500000, 5),
  );
  const [faqs, setFaqs] = useState([{ ...EMPTY_FAQ }]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [demoUrl, setDemoUrl] = useState<string | null>(null);

  const tags = useMemo(() => parseTags(tagsInput), [tagsInput]);

  const categorySuggestions = useMemo(() => {
    const merged = new Set<string>([...DEFAULT_CATEGORIES, ...apiCategories]);
    return [...merged].sort((a, b) => a.localeCompare(b, "vi"));
  }, [apiCategories]);

  useEffect(() => {
    listServiceCategories()
      .then((rows) => {
        const names = rows.map((r) => r.name).filter(Boolean);
        if (names.length) setApiCategories(names);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!editServiceId) return;
    let cancelled = false;
    void (async () => {
      setLoadingEdit(true);
      setLoadEditError("");
      try {
        const row = await getMyService(editServiceId);
        if (cancelled) return;
        const snap = serviceFormFromRow(row);
        setTitle(snap.title);
        setCategory(snap.category);
        setTagsInput(snap.tagsInput);
        setDescription(snap.description);
        setRequirementItems(snap.requirementItems);
        setRequirementNotes(snap.requirementNotes);
        setPricingMode(snap.pricingMode);
        setBasePrice(snap.basePrice);
        setDeliveryDays(snap.deliveryDays);
        setSingleRevisions(snap.singleRevisions);
        setPackages(snap.packages);
        setFaqs(snap.faqs);
        setThumbnailUrl(snap.thumbnailUrl);
        setMediaUrls(snap.mediaUrls);
        setDemoUrl(snap.demoUrl);
        setListingStatus(snap.listingStatus as ServiceListingStatus);
      } catch (err) {
        if (cancelled) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Không thể tải dịch vụ để chỉnh sửa.";
        setLoadEditError(message);
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editServiceId]);

  const patchPackage = useCallback((index: number, patch: Partial<ServicePackage>) => {
    setPackages((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }, []);

  const syncPackagesFromBase = useCallback(() => {
    const price = Number(basePrice.replace(/\D/g, "")) || 1500000;
    const days = Number(deliveryDays) || 5;
    setPackages(buildDefaultServicePackages(price, days));
  }, [basePrice, deliveryDays]);

  function resolvePackages(): ServicePackage[] {
    const price = Number(basePrice.replace(/\D/g, "")) || 1000000;
    const days = Number(deliveryDays) || 5;
    if (pricingMode === "single") {
      return [
        {
          id: "standard",
          name: "Trọn gói",
          price,
          deliveryDays: days,
          revisions: singleRevisions.trim() || "Theo thỏa thuận",
          features: ["Một mức giá duy nhất", "Bao gồm toàn bộ phạm vi đã mô tả"],
        },
      ];
    }
    return packages;
  }

  function buildPayload(listingStatus: "draft" | "pending"): CreateServicePayload {
    const resolved = resolvePackages();
    const primary = resolved[0];
    return {
      title: title.trim(),
      description: description.trim(),
      price: primary?.price ?? (Number(basePrice.replace(/\D/g, "")) || 1000000),
      deliveryDays: primary?.deliveryDays ?? (Number(deliveryDays) || 5),
      category: category.trim(),
      requirements: buildRequirementsBody(requirementItems, requirementNotes),
      techStack: tags,
      faqs: faqs.filter((f) => f.q.trim() && f.a.trim()),
      packages: resolved,
      mediaUrls,
      thumbnailUrl,
      demoMedia: demoUrl ? { url: demoUrl, kind: "video" } : null,
      responseTimeHours: 24,
      listingStatus,
    };
  }

  function validateStep(target: number): boolean {
    setStepError("");
    if (target === 1) {
      if (title.trim().length < 8) {
        setStepError("Nhập tiêu đề dịch vụ (ít nhất 8 ký tự).");
        return false;
      }
      if (category.trim().length < 2) {
        setStepError("Nhập hoặc chọn danh mục (ít nhất 2 ký tự).");
        return false;
      }
    }
    if (target === 2) {
      const price = Number(basePrice.replace(/\D/g, ""));
      if (!Number.isFinite(price) || price < 100000) {
        setStepError("Giá tối thiểu 100.000 VND.");
        return false;
      }
      if (pricingMode === "packages") {
        const invalid = packages.some((p) => !p.price || p.price < 100000);
        if (invalid) {
          setStepError("Mỗi gói cần giá hợp lệ (≥ 100.000 VND).");
          return false;
        }
      }
    }
    if (target === 3) {
      if (description.trim().length < 30) {
        setStepError("Mô tả chi tiết nên có ít nhất 30 ký tự để Khách hàng hiểu rõ dịch vụ.");
        return false;
      }
    }
    if (target === 4) {
      const hasItem = requirementItems.some((r) => r.trim().length > 0);
      if (!hasItem && !requirementNotes.trim()) {
        setStepError("Thêm ít nhất một mục yêu cầu Khách hàng phải cung cấp sau khi mua.");
        return false;
      }
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

  function goToStep(id: number) {
    if (id > step) return;
    setStepError("");
    setStep(id);
  }

  async function submit(mode: SubmitMode) {
  setError("");
    if (mode === "pending" || mode === "save") {
      for (let s = 1; s <= 4; s += 1) {
        if (!validateStep(s)) {
          setStep(s);
          return;
        }
      }
    }
    setBusy(true);
    try {
      const payload = buildPayload(mode === "draft" ? "draft" : "pending");
      if (isEdit && editServiceId) {
        const result = await updateMyService(editServiceId, payload);
        if (mode === "draft") {
          await patchMyServiceStatus(editServiceId, "draft");
        } else if (mode === "pending") {
          await patchMyServiceStatus(editServiceId, "pending");
        }
        alert(result.message);
        router.push(`/dich-vu/quan-ly/${editServiceId}`);
      } else {
        const result = await createMyService(buildPayload(mode === "draft" ? "draft" : "pending"));
        alert(result.message);
        router.push("/dich-vu/quan-ly");
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể lưu dịch vụ.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleThumbnail(file: File | null) {
  if (!file) return;
    try {
      const url = await uploadServiceThumbnail(file);
      setThumbnailUrl(url);
    } catch {
      alert(t("Không tải được ảnh cover."));
    }
  }

  async function handleGallery(files: FileList | null) {
  if (!files?.length) return;
    try {
      const urls = await uploadServiceImages(Array.from(files));
      setMediaUrls((prev) => [...prev, ...urls].slice(0, 12));
    } catch {
      alert(t("Không tải được ảnh gallery."));
    }
  }

  async function handleDemo(file: File | null) {
  if (!file) return;
    try {
      const data = await uploadServiceDemo(file);
      setDemoUrl(data.url);
    } catch {
      alert(t("Không tải được video demo."));
    }
  }

  const pricePreview = formatPackagePrice(Number(basePrice.replace(/\D/g, "")) || 0);
  const backHref = isEdit && editServiceId ? `/dich-vu/quan-ly/${editServiceId}` : "/dich-vu/quan-ly";
  const showDraftPending =
    !isEdit || listingStatus === "draft" || listingStatus === "denied";
  const showSaveOnly =
    isEdit && (listingStatus === "active" || listingStatus === "paused" || listingStatus === "pending");

  if (loadingEdit) {
    return (
      <ServicesShell>
        <p className="text-sm text-gray-500">{t("Đang tải dịch vụ...")}</p>
      </ServicesShell>
    );
  }

  if (loadEditError) {
    return (
      <ServicesShell>
        <p className="text-sm text-red-700" role="alert">
          {loadEditError}
        </p>
        <Link href="/dich-vu/quan-ly" className="svc-btn svc-btn--secondary mt-3">
          {t("Về quản lý")}
        </Link>
      </ServicesShell>
    );
  }

  return (
    <ServicesShell>
      <header className="svc-hub__head">
        <div>
          <h1 className="svc-hub__title">{isEdit ? "Chỉnh sửa dịch vụ" : "Đăng dịch vụ mới"}</h1>
          <p className="svc-hub__lead">
            {isEdit
              ? "Cập nhật từng bước — lưu thay đổi hoặc gửi lại chờ duyệt nếu cần."
              : "Hoàn thành từng bước bên dưới — lưu nháp bất cứ lúc nào hoặc gửi chờ duyệt ở bước cuối."}
          </p>
        </div>
        <Link
          href={backHref}
          className="svc-hub__cta"
          style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db" }}
        >
          {isEdit ? "Quay lại chi tiết" : "Quay lại quản lý"}
        </Link>
      </header>

      <div className="post-job-wizard svc-create-wizard">
        <p className="svc-wizard__progress" aria-live="polite">
          Bước {step} / {STEPS.length}: {STEPS[step - 1]?.title}
        </p>

        <ol className="post-job-wizard__steps" aria-label={t("Các bước đăng dịch vụ")}>
          {STEPS.map((s) => {
            const done = s.id < step;
            const active = s.id === step;
            const clickable = s.id <= step;
            return (
              <li
                key={s.id}
                className={`post-job-wizard__step${active ? " post-job-wizard__step--active" : ""}${
                  done ? " post-job-wizard__step--done" : ""
                }`}
              >
                <button
                  type="button"
                  className="svc-wizard__step-btn"
                  disabled={!clickable}
                  onClick={() => goToStep(s.id)}
                  aria-current={active ? "step" : undefined}
                >
                  <span className="post-job-wizard__step-num">
                    {done ? <FaCheck aria-hidden /> : s.id}
                  </span>
                  <span className="post-job-wizard__step-label">{t(s.title)}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="post-job-wizard__panel">
          {step === 1 ? (
            <div className="post-job-wizard__fields">
              <h2 className="post-job-wizard__heading">{t("Tổng quan dịch vụ")}</h2>
              <p className="post-job-wizard__hint">
                {t("Thông tin hiển thị trên thẻ tìm kiếm và trang chi tiết gig — tiêu đề và danh mục giúp Khách hàng tìm thấy bạn.")}
              </p>
              <label className="post-job-field">
                <span>{t("Tiêu đề dịch vụ *")}</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("VD: Thiết kế logo thương hiệu chuyên nghiệp")}
                  maxLength={120}
                />
              </label>
              <label className="post-job-field">
                <span>{t("Danh mục *")}</span>
                <input
                  type="text"
                  list="svc-category-suggestions"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t("Chọn gợi ý hoặc gõ danh mục của bạn")}
                  maxLength={80}
                  autoComplete="off"
                />
                <datalist id="svc-category-suggestions">
                  {categorySuggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <span className="post-job-wizard__hint" style={{ marginTop: "0.35rem" }}>
                  {t("Chọn từ gợi ý khi gõ, hoặc nhập danh mục mới (VD: Làm vườn, Sửa chữa nhà, Dịch vụ pháp lý…).")}
                </span>
              </label>
              {categorySuggestions.length > 0 ? (
                <div className="svc-category-chips" aria-label={t("Gợi ý danh mục nhanh")}>
                  {categorySuggestions.slice(0, 8).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`svc-category-chips__chip${category === c ? " svc-category-chips__chip--active" : ""}`}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : null}
              <label className="post-job-field">
                <span>{t("Từ khóa tìm kiếm (Tags)")}</span>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder={t("logo, branding, Figma — phân cách bằng dấu phẩy")}
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
              <h2 className="post-job-wizard__heading">{t("Giá cả & Gói thầu")}</h2>
              <p className="post-job-wizard__hint">
                {t("Chọn một mức giá cố định cho toàn bộ dịch vụ, hoặc chia thành nhiều gói (Basic / Standard / Premium) để Khách hàng lựa chọn mức phù hợp.")}
              </p>

              <fieldset className="post-job-wizard__radio-group svc-pricing-mode">
                <legend>{t("Hình thức báo giá")}</legend>
                <label>
                  <input
                    type="radio"
                    name="pricingMode"
                    checked={pricingMode === "single"}
                    onChange={() => setPricingMode("single")}
                  />
                  {t("Một giá duy nhất (trọn gói)")}
                </label>
                <label>
                  <input
                    type="radio"
                    name="pricingMode"
                    checked={pricingMode === "packages"}
                    onChange={() => {
                      setPricingMode("packages");
                      syncPackagesFromBase();
                    }}
                  />
                  {t("Nhiều gói (Basic · Standard · Premium)")}
                </label>
              </fieldset>

              {pricingMode === "single" ? (
                <div className="svc-pricing-single">
                  <div className="post-job-wizard__row-2">
                    <label className="post-job-field">
                      <span>{t("Giá dịch vụ (VND) *")}</span>
                      <input
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value.replace(/[^\d]/g, ""))}
                        inputMode="numeric"
                      />
                    </label>
                    <label className="post-job-field">
                      <span>{t("Thời gian hoàn thành *")}</span>
                      <select value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)}>
                        {[1, 3, 5, 7, 10, 15, 30].map((d) => (
                          <option key={d} value={String(d)}>
                            {d} ngày làm việc
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <RevisionSelect
                    label={t("Số lần chỉnh sửa sau bàn giao")}
                    value={singleRevisions}
                    onChange={setSingleRevisions}
                  />
                  <p className="post-job-wizard__hint">
                    {t("Khách hàng chỉ thấy")} <strong>{t("một nút &quot;Mua ngay&quot;")}</strong> với giá {pricePreview} ·{" "}
                    {deliveryDays} ngày.
                  </p>
                </div>
              ) : (
                <div className="svc-pricing-tiers">
                  <div className="post-job-wizard__row-2">
                    <label className="post-job-field">
                      <span>{t("Giá gói Standard (tham chiếu)")}</span>
                      <input
                        value={basePrice}
                        onChange={(e) => {
                          setBasePrice(e.target.value.replace(/[^\d]/g, ""));
                        }}
                        onBlur={() => syncPackagesFromBase()}
                      />
                    </label>
                    <label className="post-job-field">
                      <span>{t("Ngày gói Standard")}</span>
                      <select
                        value={deliveryDays}
                        onChange={(e) => {
                          setDeliveryDays(e.target.value);
                        }}
                        onBlur={() => syncPackagesFromBase()}
                      >
                        {[1, 3, 5, 7, 15, 30].map((d) => (
                          <option key={d} value={String(d)}>
                            {d} ngày
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    className="svc-btn svc-btn--secondary"
                    style={{ marginBottom: "0.75rem" }}
                    onClick={() => syncPackagesFromBase()}
                  >
                    {t("Tính lại giá 3 gói từ Standard")}
                  </button>
                  {packages.map((pkg, idx) => (
                    <div key={pkg.id} className="svc-tier-card">
                      <h3 className="svc-tier-card__name">{t(pkg.name)}</h3>
                      <div className="post-job-wizard__row-2">
                        <label className="post-job-field">
                          <span>{t("Giá (VND)")}</span>
                          <input
                            value={String(pkg.price)}
                            onChange={(e) =>
                              patchPackage(idx, {
                                price: Number(e.target.value.replace(/\D/g, "")) || 0,
                              })
                            }
                          />
                        </label>
                        <label className="post-job-field">
                          <span>{t("Số ngày")}</span>
                          <input
                            type="number"
                            min={1}
                            value={pkg.deliveryDays}
                            onChange={(e) =>
                              patchPackage(idx, { deliveryDays: Number(e.target.value) || 1 })
                            }
                          />
                        </label>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <RevisionSelect
                            label={t("Lần chỉnh sửa")}
                            value={pkg.revisions}
                            onChange={(next) => patchPackage(idx, { revisions: next })}
                          />
                        </div>
                      </div>
                      <p className="svc-tier-card__preview">
                        {formatPackagePrice(pkg.price)} · {pkg.deliveryDays} ngày · {pkg.revisions}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="post-job-wizard__fields">
              <h2 className="post-job-wizard__heading">{t("Mô tả chi tiết & FAQ")}</h2>
              <p className="post-job-wizard__hint">
                {t("Giải thích rõ phạm vi công việc, sản phẩm bàn giao và câu hỏi thường gặp — giúp giảm trao đổi lặp lại trước khi mua.")}
              </p>
              <label className="post-job-field">
                <span>{t("Mô tả đầy đủ *")}</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  placeholder={t("Bạn sẽ làm gì, không làm gì, định dạng file bàn giao, quy trình làm việc...")}
                />
              </label>

              <div className="svc-faq-block">
                <h3 className="svc-faq-block__title">{t("Câu hỏi thường gặp (FAQ)")}</h3>
                <p className="post-job-wizard__hint" style={{ marginTop: 0 }}>
                  {t("Thêm câu hỏi Khách hàng hay hỏi — có thể xóa từng mục khi không cần nữa.")}
                </p>
                <div className="svc-faq-list">
                  {faqs.map((faq, idx) => (
                    <div key={idx} className="svc-faq-item">
                      <div className="svc-faq-item__head">
                        <span className="svc-faq-item__label">FAQ #{idx + 1}</span>
                        <button
                          type="button"
                          className="svc-faq-item__remove"
                          onClick={() =>
                            setFaqs((prev) =>
                              prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx),
                            )
                          }
                          disabled={faqs.length <= 1}
                          aria-label={`Xóa FAQ ${idx + 1}`}
                          title={faqs.length <= 1 ? "Giữ ít nhất một ô FAQ" : "Xóa FAQ này"}
                        >
                          <FaTrashAlt aria-hidden /> {t("Xóa")}
                        </button>
                      </div>
                      <input
                        className="svc-faq-item__input"
                        placeholder={t("Câu hỏi (VD: Bạn có hỗ trợ chỉnh sửa sau khi bàn giao không?)")}
                        value={faq.q}
                        onChange={(e) =>
                          setFaqs((prev) =>
                            prev.map((f, i) => (i === idx ? { ...f, q: e.target.value } : f)),
                          )
                        }
                      />
                      <textarea
                        className="svc-faq-item__input"
                        placeholder={t("Trả lời ngắn gọn, rõ ràng")}
                        rows={2}
                        value={faq.a}
                        onChange={(e) =>
                          setFaqs((prev) =>
                            prev.map((f, i) => (i === idx ? { ...f, a: e.target.value } : f)),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="svc-btn svc-btn--secondary"
                  onClick={() => setFaqs((prev) => [...prev, { ...EMPTY_FAQ }])}
                >
                  {t("+ Thêm FAQ")}
                </button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="post-job-wizard__fields">
              <h2 className="post-job-wizard__heading">{t("Yêu cầu từ Khách hàng")}</h2>

              <div className="svc-req-callout" role="note">
                <p className="svc-req-callout__title">{t("Mục này dùng để làm gì?")}</p>
                <p>
                  {t("Sau khi Khách hàng")} <strong>{t("thanh toán / đặt cọc")}</strong> {t("và bạn")} <strong>{t("tiếp nhận đơn")}</strong>{t(", họ sẽ thấy danh sách thông tin và file cần gửi trước khi bạn bắt đầu làm. Ghi càng cụ thể càng giảm trễ deadline do thiếu brief.")}
                </p>
                <ul className="svc-req-callout__list">
                  <li>{t("Mỗi dòng = một yêu cầu bắt buộc hoặc khuyến nghị")}</li>
                  <li>{t("Nêu rõ định dạng file (PDF, PNG, Figma link…)")}</li>
                  <li>{t("Đánh dấu mục nào là bắt buộc trong nội dung (VD: &quot;(bắt buộc)&quot;)")}</li>
                </ul>
              </div>

              <div className="svc-req-items">
                <p className="svc-req-items__label">{t("Danh sách yêu cầu Khách hàng cần cung cấp *")}</p>
                {requirementItems.map((item, idx) => (
                  <div key={idx} className="svc-req-row">
                    <span className="svc-req-row__num" aria-hidden>
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      className="svc-req-row__input"
                      value={item}
                      onChange={(e) =>
                        setRequirementItems((prev) =>
                          prev.map((r, i) => (i === idx ? e.target.value : r)),
                        )
                      }
                      placeholder={t("VD: File brief dự án (Word/PDF) — bắt buộc")}
                    />
                    <button
                      type="button"
                      className="svc-req-row__remove"
                      onClick={() =>
                        setRequirementItems((prev) =>
                          prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx),
                        )
                      }
                      disabled={requirementItems.length <= 1}
                      aria-label={`Xóa yêu cầu ${idx + 1}`}
                    >
                      <FaTrashAlt aria-hidden />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="svc-btn svc-btn--secondary"
                  onClick={() => setRequirementItems((prev) => [...prev, ""])}
                >
                  {t("+ Thêm mục yêu cầu")}
                </button>
              </div>

              <p className="svc-req-examples__label">{t("Gợi ý — bấm để thêm nhanh:")}</p>
              <div className="svc-req-examples">
                {REQUIREMENT_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    className="svc-req-examples__chip"
                    onClick={() => {
                      const trimmed = ex.trim();
                      if (requirementItems.some((r) => r.trim() === trimmed)) return;
                      const emptyIdx = requirementItems.findIndex((r) => !r.trim());
                      if (emptyIdx >= 0) {
                        setRequirementItems((prev) =>
                          prev.map((r, i) => (i === emptyIdx ? trimmed : r)),
                        );
                      } else {
                        setRequirementItems((prev) => [...prev, trimmed]);
                      }
                    }}
                  >
                    + {ex}
                  </button>
                ))}
              </div>

              <label className="post-job-field">
                <span>{t("Ghi chú bổ sung (tùy chọn)")}</span>
                <textarea
                  value={requirementNotes}
                  onChange={(e) => setRequirementNotes(e.target.value)}
                  rows={3}
                  placeholder={t("VD: Nếu chưa có logo, Khách hàng có thể gửi tên thương hiệu và phong cách mong muốn...")}
                />
              </label>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="post-job-wizard__fields">
              <h2 className="post-job-wizard__heading">{t("Hình ảnh & Sản phẩm mẫu")}</h2>
              <p className="post-job-wizard__hint">
                {t("Ảnh cover và gallery giúp tăng tỷ lệ chuyển đổi — video/PDF demo thể hiện chất lượng thực tế.")}
              </p>
              <label className="post-job-field">
                <span>Ảnh cover</span>
                <input type="file" accept="image/*" onChange={(e) => void handleThumbnail(e.target.files?.[0] ?? null)} />
                {thumbnailUrl ? <span className="svc-upload-ok">{t("Đã tải ảnh cover")}</span> : null}
              </label>
              <label className="post-job-field">
                <span>{t("Gallery (tối đa 12 ảnh)")}</span>
                <input type="file" accept="image/*" multiple onChange={(e) => void handleGallery(e.target.files)} />
                {mediaUrls.length > 0 ? (
                  <span className="svc-upload-ok">{mediaUrls.length} ảnh đã tải</span>
                ) : null}
              </label>
              <label className="post-job-field">
                <span>Video demo (MP4 / WebM / MOV)</span>
                <input type="file" accept="video/*" onChange={(e) => void handleDemo(e.target.files?.[0] ?? null)} />
                {demoUrl ? <span className="svc-upload-ok">{t("Đã tải video demo")}</span> : null}
              </label>
            </div>
          ) : null}

          {stepError ? (
            <p className="post-job-wizard__error" role="alert">
              {stepError}
            </p>
          ) : null}
          {error ? (
            <p className="post-job-wizard__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="svc-wizard__footer">
          {step > 1 ? (
            <button type="button" className="svc-btn svc-btn--secondary" onClick={goBack}>
              {t("Quay lại")}
            </button>
          ) : (
            <span />
          )}
          {step < 5 ? (
            <button type="button" className="svc-btn svc-btn--primary" onClick={goNext}>
              {t("Tiếp theo")}
            </button>
          ) : (
            <div className="svc-wizard__submit-group">
              {showSaveOnly ? (
                <button
                  type="button"
                  className="svc-btn svc-btn--primary"
                  disabled={busy}
                  onClick={() => void submit("save")}
                >
                  {busy ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              ) : (
                <>
                  {showDraftPending ? (
                    <button
                      type="button"
                      className="svc-btn svc-btn--secondary"
                      disabled={busy}
                      onClick={() => void submit("draft")}
                    >
                      {t("Lưu nháp")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="svc-btn svc-btn--primary"
                    disabled={busy}
                    onClick={() => void submit("pending")}
                  >
                    {busy ? "Đang gửi..." : isEdit ? "Lưu & gửi duyệt" : "Gửi chờ duyệt"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </ServicesShell>
  );
}
