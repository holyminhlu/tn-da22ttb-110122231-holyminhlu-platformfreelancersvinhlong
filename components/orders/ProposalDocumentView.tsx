"use client";

import { useMemo, useState } from "react";
import {
  parseProposalSections,
  resolveProposalTimelineLabel,
} from "@/lib/orders/proposalDisplay";
import ProposalSectionView from "./ProposalSectionView";

type ProposalDocumentViewProps = {
  proposalText: string;
  deliveryDays?: number | null;
};

export default function ProposalDocumentView({
  proposalText,
  deliveryDays,
}: ProposalDocumentViewProps) {
  const parsed = useMemo(() => parseProposalSections(proposalText), [proposalText]);
  const timelineLabel = useMemo(
    () => resolveProposalTimelineLabel(proposalText, parsed, deliveryDays),
    [proposalText, parsed, deliveryDays],
  );
  const [showFull, setShowFull] = useState(false);

  const scopeBody = parsed.scope.trim() || proposalText.trim();

  return (
    <div className="hire-selection__proposal-doc">
      <ProposalSectionView title="Phạm vi & giải pháp" body={scopeBody} />
      {timelineLabel !== "—" ? (
        <ProposalSectionView
          title="Tiến độ dự kiến"
          body={timelineLabel}
          collapsible={false}
        />
      ) : (
        <div className="hire-selection__proposal-block">
          <h4 className="hire-selection__proposal-block-title">Tiến độ dự kiến</h4>
          <p className="hire-selection__proposal-block-body hire-selection__proposal-block-body--muted">
            Chưa có thông tin thời gian trong đề xuất.
          </p>
        </div>
      )}

      <div className="hire-selection__proposal-doc-actions">
        <button
          type="button"
          className="hire-selection__read-more hire-selection__read-more--block"
          onClick={() => setShowFull((value) => !value)}
          aria-expanded={showFull}
        >
          {showFull ? "Thu gọn đề xuất" : "Xem toàn bộ đề xuất"}
        </button>
      </div>

      {showFull ? (
        <div className="hire-selection__proposal-full" role="region" aria-label="Toàn văn đề xuất">
          <pre className="hire-selection__proposal-full-text">{proposalText}</pre>
        </div>
      ) : null}
    </div>
  );
}
