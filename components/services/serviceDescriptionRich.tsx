"use client";

import { Fragment, type ReactNode } from "react";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textWithLineBreaks(escapedText: string, keyPrefix: () => string): ReactNode[] {
  const lines = escapedText.split("\n");
  const out: ReactNode[] = [];
  lines.forEach((line, i) => {
    if (i > 0) out.push(<br key={`${keyPrefix()}-br`} />);
    out.push(
      <span key={`${keyPrefix()}-ln`} className="inline">
        {line}
      </span>,
    );
  });
  return out;
}

/** **in đậm** + xuống dòng trong từng đoạn (đoạn tách bởi \\n\\n). */
function splitBoldSegments(plain: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let nk = 0;
  const nextKey = () => {
    nk += 1;
    return `sd-${nk}`;
  };
  while ((m = re.exec(plain)) !== null) {
    if (m.index > last) {
      nodes.push(...textWithLineBreaks(escapeHtml(plain.slice(last, m.index)), nextKey));
    }
    nodes.push(
      <strong key={nextKey()} className="font-semibold text-[#18191b]">
        {escapeHtml(m[1])}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < plain.length) {
    nodes.push(...textWithLineBreaks(escapeHtml(plain.slice(last)), nextKey));
  }
  return nodes.length ? nodes : textWithLineBreaks(escapeHtml(plain), nextKey);
}

function formatBlock(block: string): ReactNode {
  const rawLines = block.split("\n");
  const lines = rawLines.map((l) => l.trimEnd());
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  const isBulletBlock =
    nonEmpty.length > 0 && nonEmpty.every((l) => /^[-•]\s+/.test(l.trim()));
  if (isBulletBlock) {
    return (
      <ul className="mb-4 list-disc space-y-1.5 pl-6 text-inherit last:mb-0 marker:text-[#74767E]">
        {nonEmpty.map((line, i) => (
          <li key={i} className="leading-relaxed">
            {splitBoldSegments(line.replace(/^[-•]\s+/, "").trim())}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="mb-4 last:mb-0 leading-relaxed">
      {splitBoldSegments(block)}
    </p>
  );
}

export function ServiceFormattedBody({ text, className }: { text: string; className?: string }) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const blocks = trimmed.split(/\n\n+/);
  return (
    <div className={className}>
      {blocks.map((block, i) => (
        <Fragment key={i}>{formatBlock(block)}</Fragment>
      ))}
    </div>
  );
}

export function insertIntoTextarea(
  el: HTMLTextAreaElement | null,
  value: string,
  setValue: (next: string) => void,
  snippet: string,
): void {
  if (!el) return;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const before = value.slice(0, start);
  const after = value.slice(end);
  const next = before + snippet + after;
  setValue(next);
  const pos = start + snippet.length;
  queueMicrotask(() => {
    el.focus();
    el.setSelectionRange(pos, pos);
  });
}

export function wrapSelectionInTextarea(
  el: HTMLTextAreaElement | null,
  value: string,
  setValue: (next: string) => void,
  wrapBefore: string,
  wrapAfter: string,
  emptySelectionPlaceholder = "văn bản",
): void {
  if (!el) return;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const selected = value.slice(start, end);
  const inner = selected || emptySelectionPlaceholder;
  const wrapped = wrapBefore + inner + wrapAfter;
  const next = value.slice(0, start) + wrapped + value.slice(end);
  setValue(next);
  const selStart = start + wrapBefore.length;
  const selEnd = selStart + inner.length;
  queueMicrotask(() => {
    el.focus();
    el.setSelectionRange(selStart, selEnd);
  });
}
