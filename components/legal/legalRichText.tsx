"use client";

import { Fragment, type ReactNode } from "react";
import { useTranslation } from "@/hooks/useTranslation";

const MARKUP_RE = /(\*\*(.+?)\*\*|!!(.+?)!!)/g;

/** Parse **đậm** và !!đậm đỏ!! trong chuỗi đã dịch. */
export function parseLegalMarkup(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = MARKUP_RE.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<Fragment key={key++}>{text.slice(last, match.index)}</Fragment>);
    }
    if (match[2]) {
      nodes.push(
        <strong key={key++} className="legal-strong">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      nodes.push(
        <strong key={key++} className="legal-danger">
          {match[3]}
        </strong>,
      );
    }
    last = MARKUP_RE.lastIndex;
  }

  if (last < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  }

  return nodes.length ? nodes : [text];
}

type LegalRichTextProps = {
  text: string;
};

export default function LegalRichText({ text }: LegalRichTextProps) {
  const { t } = useTranslation();
  return <>{parseLegalMarkup(t(text))}</>;
}
