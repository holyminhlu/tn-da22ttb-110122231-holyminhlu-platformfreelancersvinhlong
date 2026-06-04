"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import {
  getMyJobQuote,
  patchJobQuote,
  type JobQuoteRow,
  type PatchJobQuoteAction,
} from "@/lib/api/jobQuotes";
import HireQuoteDetailView from "./HireQuoteDetailView";
import HireShell from "./HireShell";
import "./hire.css";

export default function ClientHireQuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = typeof params.quoteId === "string" ? params.quoteId : "";

  const [quote, setQuote] = useState<JobQuoteRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!quoteId) {
      setError("Không tìm thấy báo giá.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const row = await getMyJobQuote(quoteId);
      if (!row) {
        setError("Báo giá không tồn tại hoặc bạn không có quyền xem.");
        setQuote(null);
        return;
      }
      setQuote(row);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải chi tiết báo giá.";
      setError(message);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleQuoteAction(action: PatchJobQuoteAction) {
    if (!quote) return;
    setActionError("");
    setBusy(true);
    try {
      const result = await patchJobQuote(quote.id, action);
      if (action === "accept" && result.contract?.id) {
        router.push(`/hire/orders/${result.contract.id}`);
        return;
      }
      await load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể cập nhật báo giá.";
      setActionError(message);
    } finally {
      setBusy(false);
    }
  }

  const backHref = "/hire/quotes";

  return (
    <HireShell>
      <div className="hire-page hire-quotes hire-quotes--full-width hire-quote-detail-page">
        <Link href={backHref} className="hire-favorites__empty-link hire-quote-detail-page__back">
          <FaArrowLeft aria-hidden />
          Quay lại danh sách báo giá
        </Link>

        {loading ? (
          <p className="hire-page__state">Đang tải chi tiết báo giá...</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : quote ? (
          <HireQuoteDetailView
            quote={quote}
            busy={busy}
            actionError={actionError}
            onShortlist={() => void handleQuoteAction("shortlist")}
            onInterview={() => void handleQuoteAction("interview")}
            onOffer={() => void handleQuoteAction("offer")}
            onAccept={() => void handleQuoteAction("accept")}
            onDecline={() => void handleQuoteAction("decline")}
          />
        ) : null}
      </div>
    </HireShell>
  );
}
