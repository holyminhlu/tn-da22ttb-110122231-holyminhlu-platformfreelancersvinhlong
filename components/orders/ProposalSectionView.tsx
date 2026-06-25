"use client";

import { useMemo, useState } from "react";

const DEFAULT_COLLAPSE_CHARS = 180;

type ProposalSectionViewProps = {
  title: string;
  body: string;
  /** Bật nút xem thêm / thu gọn cho nội dung dài */
  collapsible?: boolean;
  collapseAtChars?: number;
};

export default function ProposalSectionView({
  title,
  body,
  collapsible = true,
  collapseAtChars = DEFAULT_COLLAPSE_CHARS,
}: ProposalSectionViewProps) {
  const trimmed = body.trim();
  const [expanded, setExpanded] = useState(false);

  const needsCollapse = useMemo(
    () => collapsible && trimmed.length > collapseAtChars,
    [collapsible, trimmed, collapseAtChars],
  );

  if (!trimmed) return null;

  return (
    <div className="hire-selection__proposal-block">
      <h4 className="hire-selection__proposal-block-title">{title}</h4>
      <p
        className={`hire-selection__proposal-block-body${
          needsCollapse && !expanded ? " hire-selection__proposal-block-body--clamp" : ""
        }`}
      >
        {trimmed}
      </p>
      {needsCollapse ? (
        <button
          type="button"
          className="hire-selection__read-more"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? "Thu gọn" : "Xem thêm"}
        </button>
      ) : null}
    </div>
  );
}
