/** Second pass: wrap single-line JSX text nodes only. */
const fs = require("fs");
const path = require("path");

const viRegex =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;

const TARGETS = ["components/hire", "components/findwork", "components/orders"];

function collectFiles(target) {
  const abs = path.resolve(target);
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

function escapeForJs(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function wrapJsxText(content) {
  return content.replace(/>([^\n<>{}]+)</g, (m, text) => {
    const trimmed = text.trim();
    if (!trimmed || !viRegex.test(trimmed)) return m;
    if (trimmed.startsWith("{") || trimmed.includes("t(")) return m;
    if (trimmed.includes("${")) return m;
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    return `>${lead}{t("${escapeForJs(trimmed)}")}${trail}<`;
  });
}

function ensureHook(content) {
  if (!content.includes("t(") || content.includes("useTranslation()")) return content;
  if (!content.includes('from "@/hooks/useTranslation"')) {
    const importLine = 'import { useTranslation } from "@/hooks/useTranslation";\n';
    if (content.match(/^["']use client["']/)) {
      content = content.replace(/^(["']use client["'];?\s*\n)/, `$1${importLine}`);
    } else {
      content = `"use client";\n\n${importLine}${content}`;
    }
  }
  return content.replace(
    /(export default function \w+[^{]+\)\s*\{)(\s*)/,
    `$1\n  const { t } = useTranslation();$2`,
  );
}

let n = 0;
for (const t of TARGETS) {
  for (const f of collectFiles(t)) {
    let c = fs.readFileSync(f, "utf8");
    const orig = c;
    c = wrapJsxText(c);
    c = ensureHook(c);
    if (c !== orig) {
      fs.writeFileSync(f, c, "utf8");
      n++;
    }
  }
}
console.log("JSX pass:", n, "files");
