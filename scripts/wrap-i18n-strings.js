/**
 * Wraps Vietnamese UI strings in TSX files with t() calls.
 * Run: node scripts/wrap-i18n-strings.js
 */
const fs = require("fs");
const path = require("path");

const viRegex =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;

const SKIP_DIRS = new Set(["node_modules", ".next"]);
const SKIP_FILES = new Set([
  "lib/i18n/messages/en-dictionary.ts",
  "lib/i18n/messages/keyed.ts",
]);
const TARGET_DIRS = ["components", "app"];

const JSX_ATTRS =
  "label|title|placeholder|aria-label|alt|hint|description|summary|heading|text|message|emptyText|confirmText|cancelText|submitText|loadingText|errorTitle|successMessage|lead|subtitle|tagline|caption|tooltip|helperText|footer|header|name|value|children";

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".tsx")) files.push(p);
  }
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
  if (/^[@./]|^https?:|^#|^\/|^vlc-|^ea-|^as-|^home-|^hire-/.test(inner)) return true;
  if (/\.(tsx?|css|json|png|jpg|svg|webp)$/.test(inner)) return true;
  return false;
}

function ensureUseTranslation(content) {
  if (!content.includes('from "@/hooks/useTranslation"')) {
    const useClient = content.startsWith('"use client"') || content.startsWith("'use client'");
    const importLine = 'import { useTranslation } from "@/hooks/useTranslation";\n';
    if (useClient) {
      content = content.replace(/^(["']use client["'];?\s*\n)/, `$1${importLine}`);
    } else {
      content = `${importLine}${content}`;
    }
  }

  if (!content.includes("useTranslation()")) {
    const fnMatch = content.match(/export default function (\w+)/);
    if (fnMatch) {
      content = content.replace(
        new RegExp(`export default function ${fnMatch[1]}[^{]*\\{`),
        (m) => `${m}\n  const { t } = useTranslation();`,
      );
    } else {
      content = content.replace(
        /(function \w+\([^)]*\)[^{]*\{)(\s)/,
        "$1\n  const { t } = useTranslation();$2",
      );
    }
  }
  return content;
}

function wrapFile(filePath) {
  const rel = filePath.replace(/\\/g, "/");
  if ([...SKIP_FILES].some((s) => rel.endsWith(s))) return false;

  let content = fs.readFileSync(filePath, "utf8");
  if (!hasVi(content)) return false;

  const original = content;

  // JSX attributes: prop="text"
  const attrRe = new RegExp(`\\b(${JSX_ATTRS})="([^"\\\\]|\\\\.)*"`, "g");
  content = content.replace(attrRe, (match, prop, inner) => {
    if (shouldSkipString(inner)) return match;
    return `${prop}={t("${escapeForJs(inner)}")}`;
  });

  // Common UI function calls: setError("..."), alert("..."), confirm("...")
  content = content.replace(
    /\b(setError|setMessage|setFeedback|setSuccess|setWarning|setInfo|setDownloadFeedback|setNotifFeedback|showNotifFeedback|alert|confirm)\(\s*"([^"\\]|\\.)*"\s*\)/g,
    (match, fn, inner) => {
      if (shouldSkipString(inner)) return match;
      return `${fn}(t("${escapeForJs(inner)}"))`;
    },
  );

  // JSX text nodes
  content = content.replace(/>([^<>{}]+)</g, (match, text) => {
    const trimmed = text.trim();
    if (!trimmed || !hasVi(trimmed)) return match;
    if (trimmed.startsWith("{")) return match;
    const leading = text.match(/^\s*/)[0];
    const trailing = text.match(/\s*$/)[0];
    return `>${leading}{t("${escapeForJs(trimmed)}")}${trailing}<`;
  });

  if (content === original) return false;

  content = ensureUseTranslation(content);
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

let count = 0;
for (const dir of TARGET_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    if (wrapFile(file)) {
      count++;
    }
  }
}
console.log("Done. Updated", count, "files.");
