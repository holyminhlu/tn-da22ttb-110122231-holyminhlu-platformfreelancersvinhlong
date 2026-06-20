/**
 * Wraps Vietnamese UI strings in specific TSX files with t() calls (conservative).
 * Run: node scripts/wrap-i18n-target.js
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
  "label|title|placeholder|aria-label|alt|hint|description|summary|heading|text|message|emptyText|confirmText|cancelText|submitText|loadingText|errorTitle|successMessage|lead|subtitle|tagline|caption|tooltip|helperText|footer|header|name|value|children|emptyDescription|emptyButtonLabel";

function collectFiles(target) {
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) return [];
  if (abs.endsWith(".tsx")) return [abs];
  const files = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p, files);
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
  if (/^[@./]|^https?:|^#|^\/|^vlc-|^ea-|^as-|^home-|^hire-/.test(inner)) return true;
  if (/\.(tsx?|css|json|png|jpg|svg|webp)$/.test(inner)) return true;
  return false;
}

function buildHookDestructure(body) {
  const parts = ["t"];
  if (/\bformatVnd\s*\(/.test(body)) parts.push("formatVnd");
  if (/\bformatDate\s*\(/.test(body)) parts.push("formatDate");
  if (/\bformatDateTime\s*\(/.test(body)) parts.push("formatDateTime");
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
    const useClient = content.startsWith('"use client"') || content.startsWith("'use client'");
    const importLine = 'import { useTranslation } from "@/hooks/useTranslation";\n';
    if (useClient) {
      content = content.replace(/^(["']use client["'];?\s*\n)/, `$1${importLine}`);
    } else {
      content = `${importLine}${content}`;
    }
  }

  if (/from ["']@\/lib\/format["']/.test(content)) {
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
    if (/const\s*\{[^}]+\}\s*=\s*useTranslation\(\)/.test(inner.slice(0, 400))) continue;
    insertions.push({ bodyStart: info.bodyStart, hook: buildHookDestructure(inner) });
  }

  for (let i = insertions.length - 1; i >= 0; i--) {
    const { bodyStart, hook } = insertions[i];
    content = content.slice(0, bodyStart) + `\n  ${hook}\n` + content.slice(bodyStart);
  }

  return content;
}

function wrapStringCalls(content) {
  return content.replace(
    /\b(setError|setMessage|setFeedback|setSuccess|setWarning|setInfo|setDownloadFeedback|setNotifFeedback|showNotifFeedback|setToast|setResolveError|alert|confirm|window\.alert|window\.confirm|window\.prompt)\(\s*(?:\{\s*message:\s*)?["']((?:[^"'\\]|\\.)*)["']\s*\)/g,
    (match, fn, inner) => {
      if (shouldSkipString(inner)) return match;
      if (match.includes("message:")) {
        return match.replace(`"${inner}"`, `t("${escapeForJs(inner)}")`);
      }
      return `${fn}(t("${escapeForJs(inner)}"))`;
    },
  );
}

function wrapTemplateLiterals(content) {
  return content.replace(
    /\b(setError|setMessage|setFeedback|setSuccess|setWarning|setInfo|setDownloadFeedback|setNotifFeedback|showNotifFeedback|setToast|setResolveError|alert|confirm|window\.alert|window\.confirm)\(\s*`((?:[^`\\]|\\.)*)`\s*\)/g,
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
      return `${fn}(t("${escapeForJs(inner)}"))`;
    },
  );
}

/** Safe JSX text: single-line, no braces/parens/code chars */
function wrapJsxText(content) {
  return content.replace(/>([^<>\n{}()=;]+)</g, (match, text) => {
    const trimmed = text.trim();
    if (!trimmed || !hasVi(trimmed)) return match;
    if (trimmed.startsWith("{")) return match;
    const leading = text.match(/^\s*/)[0];
    const trailing = text.match(/\s*$/)[0];
    return `>${leading}{t("${escapeForJs(trimmed)}")}${trailing}<`;
  });
}

function wrapTernaryJsxStrings(content) {
  return content.replace(
    /(\?\s*|:\s*)["']((?:[^"'\\]|\\.)*)["']/g,
    (match, prefix, inner) => {
      if (!hasVi(inner)) return match;
      if (shouldSkipString(inner)) return match;
      const before = content.slice(Math.max(0, content.indexOf(match) - 80), content.indexOf(match));
      if (!/return\s*\(|>\s*$|aria-|label=|placeholder=|title=/.test(before) && !/\{/.test(before.slice(-20))) {
        return match;
      }
      return `${prefix}t("${escapeForJs(inner)}")`;
    },
  );
}

function wrapFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  if (!hasVi(content)) return false;

  const original = content;

  const attrRe = new RegExp(`\\b(${JSX_ATTRS})="((?:[^"\\\\]|\\\\.)*)"`, "g");
  content = content.replace(attrRe, (match, prop, inner) => {
    if (shouldSkipString(inner)) return match;
    return `${prop}={t("${escapeForJs(inner)}")}`;
  });

  content = wrapStringCalls(content);
  content = wrapTemplateLiterals(content);
  content = wrapJsxText(content);

  if (content === original && !/from ["']@\/lib\/format["']/.test(content)) return false;

  content = ensureUseTranslation(content);
  if (content === original) return false;

  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

let count = 0;
const allFiles = new Set();
for (const target of TARGETS) {
  for (const file of collectFiles(target)) {
    allFiles.add(file);
  }
}

for (const file of allFiles) {
  if (wrapFile(file)) {
    count++;
    console.log("Updated:", path.relative(process.cwd(), file));
  }
}
console.log("Done. Updated", count, "files.");
