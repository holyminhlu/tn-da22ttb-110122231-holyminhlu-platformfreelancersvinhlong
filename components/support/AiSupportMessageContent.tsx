import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { Fragment, type ReactNode } from "react";
import {
  FaCheckCircle,
  FaChevronRight,
  FaExclamationTriangle,
  FaInfoCircle,
  FaLightbulb,
} from "react-icons/fa";

type Block =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "warning"; text: string }
  | { type: "noted"; variant: "tip" | "info" | "success"; text: string };

const WARNING_PREFIX =
  /^(?:⚠️?|\[!+\]|\[caution\]|\[warning\])\s*|^(?:cảnh\s*báo|lưu\s*ý|chú\s*ý|quan\s*trọng)\s*[:\-–]\s*/iu;
const TIP_PREFIX =
  /^(?:💡|\[tip\])\s*|^(?:mẹo|gợi\s*ý|khuyên)\s*[:\-–]\s*/iu;
const INFO_PREFIX =
  /^(?:ℹ️?|\[info\])\s*|^(?:thông\s*tin)\s*[:\-–]\s*/iu;
const SUCCESS_PREFIX =
  /^(?:✅?|\[ok\]|\[success\])\s*|^(?:thành\s*công|hoàn\s*tất)\s*[:\-–]\s*/iu;

function stripPrefix(text: string, prefix: RegExp): string {
  return text.replace(prefix, "").trim();
}

function classifyNotedLine(line: string): Block | null {
  if (TIP_PREFIX.test(line)) {
    return { type: "noted", variant: "tip", text: stripPrefix(line, TIP_PREFIX) };
  }
  if (INFO_PREFIX.test(line)) {
    return { type: "noted", variant: "info", text: stripPrefix(line, INFO_PREFIX) };
  }
  if (SUCCESS_PREFIX.test(line)) {
    return { type: "noted", variant: "success", text: stripPrefix(line, SUCCESS_PREFIX) };
  }
  return null;
}

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);

    if (bulletMatch || orderedMatch) {
      const ordered = Boolean(orderedMatch);
      const items: string[] = [];

      while (index < lines.length) {
        const current = lines[index].trim();
        const bullet = current.match(/^[-*•]\s+(.+)$/);
        const orderedItem = current.match(/^\d+[.)]\s+(.+)$/);

        if (ordered && orderedItem) {
          items.push(orderedItem[1]);
          index += 1;
          continue;
        }
        if (!ordered && bullet) {
          items.push(bullet[1]);
          index += 1;
          continue;
        }
        break;
      }

      blocks.push({ type: "list", ordered, items });
      continue;
    }

    if (WARNING_PREFIX.test(line)) {
      blocks.push({ type: "warning", text: stripPrefix(line, WARNING_PREFIX) });
      index += 1;
      continue;
    }

    const noted = classifyNotedLine(line);
    if (noted) {
      blocks.push(noted);
      index += 1;
      continue;
    }

    const paragraphLines: string[] = [line];
    index += 1;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (
        !next ||
        /^[-*•]\s+/.test(next) ||
        /^\d+[.)]\s+/.test(next) ||
        WARNING_PREFIX.test(next) ||
        classifyNotedLine(next)
      ) {
        break;
      }

      paragraphLines.push(next);
      index += 1;
    }

    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t-${partIndex}`}>
          {text.slice(lastIndex, match.index)}
        </Fragment>,
      );
      partIndex += 1;
    }

    const token = match[0];
    if (token.startsWith("***") && token.endsWith("***")) {
      nodes.push(
        <strong
          key={`${keyPrefix}-a-${partIndex}`}
          className="vlc-ai-support__strong vlc-ai-support__strong--accent"
        >
          {token.slice(3, -3)}
        </strong>,
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${partIndex}`} className="vlc-ai-support__strong">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={`${keyPrefix}-l-${partIndex}`}
            href={linkMatch[2]}
            className="vlc-ai-support__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(
          <Fragment key={`${keyPrefix}-u-${partIndex}`}>{token}</Fragment>,
        );
      }
    }

    partIndex += 1;
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <Fragment key={`${keyPrefix}-tail`}>{text.slice(lastIndex)}</Fragment>,
    );
  }

  return nodes.length > 0 ? nodes : [text];
}

const NOTED_ICONS = {
  tip: FaLightbulb,
  info: FaInfoCircle,
  success: FaCheckCircle,
} as const;

function NotedLine({ variant, text }: { variant: "tip" | "info" | "success"; text: string }) {
  const Icon = NOTED_ICONS[variant];

  return (
    <p className={`vlc-ai-support__noted vlc-ai-support__noted--${variant}`}>
      <span className={`vlc-ai-support__noted-icon vlc-ai-support__noted-icon--${variant}`} aria-hidden>
        <Icon />
      </span>
      <span className="vlc-ai-support__noted-text">{renderInline(text, `noted-${variant}`)}</span>
    </p>
  );
}

function WarningCallout({ text }: { text: string }) {
  return (
    <div className="vlc-ai-support__callout vlc-ai-support__callout--warning" role="note">
      <span className="vlc-ai-support__callout-icon" aria-hidden>
        <FaExclamationTriangle />
      </span>
      <p className="vlc-ai-support__callout-text">
        {renderInline(text, "callout-warning")}
      </p>
    </div>
  );
}

type AiSupportMessageContentProps = {
  content: string;
};

export default function AiSupportMessageContent({
  content,
}: AiSupportMessageContentProps) {
  const { t } = useTranslation();

  const blocks = parseBlocks(content);

  if (blocks.length === 0) {
    return <>{renderInline(content, "fallback")}</>;
  }

  return (
    <div className="vlc-ai-support__rich">
      {blocks.map((block, index) => {
        if (block.type === "list") {
          if (block.ordered) {
            return (
              <ol
                key={`list-${index}`}
                className="vlc-ai-support__list vlc-ai-support__list--ordered"
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`item-${index}-${itemIndex}`}>
                    {renderInline(item, `list-${index}-${itemIndex}`)}
                  </li>
                ))}
              </ol>
            );
          }

          return (
            <ul key={`list-${index}`} className="vlc-ai-support__list">
              {block.items.map((item, itemIndex) => (
                <li key={`item-${index}-${itemIndex}`} className="vlc-ai-support__list-item">
                  <FaChevronRight className="vlc-ai-support__list-icon" aria-hidden />
                  <span>{renderInline(item, `list-${index}-${itemIndex}`)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "warning") {
          return <WarningCallout key={`warn-${index}`} text={block.text} />;
        }

        if (block.type === "noted") {
          return (
            <NotedLine key={`noted-${index}`} variant={block.variant} text={block.text} />
          );
        }

        return (
          <p key={`p-${index}`} className="vlc-ai-support__paragraph">
            {renderInline(block.text, `p-${index}`)}
          </p>
        );
      })}
    </div>
  );
}
