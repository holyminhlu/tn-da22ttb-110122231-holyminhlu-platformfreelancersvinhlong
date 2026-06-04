const SECTION_MARKERS = {
  scope: "## Phạm vi & giải pháp",
  timeline: "## Tiến độ dự kiến",
} as const;

export function parseProposalSections(text: string) {
  const raw = text.trim();
  if (!raw) {
    return { scope: "", timeline: "" };
  }
  const parts = raw.split(/\n(?=## )/);
  const find = (marker: string) => {
    const block = parts.find((p) => p.startsWith(marker));
    if (!block) return "";
    return block.replace(marker, "").trim();
  };
  if (!parts.some((p) => p.startsWith("## "))) {
    return { scope: raw, timeline: "" };
  }
  return {
    scope: find(SECTION_MARKERS.scope),
    timeline: find(SECTION_MARKERS.timeline),
  };
}

export function parseTimelineDays(timeline: string): number | null {
  const t = timeline.trim();
  if (!t) return null;
  const match = t.match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatTimelineDisplay(timeline: string) {
  const days = parseTimelineDays(timeline);
  if (days != null) return `${days} ngày làm việc (dự kiến bàn giao)`;
  return timeline.trim() || "—";
}
