/**
 * Minimal safe i18n wrap — attrs, setState, object props, || fallbacks only.
 * No JSX text replacer (causes single-char corruption).
 */
const fs = require("fs");
const path = require("path");

const viRegex =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;

const TARGETS = ["components/hire", "components/findwork", "components/orders"];

const JSX_ATTRS =
  "aria-label|placeholder|alt|hint|description|summary|heading|text|message|emptyText|confirmText|cancelText|submitText|loadingText|errorTitle|successMessage|lead|subtitle|tagline|caption|tooltip|helperText|footer|header|backLabel|emptyListHint|emptyListMessage|guestMessage|wrongRoleMessage|title";

const OBJ_PROPS =
  "label|title|closeLabel|backLabel|text|message|hint|description|placeholder|emptyText|confirmText|cancelText|submitText|loadingText|errorTitle|successMessage|lead|subtitle|tagline|caption|tooltip|helperText|footer|header|guestMessage|wrongRoleMessage|emptyListHint|emptyListMessage|clientHint|freelancerHint|verdictLabel|confidenceLabel";

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

function needsFormatVnd(c) {
  return /\bformatVnd\s*\(/.test(c);
}
function needsFormatDate(c) {
  return /\bformatDate\s*\(/.test(c);
}
function needsFormatDateTime(c) {
  return /\bformatDateTime\s*\(/.test(c);
}

function buildHook(c) {
  const p = ["t"];
  if (needsFormatVnd(c)) p.push("formatVnd");
  if (needsFormatDate(c)) p.push("formatDate");
  if (needsFormatDateTime(c)) p.push("formatDateTime");
  return `const { ${p.join(", ")} } = useTranslation();`;
}

function removeFormatImport(content) {
  return content
    .replace(/import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/format["'];\s*\n/g, (_, imports) => {
      const kept = imports
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && !["formatVnd", "formatDate", "formatDateTime"].includes(s));
      return kept.length ? `import { ${kept.join(", ")} } from "@/lib/format";\n` : "";
    })
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
  if (
    !content.includes("t(") &&
    !content.includes('{t("') &&
    !needsFormatVnd(content) &&
    !needsFormatDate(content) &&
    !needsFormatDateTime(content)
  ) {
    return content;
  }

  if (!content.includes('from "@/hooks/useTranslation"')) {
    content = ensureUseClient(content);
    const importLine = 'import { useTranslation } from "@/hooks/useTranslation";\n';
    content = content.replace(/^(["']use client["'];?\s*\n)/, `$1${importLine}`);
    if (!content.includes('from "@/hooks/useTranslation"')) content = importLine + content;
  }

  if (usesFormatLib(content)) content = removeFormatImport(content);

  const hookLine = buildHook(content);
  const fnPatterns = [
    /export default function (\w+)[^{]*\{/g,
    /export function (\w+)[^{]*\{/g,
    /^function (\w+)\([^)]*\)[^{]*\{/gm,
  ];

  for (const re of fnPatterns) {
    let match;
    const inserts = [];
    while ((match = re.exec(content)) !== null) {
      const fnStart = match.index + match[0].length;
      const slice = content.slice(fnStart, fnStart + 300);
      if (/^\s*const\s*\{[^}]+\}\s*=\s*useTranslation\(\)/.test(slice)) continue;
      const body = extractFunctionBody(content, match.index);
      if (
        !body ||
        (!body.includes("t(") &&
          !body.includes('{t("') &&
          !body.includes("formatVnd(") &&
          !body.includes("formatDate(") &&
          !body.includes("formatDateTime("))
      )
        continue;
      inserts.push(fnStart);
    }
    for (let i = inserts.length - 1; i >= 0; i--) {
      content = content.slice(0, inserts[i]) + `\n  ${hookLine}\n` + content.slice(inserts[i]);
    }
  }
  return content;
}

function wrapStrings(content) {
  let r = content;

  r = r.replace(new RegExp(`\\b(${JSX_ATTRS})="((?:[^"\\\\]|\\\\.)*)"`, "g"), (m, prop, inner) => {
    if (shouldSkipString(inner) || m.includes("{t(")) return m;
    return `${prop}={t("${escapeForJs(inner)}")}`;
  });

  r = r.replace(/([\s{])label="((?:[^"\\]|\\.)*)"/g, (m, pre, inner) => {
    if (shouldSkipString(inner) || m.includes("{t(")) return m;
    return `${pre}label={t("${escapeForJs(inner)}")}`;
  });

  r = r.replace(
    /\b(setError|setMessage|setFeedback|setSuccess|setWarning|setInfo|setStepError|setLoadError|setSubmitError|setActionError|setQuoteError|setJobError|setFormError|setVerifyError|setSaveError|setUploadError|setProposalError|setReviewError|setDisputeError|setRefundError|setCancelError|setEscrowError|setDeadlineError|setCompareError|setAiError|setFavoriteError|setLikeError|setSearchError|setPageError|setDetailError|setListError|setGateError|setNotice|setBannerMessage|setConfirmMessage|setValidationError|setInlineError|setNoticeMessage|setHint|setNoticeText|setAlertMessage|setFetchError|setUpdateError|alert|confirm)\(\s*["']((?:[^"\\]|\\.)*)["']/g,
    (m, fn, inner) => {
      if (shouldSkipString(inner) || m.includes("t(")) return m;
      return m.replace(`"${inner}"`, `t("${escapeForJs(inner)}")`).replace(`'${inner}'`, `t("${escapeForJs(inner)}")`);
    },
  );

  r = r.replace(/\|\|\s*"((?:[^"\\]|\\.)*)"/g, (m, inner) => {
    if (shouldSkipString(inner) || m.includes("t(")) return m;
    return `|| t("${escapeForJs(inner)}")`;
  });

  r = r.replace(
    new RegExp(`([,{\\[]\\s*)(${OBJ_PROPS})\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "g"),
    (m, pre, key, inner) => {
      if (shouldSkipString(inner) || m.includes("t(")) return m;
      return `${pre}${key}: t("${escapeForJs(inner)}")`;
    },
  );

  return r;
}


function wrapFile(fp) {
  let c = fs.readFileSync(fp, "utf8");
  if (!hasVi(c) || c.includes('from "@/hooks/useTranslation"')) return false;
  const orig = c;
  c = wrapStrings(c);
  c = ensureUseTranslation(c);
  if (c === orig) return false;
  fs.writeFileSync(fp, c, "utf8");
  return true;
}

let n = 0;
for (const t of TARGETS) {
  for (const f of collectFiles(t)) {
    if (wrapFile(f)) {
      n++;
      console.log("Updated:", path.relative(process.cwd(), f).replace(/\\/g, "/"));
    }
  }
}
console.log("Done.", n, "files.");
