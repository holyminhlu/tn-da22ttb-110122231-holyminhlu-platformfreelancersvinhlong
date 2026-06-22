"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { useTranslation } from "@/hooks/useTranslation";
import type { HelpFaqItem } from "./help-faq-data";

function FaqAnswer({ item }: { item: HelpFaqItem }) {
  const { t } = useTranslation();
  const paragraphs = Array.isArray(item.answer) ? item.answer : [item.answer];

  return (
    <div className="help-faq__answer">
      {paragraphs.map((para) => (
        <p key={para.slice(0, 40)}>{t(para)}</p>
      ))}
      {item.links?.length ? (
        <p className="help-faq__links">
          {item.links.map((link) => (
            <Link key={link.href} href={link.href} className="help-faq__link">
              {t(link.label)}
            </Link>
          ))}
        </p>
      ) : null}
    </div>
  );
}

type HelpFaqAccordionProps = {
  item: HelpFaqItem;
  defaultOpen?: boolean;
  categoryLabel?: string;
};

export default function HelpFaqAccordion({
  item,
  defaultOpen = false,
  categoryLabel,
}: HelpFaqAccordionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const buttonId = useId();

  return (
    <article className={`help-faq${open ? " help-faq--open" : ""}`}>
      <button
        id={buttonId}
        type="button"
        className="help-faq__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="help-faq__question-wrap">
          {categoryLabel ? (
            <span className="help-faq__category-tag">{t(categoryLabel)}</span>
          ) : null}
          <span className="help-faq__question">{t(item.question)}</span>
        </span>
        <FaChevronDown className="help-faq__chevron" aria-hidden />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="help-faq__panel"
        hidden={!open}
      >
        <FaqAnswer item={item} />
      </div>
    </article>
  );
}
