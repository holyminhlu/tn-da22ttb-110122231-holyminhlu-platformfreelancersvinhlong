/** Second pass: wrap remaining Vietnamese strings in files that already have useTranslation. */
const fs = require("fs");
const path = require("path");

const viRegex =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;

const TARGETS = ["components/hire", "components/findwork", "components/orders"];

const JSX_ATTRS =
  "aria-label|placeholder|alt|hint|description|summary|heading|text|message|emptyText|confirmText|cancelText|submitText|loadingText|errorTitle|successMessage|lead|subtitle|tagline|caption|tooltip|helperText|footer|header|backLabel|emptyListHint|emptyListMessage|guestMessage|wrongRoleMessage|title";

const SET_STATE_FNS =
  "setError|setMessage|setFeedback|setSuccess|setWarning|setInfo|setStepError|setLoadError|setSubmitError|setActionError|setQuoteError|setJobError|setFormError|setVerifyError|setSaveError|setUploadError|setProposalError|setReviewError|setDisputeError|setRefundError|setCancelError|setEscrowError|setDeadlineError|setCompareError|setAiError|setFavoriteError|setLikeError|setSearchError|setPageError|setDetailError|setListError|setGateError|setNotice|setBannerMessage|setConfirmMessage|setValidationError|setInlineError|setNoticeMessage|setHint|setNoticeText|setAlertMessage|setFetchError|setUpdateError|setDeleteError|setCreateError|setSendError|setReplyError|setThreadError|setWorkflowError|setOrderError|setContractError|setMilestoneError|setDeliveryError|setCompletionError|setSelectionError|setExecutionError|setResolutionError|setProgressError|setHistoryError|setSettlementError|setFundError|setAcceptanceError|setOpenError|setCloseError|setRatingError|setReleaseError|setRejectError|setAcceptError|setSubmitFeedback|setLocalError|setApiError|setUiError|setGlobalError|setFieldError|setModalError|setAnalysisError|alert|confirm|window\\.alert|window\\.confirm|window\\.prompt";

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
  if (/err\.message|error\.message/.test(inner)) return true;
  if (inner.length < 2) return true;
  return false;
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

  result = result.replace(
    new RegExp(
      `\\b(${SET_STATE_FNS})\\(\\s*\\{?\\s*(?:message:\\s*)?["']([^"\\\\]|\\\\.)*["']`,
      "g",
    ),
    (match, fn, inner) => {
      if (shouldSkipString(inner)) return match;
      if (match.includes("t(")) return match;
      return match
        .replace(`"${inner}"`, `t("${escapeForJs(inner)}")`)
        .replace(`'${inner}'`, `t("${escapeForJs(inner)}")`);
    },
  );

  result = result.replace(/\|\|\s*"([^"\\]|\\.)*"/g, (match, inner) => {
    if (shouldSkipString(inner)) return match;
    if (match.includes("t(")) return match;
    return `|| t("${escapeForJs(inner)}")`;
  });

  result = result.replace(
    /\b(?<![-\w])(label|title|closeLabel|backLabel|text|message|hint|description|placeholder|emptyText|confirmText|cancelText|submitText|loadingText|errorTitle|successMessage|lead|subtitle|tagline|caption|tooltip|helperText|footer|header|guestMessage|wrongRoleMessage|emptyListHint|emptyListMessage|clientHint|freelancerHint|verdictLabel|confidenceLabel)\s*:\s*"([^"\\]|\\.)*"/g,
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
      const before = result.slice(Math.max(0, idx - 6), idx);
      if (/t\s*\($/.test(before.trim())) return match;
      return match.replace(quoted, `t("${escapeForJs(inner)}")`);
    },
  );

  result = result.replace(/>([^<>{}]{2,})</g, (match, text) => {
    const trimmed = text.trim();
    if (!hasVi(trimmed)) return match;
    if (trimmed.startsWith("{")) return match;
    if (trimmed.includes("t(")) return match;
    const leading = text.match(/^\s*/)[0];
    const trailing = text.match(/\s*$/)[0];
    return `>${leading}{t("${escapeForJs(trimmed)}")}${trailing}<`;
  });

  return result;
}

function ensureUseClient(content) {
  if (content.startsWith('"use client"') || content.startsWith("'use client'")) return content;
  return `"use client";\n\n${content}`;
}

function ensureImportAndHook(content) {
  if (!content.includes('from "@/hooks/useTranslation"')) {
    content = ensureUseClient(content);
    const importLine = 'import { useTranslation } from "@/hooks/useTranslation";\n';
    if (content.match(/^["']use client["']/)) {
      content = content.replace(/^(["']use client["'];?\s*\n)/, `$1${importLine}`);
    } else {
      content = importLine + content;
    }
  }

  if (!content.includes("useTranslation()")) {
    content = content.replace(
      /(export default function \w+[^{]*\{)(\s*)/,
      `$1\n  const { t } = useTranslation();$2`,
    );
    content = content.replace(
      /(export function \w+[^{]*\{)(\s*)/,
      `$1\n  const { t } = useTranslation();$2`,
    );
    content = content.replace(
      /(^function \w+\([^)]*\)[^{]*\{)(\s*)/m,
      `$1\n  const { t } = useTranslation();$2`,
    );
  }

  return content;
}

let count = 0;
for (const target of TARGETS) {
  for (const file of collectFiles(target)) {
    let content = fs.readFileSync(file, "utf8");
    if (!hasVi(content)) continue;
    const original = content;
    content = wrapRegion(content);
    if (!content.includes("useTranslation()") && content.includes("t(")) {
      content = ensureImportAndHook(content);
    }
    if (content !== original) {
      fs.writeFileSync(file, content, "utf8");
      count++;
      console.log("Updated:", path.relative(process.cwd(), file).replace(/\\/g, "/"));
    }
  }
}
console.log("Second pass updated", count, "files.");
