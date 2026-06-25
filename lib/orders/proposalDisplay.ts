const SECTION_MARKERS = {
  scope: "## Phạm vi & giải pháp",
  timeline: "## Tiến độ dự kiến",
} as const;

const SCOPE_MARKERS = [
  SECTION_MARKERS.scope,
  "## Phạm vi và giải pháp",
] as const;

const TIMELINE_MARKERS = [
  SECTION_MARKERS.timeline,
  "## Thời gian dự kiến",
] as const;

function normalizeProposalText(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

function lineBoundedIndex(raw: string, marker: string) {
  const lines = raw.split("\n");
  let offset = 0;
  for (const line of lines) {
    if (line.trim() === marker.trim()) return offset;
    offset += line.length + 1;
  }
  return -1;
}

function lineLengthAt(raw: string, idx: number) {
  const lineEnd = raw.indexOf("\n", idx);
  return (lineEnd === -1 ? raw.length : lineEnd) - idx;
}

/** Vị trí marker cuối cùng — tránh nhầm với "Tiến độ dự kiến" trong nội dung phạm vi. */
function lastMarkerIndex(raw: string, markers: readonly string[]) {
  let best = -1;
  let bestLen = 0;
  for (const marker of markers) {
    let searchFrom = 0;
    while (searchFrom < raw.length) {
      const sub = raw.slice(searchFrom);
      const rel = lineBoundedIndex(sub, marker);
      if (rel === -1) break;
      const abs = searchFrom + rel;
      if (abs >= best) {
        best = abs;
        bestLen = lineLengthAt(raw, abs);
      }
      searchFrom = abs + 1;
    }
  }
  return { idx: best, markerLen: bestLen };
}

function firstMarkerIndex(raw: string, markers: readonly string[]) {
  let best = -1;
  let bestLen = 0;
  for (const marker of markers) {
    const idx = lineBoundedIndex(raw, marker);
    if (idx === -1) continue;
    if (best === -1 || idx < best) {
      best = idx;
      bestLen = lineLengthAt(raw, idx);
    }
  }
  return { idx: best, markerLen: bestLen };
}

export function parseProposalSections(text: string) {
  const raw = normalizeProposalText(text);
  if (!raw) {
    return { scope: "", timeline: "" };
  }

  const scopeHead = firstMarkerIndex(raw, SCOPE_MARKERS);
  const timelineHead = lastMarkerIndex(raw, TIMELINE_MARKERS);

  if (scopeHead.idx !== -1 && timelineHead.idx !== -1 && timelineHead.idx > scopeHead.idx) {
    return {
      scope: raw
        .slice(scopeHead.idx + scopeHead.markerLen, timelineHead.idx)
        .trim(),
      timeline: raw.slice(timelineHead.idx + timelineHead.markerLen).trim(),
    };
  }

  if (scopeHead.idx !== -1) {
    return {
      scope: raw.slice(scopeHead.idx + scopeHead.markerLen).trim(),
      timeline: "",
    };
  }

  if (timelineHead.idx !== -1) {
    return {
      scope: raw.slice(0, timelineHead.idx).trim(),
      timeline: raw.slice(timelineHead.idx + timelineHead.markerLen).trim(),
    };
  }

  return { scope: raw, timeline: "" };
}

export function parseTimelineDays(timeline: string): number | null {
  const t = timeline.trim();
  if (!t) return null;

  const labeled = t.match(/(\d+)\s*ngày\s*làm\s*việc/i);
  if (labeled) {
    const n = Number(labeled[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  const simple = t.match(/(\d+)\s*ngày/i);
  if (simple) {
    const n = Number(simple[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  return null;
}

export function parseTimelineDaysFromProposalText(text: string): number | null {
  const { timeline } = parseProposalSections(text);
  const fromSection = parseTimelineDays(timeline);
  if (fromSection != null) return fromSection;

  const tailIdx = text.lastIndexOf(SECTION_MARKERS.timeline);
  if (tailIdx !== -1) {
    const fromTail = parseTimelineDays(text.slice(tailIdx));
    if (fromTail != null) return fromTail;
  }

  return null;
}

export function formatDeliveryDays(days: number | null | undefined): string {
  if (days != null && Number.isFinite(days) && days > 0) {
    return `${Math.round(days)} ngày làm việc (dự kiến bàn giao)`;
  }
  return "—";
}

export function formatTimelineDisplay(timeline: string) {
  const days = parseTimelineDays(timeline);
  if (days != null) return formatDeliveryDays(days);
  return timeline.trim() || "—";
}

export function resolveProposalTimelineLabel(
  proposalText: string,
  parsed?: { scope: string; timeline: string },
  deliveryDays?: number | null,
) {
  const fromColumn = formatDeliveryDays(deliveryDays);
  if (fromColumn !== "—") return fromColumn;

  const sections = parsed ?? parseProposalSections(proposalText);
  const fromSection = formatTimelineDisplay(sections.timeline);
  if (fromSection !== "—") return fromSection;

  const fromText = formatDeliveryDays(parseTimelineDaysFromProposalText(proposalText));
  return fromText;
}

/** Preview ngắn cho thẻ đơn — chỉ phần phạm vi. */
export function orderCardProposalScopePreview(text: string | null | undefined): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const { scope } = parseProposalSections(trimmed);
  const source = scope || trimmed;
  return source
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export { SECTION_MARKERS };
