"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaTimes, FaTrophy } from "react-icons/fa";
import type { JobQuoteRow } from "@/lib/api/jobQuotes";
import {
  compareJobQuoteWithAi,
  type AiCompareVerdict,
  type AiQuoteCompareResult,
} from "@/lib/api/quoteAiCompare";
import {
  buildQuotesFingerprint,
  clearCachedQuoteAiCompare,
  formatQuoteAiCacheTime,
  getCachedQuoteAiCompare,
  setCachedQuoteAiCompare,
} from "@/lib/hire/quoteAiCompareCache";
import { formatQuoteAmount } from "@/lib/hire/quoteDisplay";
import AiQuoteSuggestButton from "./AiQuoteSuggestButton";

type HireQuoteAiCompareModalProps = {
  quote: JobQuoteRow;
  jobId: string;
  jobQuotes: JobQuoteRow[];
  jobTitle?: string | null;
  jobUpdatedAt?: string | null;
  totalQuotes?: number;
  onClose: () => void;
  onViewQuote?: (quoteId: string) => void;
};

const VERDICT_LABEL: Record<AiCompareVerdict, string> = {
  leading: "Dẫn đầu",
  competitive: "Cạnh tranh",
  trailing: "Cần cải thiện",
};

const VERDICT_CLASS: Record<AiCompareVerdict, string> = {
  leading: "hire-ai-compare__verdict--leading",
  competitive: "hire-ai-compare__verdict--competitive",
  trailing: "hire-ai-compare__verdict--trailing",
};

const CONFIDENCE_LABEL = {
  high: "Tin cậy cao",
  medium: "Khá tin cậy",
  low: "Tham khảo",
} as const;

function scoreTone(score: number): string {
  if (score >= 80) return "hire-ai-compare__score--high";
  if (score >= 60) return "hire-ai-compare__score--mid";
  return "hire-ai-compare__score--low";
}

export default function HireQuoteAiCompareModal({
  quote,
  jobId,
  jobQuotes,
  jobTitle,
  jobUpdatedAt,
  totalQuotes,
  onClose,
  onViewQuote,
}: HireQuoteAiCompareModalProps) {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AiQuoteCompareResult | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const quotesFingerprint = useMemo(
    () => buildQuotesFingerprint(jobQuotes, jobUpdatedAt),
    [jobQuotes, jobUpdatedAt],
  );

  const load = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setError("");

      if (!forceRefresh) {
        const cached = getCachedQuoteAiCompare(quote.id, jobId, quotesFingerprint);
        if (cached) {
          setResult(cached.result);
          setFromCache(true);
          setCachedAt(cached.cachedAt);
          setLoading(false);
          return;
        }
      } else {
        clearCachedQuoteAiCompare(quote.id);
      }

      setFromCache(false);
      setCachedAt(null);

      try {
        const data = await compareJobQuoteWithAi(quote.id);
        setCachedQuoteAiCompare(quote.id, jobId, quotesFingerprint, data);
        setResult(data);
        setCachedAt(new Date().toISOString());
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Không thể phân tích báo giá bằng AI.";
        setResult(null);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [quote.id, jobId, quotesFingerprint],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
  const t = tUi;
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const analysis = result?.analysis;
  const focusedName = quote.freelancer_name?.trim() || "Freelancer";
  const suggestedId = analysis?.recommendation.suggestedQuoteId;
  const isSuggestedFocused = suggestedId === quote.id;

  return (
    <div className="hire-ai-compare-backdrop" role="presentation" onClick={onClose}>
      <div
        className="hire-ai-compare"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hire-ai-compare-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="hire-ai-compare__head">
          <div className="hire-ai-compare__head-main">
            <h2 id="hire-ai-compare-title" className="hire-ai-compare__title">
              So sánh báo giá — {focusedName}
            </h2>
            {jobTitle ? <p className="hire-ai-compare__subtitle">{jobTitle}</p> : null}
            {fromCache && cachedAt ? (
              <p className="hire-ai-compare__cache-note">
                Đã lưu tạm lúc {formatQuoteAiCacheTime(cachedAt)} — dữ liệu báo giá chưa thay đổi
              </p>
            ) : null}
          </div>
          <button type="button" className="hire-ai-compare__close" onClick={onClose} aria-label={t("Đóng")}>
            <FaTimes aria-hidden />
          </button>
        </header>

        <div className="hire-ai-compare__body">
          {loading ? (
            <div className="hire-ai-compare__loading">
              <AiQuoteSuggestButton onClick={() => {}} loading compact={false} />
              <p className="hire-ai-compare__loading-text">
                AI đang phân tích {totalQuotes ?? "các"} báo giá…
              </p>
              <p className="hire-ai-compare__loading-hint">
                So sánh giá, kinh nghiệm, uy tín và nội dung đề xuất
              </p>
            </div>
          ) : error ? (
            <div className="hire-ai-compare__error">
              <FaExclamationTriangle aria-hidden />
              <p>{error}</p>
              <button type="button" className="hire-ai-compare__retry" onClick={() => void load(false)}>
                Thử lại
              </button>
            </div>
          ) : analysis ? (
            <>
              <section className="hire-ai-compare__summary-card">
                <p className="hire-ai-compare__summary">{analysis.summary}</p>
                <div className="hire-ai-compare__focus-meta">
                  <div className={`hire-ai-compare__score ${scoreTone(analysis.focusedFreelancer.overallScore)}`}>
                    <span className="hire-ai-compare__score-value">
                      {Math.round(analysis.focusedFreelancer.overallScore)}
                    </span>
                    <span className="hire-ai-compare__score-label">{t("Điểm tổng hợp")}</span>
                  </div>
                  <div className="hire-ai-compare__focus-price">
                    <span className="hire-ai-compare__focus-price-label">{t("Báo giá")}</span>
                    <strong>{formatQuoteAmount(quote)}</strong>
                  </div>
                </div>
              </section>

              <div className="hire-ai-compare__grid">
                <section className="hire-ai-compare__panel">
                  <h3 className="hire-ai-compare__panel-title">{t("Điểm mạnh")}</h3>
                  <ul className="hire-ai-compare__list hire-ai-compare__list--positive">
                    {analysis.focusedFreelancer.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section className="hire-ai-compare__panel">
                  <h3 className="hire-ai-compare__panel-title">{t("Cần lưu ý")}</h3>
                  <ul className="hire-ai-compare__list hire-ai-compare__list--negative">
                    {analysis.focusedFreelancer.weaknesses.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <section className="hire-ai-compare__criteria">
                <h3 className="hire-ai-compare__section-title">{t("Bảng so sánh tiêu chí")}</h3>
                <div className="hire-ai-compare__criteria-table" role="table">
                  <div className="hire-ai-compare__criteria-row hire-ai-compare__criteria-row--head" role="row">
                    <span role="columnheader">{t("Tiêu chí")}</span>
                    <span role="columnheader" className="hire-ai-compare__col-freelancer">
                      <span className="hire-ai-compare__f-name hire-ai-compare__f-name--focus">{focusedName}</span>
                    </span>
                    <span role="columnheader" className="hire-ai-compare__col-freelancer">
                      Tốt nhất
                    </span>
                    <span role="columnheader">{t("Đánh giá")}</span>
                  </div>
                  {analysis.criteria.map((row) => (
                    <div key={row.label} className="hire-ai-compare__criteria-row" role="row">
                      <span className="hire-ai-compare__criteria-label" role="cell">
                        {row.label}
                      </span>
                      <span role="cell" className="hire-ai-compare__cell-freelancer">
                        <span className="hire-ai-compare__f-name hire-ai-compare__f-name--focus">{focusedName}</span>
                        <span className="hire-ai-compare__cell-value">{row.focusedValue}</span>
                      </span>
                      <span role="cell" className="hire-ai-compare__cell-freelancer">
                        <span
                          className={`hire-ai-compare__f-name${
                            row.bestFreelancerName === focusedName
                              ? " hire-ai-compare__f-name--focus"
                              : " hire-ai-compare__f-name--best"
                          }`}
                        >
                          {row.bestFreelancerName}
                        </span>
                        <span className="hire-ai-compare__cell-value">{row.bestValue}</span>
                      </span>
                      <span role="cell">
                        <span className={`hire-ai-compare__verdict ${VERDICT_CLASS[row.verdict]}`}>
                          {VERDICT_LABEL[row.verdict]}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {analysis.competitors.length > 0 ? (
                <section className="hire-ai-compare__competitors">
                  <h3 className="hire-ai-compare__section-title">{t("Các ứng viên khác")}</h3>
                  <div className="hire-ai-compare__competitor-grid">
                    {analysis.competitors.map((competitor) => (
                      <article
                        key={competitor.quoteId}
                        className={`hire-ai-compare__competitor${
                          competitor.quoteId === suggestedId ? " hire-ai-compare__competitor--suggested" : ""
                        }`}
                      >
                        <div className="hire-ai-compare__competitor-head">
                          <h4>{competitor.name}</h4>
                          <span className={`hire-ai-compare__score-pill ${scoreTone(competitor.overallScore)}`}>
                            {Math.round(competitor.overallScore)}
                          </span>
                        </div>
                        <p>{competitor.oneLiner}</p>
                        {competitor.quoteId !== quote.id ? (
                          <Link href={`/hire/quotes/${competitor.quoteId}`} className="hire-ai-compare__competitor-link">
                            Xem báo giá
                          </Link>
                        ) : (
                          <span className="hire-ai-compare__competitor-tag">{t("Đang xem")}</span>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              <section
                className={`hire-ai-compare__recommendation${
                  isSuggestedFocused ? " hire-ai-compare__recommendation--match" : ""
                }`}
              >
                <div className="hire-ai-compare__recommendation-head">
                  <FaTrophy aria-hidden />
                  <div>
                    <p className="hire-ai-compare__recommendation-label">{t("Gợi ý lựa chọn")}</p>
                    <h3>{analysis.recommendation.suggestedFreelancerName}</h3>
                  </div>
                  <span className="hire-ai-compare__confidence">
                    {CONFIDENCE_LABEL[analysis.recommendation.confidence]}
                  </span>
                </div>
                <p className="hire-ai-compare__recommendation-reason">{analysis.recommendation.reasoning}</p>
                <ul className="hire-ai-compare__tips">
                  {analysis.recommendation.actionTips.map((tip) => (
                    <li key={tip}>
                      <FaCheckCircle aria-hidden />
                      {tip}
                    </li>
                  ))}
                </ul>
                <div className="hire-ai-compare__recommendation-actions">
                  {suggestedId ? (
                    <button
                      type="button"
                      className="hire-ai-compare__cta"
                      onClick={() => {
                        if (onViewQuote) onViewQuote(suggestedId);
                        else window.location.href = `/hire/quotes/${suggestedId}`;
                      }}
                    >
                      Xem báo giá được gợi ý
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="hire-ai-compare__cta hire-ai-compare__cta--ghost"
                    onClick={() => void load(true)}
                  >
                    Phân tích lại
                  </button>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
