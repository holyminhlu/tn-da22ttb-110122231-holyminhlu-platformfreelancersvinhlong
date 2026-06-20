/**
 * Second pass: wrap remaining Vietnamese strings in target TSX files.
 * Run: node scripts/wrap-i18n-target-second-pass.js
 */
const fs = require("fs");
const path = require("path");

const viRegex =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;

const TARGETS = [
  "components/services",
  "components/payments",
  "components/admin",
  "components/profile",
  "components/jobs",
  "components/chat",
  "components/notifications",
  "components/support/VlcAiSupportWidget.tsx",
  "components/help",
  "components/about/AboutPageContent.tsx",
  "components/how-vlc-works/HowVlcWorksContent.tsx",
  "components/why-vlc/WhyVlcContent.tsx",
  "components/enterprise/EnterpriseContent.tsx",
];

const JSX_ATTRS =
  "aria-label|placeholder|alt|hint|description|summary|heading|text|message|emptyText|confirmText|cancelText|submitText|loadingText|errorTitle|successMessage|lead|subtitle|tagline|caption|tooltip|helperText|footer|header|backLabel|emptyListHint|emptyListMessage|guestMessage|wrongRoleMessage|title|name";

const SET_STATE_FNS =
  "setError|setMessage|setFeedback|setSuccess|setWarning|setInfo|setStepError|setLoadError|setSubmitError|setActionError|setQuoteError|setJobError|setFormError|setVerifyError|setSaveError|setUploadError|setProposalError|setReviewError|setDisputeError|setRefundError|setCancelError|setEscrowError|setDeadlineError|setCompareError|setAiError|setFavoriteError|setLikeError|setSearchError|setPageError|setDetailError|setListError|setGateError|setNotice|setBannerMessage|setConfirmMessage|setValidationError|setInlineError|setNoticeMessage|setHint|setNoticeText|setAlertMessage|setFetchError|setUpdateError|setDeleteError|setCreateError|setSendError|setReplyError|setThreadError|setWorkflowError|setOrderError|setContractError|setMilestoneError|setDeliveryError|setCompletionError|setSelectionError|setExecutionError|setResolutionError|setProgressError|setHistoryError|setSettlementError|setFundError|setAcceptanceError|setOpenError|setCloseError|setRatingError|setReleaseError|setRejectError|setAcceptError|setSubmitFeedback|setLocalError|setApiError|setUiError|setGlobalError|setFieldError|setModalError|setPanelError|setAnalysisError|setResolveError|setDownloadFeedback|setNotifFeedback|showNotifFeedback|setToast|alert|confirm|window\\.alert|window\\.confirm|window\\.prompt";

const OBJ_KEYS =
  "label|title|closeLabel|backLabel|text|message|hint|description|placeholder|emptyText|confirmText|cancelText|submitText|loadingText|errorTitle|successMessage|lead|subtitle|tagline|caption|tooltip|helperText|footer|header|guestMessage|wrongRoleMessage|emptyListHint|emptyListMessage|clientHint|freelancerHint|verdictLabel|confidenceLabel|name|heading|summary";

function collectFiles(target) {
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) return [];
  if (abs.endsWith(".tsx")) return [abs];
  const files = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith(".tsx")) files.push(p);
    }
  }
  walk(abs);
  return files;
}

function hasVi(text) {
  return viRegex.test(text);
}

function escapeForJs(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function shouldSkipString(inner) {
  if (!hasVi(inner)) return true;
  if (inner.includes("${")) return true;
  if (/^[@./]|^https?:|^#|^\/|^vlc-|^ea-|^as-|^home-|^hire-|^findwork-|^admin-/.test(inner)) return true;
  if (/\.(tsx?|css|json|png|jpg|svg|webp)$/.test(inner)) return true;
  if (/err\.message|error\.message/.test(inner)) return true;
  if (inner.length < 2) return true;
  return false;
}

function usesFormatLib(content) {
  return /from ["']@\/lib\/format["']/.test(content);
}

function removeFormatImport(content) {
  return content
    .replace(
      /import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/format["'];\s*\n/g,
      (match, imports) => {
        const kept = imports
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s && !["formatVnd", "formatDate", "formatDateTime", "formatCompactVnd"].includes(s));
        if (kept.length === 0) return "";
        return `import { ${kept.join(", ")} } from "@/lib/format";\n`;
      },
    )
    .replace(/import\s*\{[^}]*\}\s*from\s*["']@\/lib\/format["'];\s*\n/g, "");
}

function buildHookDestructure(content) {
  const parts = ["t"];
  if (/\bformatVnd\s*\(/.test(content)) parts.push("formatVnd");
  if (/\bformatDate\s*\(/.test(content)) parts.push("formatDate");
  if (/\bformatDateTime\s*\(/.test(content)) parts.push("formatDateTime");
  if (/\bformatCompactVnd\s*\(/.test(content)) parts.push("formatCompactVnd");
  if (/\bformatNum\s*\(/.test(content)) parts.push("formatNum");
  return `const { ${parts.join(", ")} } = useTranslation();`;
}

function ensureUseClient(content) {
  if (content.startsWith('"use client"') || content.startsWith("'use client'")) return content;
  return `"use client";\n\n${content}`;
}

function extractFunctionBody(content, fnIndex) {
  const braceStart = content.indexOf("{", fnIndex);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) return { body: content.slice(braceStart, i + 1), bodyStart: braceStart + 1 };
    }
  }
  return null;
}

function functionNeedsI18n(body) {
  return (
    body.includes("t(") ||
    body.includes('{t("') ||
    body.includes("formatVnd(") ||
    body.includes("formatDate(") ||
    body.includes("formatDateTime(")
  );
}

function ensureUseTranslation(content) {
  if (!content.includes('from "@/hooks/useTranslation"')) {
    content = ensureUseClient(content);
    const importLine = 'import { useTranslation } from "@/hooks/useTranslation";\n';
    if (/^["']use client["']/.test(content)) {
      content = content.replace(/^(["']use client["'];?\s*\n)/, `$1${importLine}`);
    } else {
      content = importLine + content;
    }
  }

  if (usesFormatLib(content)) {
    content = removeFormatImport(content);
  }

  const fnRe = /(?:export default function|export function|function)\s+\w+[^{]*\{/g;
  const insertions = [];
  let match;
  while ((match = fnRe.exec(content)) !== null) {
    const info = extractFunctionBody(content, match.index);
    if (!info) continue;
    const inner = info.body.slice(1, -1);
    if (!functionNeedsI18n(inner)) continue;
    if (/^\s*const\s*\{[^}]+\}\s*=\s*useTranslation\(\)/.test(inner.slice(0, 500))) continue;
    insertions.push({ bodyStart: info.bodyStart, hook: buildHookDestructure(inner) });
  }

  for (let i = insertions.length - 1; i >= 0; i--) {
    const { bodyStart, hook } = insertions[i];
    content = content.slice(0, bodyStart) + `\n  ${hook}\n` + content.slice(bodyStart);
  }

  return content;
}

function wrapFunctionBodyInner(inner) {
  let result = inner;

  result = result.replace(
    new RegExp(
      `\\b(${SET_STATE_FNS})\\(\\s*\\{?\\s*(?:message:\\s*)?["']([^"\\\\]|\\\\.)*["']`,
      "g",
    ),
    (match, fn, quotedInner) => {
      const inner = quotedInner;
      if (shouldSkipString(inner)) return match;
      if (match.includes("t(")) return match;
      return match
        .replace(`"${inner}"`, `t("${escapeForJs(inner)}")`)
        .replace(`'${inner}'`, `t("${escapeForJs(inner)}")`);
    },
  );

  result = result.replace(
    new RegExp(`\\b(${SET_STATE_FNS})\\(\\s*\`([^\`$\\\\]|\\\\.)*\``, "g"),
    (match, fn, inner) => {
      if (!hasVi(inner)) return match;
      if (inner.includes("${")) {
        const parts = inner.split(/(\$\{[^}]+\})/);
        const wrapped = parts
          .map((part) => {
            if (part.startsWith("${")) return part;
            if (!hasVi(part) || !part) return part;
            return `\${t("${escapeForJs(part)}")}`;
          })
          .join("");
        return `${fn}(\`${wrapped}\`)`;
      }
      if (match.includes("t(")) return match;
      return `${fn}(t("${escapeForJs(inner)}"))`;
    },
  );

  result = result.replace(/\|\|\s*"([^"\\]|\\.)*"/g, (match, inner) => {
    if (shouldSkipString(inner)) return match;
    if (match.includes("t(")) return match;
    return `|| t("${escapeForJs(inner)}")`;
  });

  result = result.replace(
    new RegExp(`\\b(${OBJ_KEYS})\\s*:\\s*"([^"\\\\]|\\\\.)*"`, "g"),
    (match, key, inner) => {
      if (shouldSkipString(inner)) return match;
      if (match.includes("t(")) return match;
      return `${key}: t("${escapeForJs(inner)}")`;
    },
  );

  result = result.replace(
    /(?:^|\s|[(,{])("([^"\\]|\\.)*")/gm,
    (match, quoted, inner) => {
      if (shouldSkipString(inner)) return match;
      if (match.includes("t(")) return match;
      const idx = result.indexOf(match);
      const before = result.slice(Math.max(0, idx - 8), idx);
      if (/t\s*\($/.test(before.trim())) return match;
      return match.replace(quoted, `t("${escapeForJs(inner)}")`);
    },
  );

  return result;
}

function wrapRegion(content) {
  let result = content;

  const attrRe = new RegExp(`\\b(${JSX_ATTRS})="([^"\\\\]|\\\\.)*"`, "g");
  result = result.replace(attrRe, (match, prop, inner) => {
    if (shouldSkipString(inner)) return match;
    if (match.includes("{t(")) return match;
    return `${prop}={t("${escapeForJs(inner)}")}`;
  });

  result = result.replace(/\blabel="([^"\\]|\\.)*"/g, (match, inner) => {
    if (shouldSkipString(inner)) return match;
    if (match.includes("{t(")) return match;
    return `label={t("${escapeForJs(inner)}")}`;
  });

  const fnRe = /(?:export default function|export function|function)\s+\w+[^{]*\{/g;
  const replacements = [];
  let match;
  while ((match = fnRe.exec(result)) !== null) {
    const info = extractFunctionBody(result, match.index);
    if (!info) continue;
    const inner = info.body.slice(1, -1);
    const wrappedInner = wrapFunctionBodyInner(inner);
    if (wrappedInner !== inner) {
      replacements.push({
        start: info.bodyStart,
        end: info.bodyStart + inner.length,
        wrappedInner,
      });
    }
  }

  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, wrappedInner } = replacements[i];
    result = result.slice(0, start) + wrappedInner + result.slice(end);
  }

  result = result.replace(/>([^<>{}]+)</g, (match, text) => {
    const trimmed = text.trim();
    if (!trimmed || !hasVi(trimmed)) return match;
    if (trimmed.startsWith("{")) return match;
    if (trimmed.includes("t(")) return match;
    const leading = text.match(/^\s*/)[0];
    const trailing = text.match(/\s*$/)[0];
    return `>${leading}{t("${escapeForJs(trimmed)}")}${trailing}<`;
  });

  result = result.replace(
    /\{([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)+)\}/g,
    (match, expr) => {
      if (match.includes("t(")) return match;
      if (
        !/\.(label|title|text|message|hint|description|placeholder|name|heading|summary|subtitle|tagline|caption|emptyText|confirmText|cancelText|submitText|loadingText|closeLabel|backLabel)$/.test(
          expr,
        )
      ) {
        return match;
      }
      return `{t(${expr})}`;
    },
  );

  return result;
}

function wrapFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  if (!hasVi(content)) return false;

  const original = content;
  content = wrapRegion(content);

  if (content === original && !usesFormatLib(content)) return false;

  content = ensureUseTranslation(content);
  if (content === original) return false;

  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

let count = 0;
const allFiles = new Set();
for (const target of TARGETS) {
  for (const file of collectFiles(target)) allFiles.add(file);
}

for (const file of allFiles) {
  if (wrapFile(file)) {
    count++;
    console.log("Updated:", path.relative(process.cwd(), file).replace(/\\/g, "/"));
  }
}
console.log("Second pass updated", count, "files.");
