"use client";

import { FaExternalLinkAlt, FaRedo, FaUserEdit } from "react-icons/fa";
import type { ProgressHistoryEntry } from "@/lib/api/contracts";
import { formatDate } from "@/lib/format";

type ProgressHistoryTimelineProps = {
  entries: ProgressHistoryEntry[];
  highlightLatest?: boolean;
};

function entryLabel(entry: ProgressHistoryEntry, progressRound: number) {
  if (entry.entry_type === "revision") {
    return "Client yêu cầu chỉnh sửa";
  }
  return `Freelancer cập nhật tiến độ · Lần ${progressRound}`;
}

function actorDisplay(entry: ProgressHistoryEntry) {
  if (entry.actor_name?.trim()) return entry.actor_name.trim();
  if (entry.entry_type === "revision") return "Client";
  return "Freelancer";
}

export default function ProgressHistoryTimeline({
  entries,
  highlightLatest = false,
}: ProgressHistoryTimelineProps) {
  if (!entries.length) return null;

  let progressCount = 0;

  return (
    <section className="hire-execution__history" aria-label="Lịch sử tiến độ và phản hồi">
      <h4 className="hire-execution__history-title">Lịch sử tiến độ &amp; phản hồi</h4>
      <ol className="hire-execution__history-list">
        {entries.map((entry, idx) => {
          const isProgress = entry.entry_type === "progress";
          if (isProgress) progressCount += 1;
          const isLatest = highlightLatest && idx === entries.length - 1;

          return (
            <li
              key={entry.id}
              className={`hire-execution__history-item hire-execution__history-item--${entry.entry_type}${isLatest ? " hire-execution__history-item--latest" : ""}`}
            >
              <div className="hire-execution__history-head">
                <span
                  className={`hire-execution__history-badge hire-execution__history-badge--${entry.entry_type}`}
                  aria-hidden
                >
                  {entry.entry_type === "revision" ? <FaRedo /> : <FaUserEdit />}
                </span>
                <div className="hire-execution__history-meta">
                  <strong className="hire-execution__history-label">
                    {entryLabel(entry, progressCount)}
                  </strong>
                  <span className="hire-execution__history-sub">
                    {actorDisplay(entry)} · {formatDate(entry.created_at)}
                  </span>
                </div>
              </div>
              <p className="hire-execution__history-note">{entry.note}</p>
              {entry.demo_url ? (
                <a
                  href={entry.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hire-execution__demo-link hire-execution__history-demo"
                >
                  {entry.demo_url}
                  <FaExternalLinkAlt aria-hidden />
                </a>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
