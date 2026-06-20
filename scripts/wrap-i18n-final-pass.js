/** Final pass using proven wrap-i18n-target logic on all target TSX files. */
const fs = require("fs");
const path = require("path");

const viRegex =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;

const TARGETS = ["components/hire", "components/findwork", "components/orders"];

const JSX_ATTRS =
  "aria-label|placeholder|alt|hint|description|summary|heading|text|message|emptyText|confirmText|cancelText|submitText|loadingText|errorTitle|successMessage|lead|subtitle|tagline|caption|tooltip|helperText|footer|header|backLabel|emptyListHint|emptyListMessage|guestMessage|wrongRoleMessage|title";

function collectFiles(target) {
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) return [];
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
  if (/^[@./]|^https?:|^#|^\/|^vlc-|^ea-|^as-|^home-|^hire-|^findwork-/.test(inner)) return true;
  if (/\.(tsx?|css|json|png|jpg|svg|webp)$/.test(inner)) return true;
  return false;
}

function usesFormatLib(content) {
  return /from ["']@\/lib\/format["']/.test(content);
}

function needsFormatVnd(content) {
  return /\bformatVnd\s*\(/.test(content);
}

function needsFormatDate(content) {
  return /\bformatDate\s*\(/.test(content);
}

function needsFormatDateTime(content) {
  return /\bformatDateTime\s*\(/.test(content);
}

function buildHookDestructure(content) {
  const parts = ["t"];
  if (needsFormatVnd(content)) parts.push("formatVnd");
  if (needsFormatDate(content)) parts.push("formatDate");
  if (needsFormatDateTime(content)) parts.push("formatDateTime");
  return `const { ${parts.join(", ")} } = useTranslation();`;
}

function removeFormatImport(content) {
  return content
    .replace(
      /import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/format["'];\s*\n/g,
      (match, imports) => {
        const kept = imports
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s && !["formatVnd", "formatDate", "formatDateTime"].includes(s));
        if (kept.length === 0) return "";
        return `import { ${kept.join(", ")} } from "@/lib/format";\n`;
      },
    )
    .replace(/import\s*\{[^}]*\}\s*from\s*["']@\/lib\/format["'];\s*\n/g, "");
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
      if (depth === 0) return content.slice(braceStart, i + 1);
    }
  }
  return null;
}

function ensureUseTranslation(content) {
  const hookLine = buildHookDestructure(content);
  const needsHook =
    content.includes("t(") ||
    content.includes('{t("') ||
    needsFormatVnd(content) ||
    needsFormatDate(content) ||
    needsFormatDateTime(content);

  if (!needsHook) return content;

  if (!content.includes('from "@/hooks/useTranslation"')) {
    content = ensureUseClient(content);
    const importLine = 'import { useTranslation } from "@/hooks/useTranslation";\n';
    content = content.replace(/^(["']use client["'];?\s*\n)/, `$1${importLine}`);
    if (!content.includes('from "@/hooks/useTranslation"')) {
      content = importLine + content;
    }
  }

  if (usesFormatLib(content)) {
    content = removeFormatImport(content);
  }

  const fnPatterns = [
    /export default function (\w+)[^{]*\{/g,
    /export function (\w+)[^{]*\{/g,
    /^function (\w+)\([^)]*\)[^{]*\{/gm,
  ];

  for (const re of fnPatterns) {
    let match;
    const replacements = [];
    while ((match = re.exec(content)) !== null) {
      const fnStart = match.index + match[0].length;
      const bodySlice = content.slice(fnStart, fnStart + 400);
      if (/^\s*const\s*\{[^}]+\}\s*=\s*useTranslation\(\)/.test(bodySlice)) continue;

      const fnBody = extractFunctionBody(content, match.index);
      if (
        !fnBody ||
        (!fnBody.includes("t(") &&
          !fnBody.includes('{t("') &&
          !fnBody.includes("formatVnd(") &&
          !fnBody.includes("formatDate(") &&
          !fnBody.includes("formatDateTime("))
      ) {
        continue;
      }

      replacements.push({ index: fnStart });
    }

    for (let i = replacements.length - 1; i >= 0; i--) {
      const { index } = replacements[i];
      content = content.slice(0, index) + `\n  ${hookLine}\n` + content.slice(index);
    }
  }

  return content;
}

function wrapFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  if (!hasVi(content)) return false;

  const original = content;

  const attrRe = new RegExp(`\\b(${JSX_ATTRS})="([^"\\\\]|\\\\.)*"`, "g");
  content = content.replace(attrRe, (match, prop, inner) => {
    if (shouldSkipString(inner)) return match;
    if (match.includes("{t(")) return match;
    return `${prop}={t("${escapeForJs(inner)}")}`;
  });

  content = content.replace(/\blabel="([^"\\]|\\.)*"/g, (match, inner) => {
    if (shouldSkipString(inner)) return match;
    if (match.includes("{t(")) return match;
    return `label={t("${escapeForJs(inner)}")}`;
  });

  content = content.replace(
    /\b(setError|setMessage|setFeedback|setSuccess|setWarning|setInfo|setStepError|setLoadError|setSubmitError|setActionError|setQuoteError|setJobError|setFormError|setVerifyError|setSaveError|setUploadError|setProposalError|setReviewError|setDisputeError|setRefundError|setCancelError|setEscrowError|setDeadlineError|setCompareError|setAiError|setFavoriteError|setLikeError|setSearchError|setPageError|setDetailError|setListError|setGateError|setNotice|setBannerMessage|setConfirmMessage|setValidationError|setInlineError|setNoticeMessage|setHint|setNoticeText|setAlertMessage|setFetchError|setUpdateError|setDeleteError|setCreateError|setSendError|setReplyError|setThreadError|setWorkflowError|setOrderError|setContractError|setMilestoneError|setDeliveryError|setCompletionError|setSelectionError|setExecutionError|setResolutionError|setProgressError|setHistoryError|setSettlementError|setFundError|setAcceptanceError|setOpenError|setCloseError|setRatingError|setReleaseError|setRejectError|setAcceptError|setSubmitFeedback|setLocalError|setApiError|setUiError|setGlobalError|setFieldError|setModalError|setPanelError|setAnalysisError|alert|confirm|window\\.alert|window\\.confirm|window\\.prompt)\(\s*\{?\s*(?:message:\s*)?["']([^"\\\\]|\\\\.)*["']/g,
    (match, fn, inner) => {
      if (shouldSkipString(inner)) return match;
      if (match.includes("t(")) return match;
      return match
        .replace(`"${inner}"`, `t("${escapeForJs(inner)}")`)
        .replace(`'${inner}'`, `t("${escapeForJs(inner)}")`);
    },
  );

  content = content.replace(
    /\b(setError|setMessage|setFeedback|setSuccess|setWarning|setInfo|setStepError|alert|confirm)\(\s*`([^`$\\]|\\.)*`/g,
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

  content = content.replace(/\|\|\s*"([^"\\]|\\.)*"/g, (match, inner) => {
    if (shouldSkipString(inner)) return match;
    if (match.includes("t(")) return match;
    return `|| t("${escapeForJs(inner)}")`;
  });

  content = content.replace(
    /\b(?<![-\w])(label|title|closeLabel|backLabel|text|message|hint|description|placeholder|emptyText|confirmText|cancelText|submitText|loadingText|errorTitle|successMessage|lead|subtitle|tagline|caption|tooltip|helperText|footer|header|guestMessage|wrongRoleMessage|emptyListHint|emptyListMessage|clientHint|freelancerHint|verdictLabel|confidenceLabel)\s*:\s*"([^"\\]|\\.)*"/g,
    (match, key, inner) => {
      if (shouldSkipString(inner)) return match;
      if (match.includes("t(")) return match;
      return `${key}: t("${escapeForJs(inner)}")`;
    },
  );

  content = content.replace(/>([^<>{}]+)</g, (match, text) => {
    const trimmed = text.trim();
    if (!trimmed || !hasVi(trimmed)) return match;
    if (trimmed.startsWith("{")) return match;
    if (trimmed.includes("t(")) return match;
    const leading = text.match(/^\s*/)[0];
    const trailing = text.match(/\s*$/)[0];
    return `>${leading}{t("${escapeForJs(trimmed)}")}${trailing}<`;
  });

  if (content === original && !usesFormatLib(content)) return false;

  content = ensureUseTranslation(content);
  if (content === original) return false;

  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

let count = 0;
for (const target of TARGETS) {
  for (const file of collectFiles(target)) {
    if (wrapFile(file)) {
      count++;
      console.log("Updated:", path.relative(process.cwd(), file).replace(/\\/g, "/"));
    }
  }
}
console.log("Final pass updated", count, "files.");
