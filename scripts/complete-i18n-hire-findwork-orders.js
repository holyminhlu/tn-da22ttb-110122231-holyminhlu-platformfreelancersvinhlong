/**
 * Complete i18n for hire/findwork/orders TSX — wraps all remaining Vietnamese UI strings.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const viRegex =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;

const TARGETS = ["components/hire", "components/findwork", "components/orders"];

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
  if (/^[@./]|^https?:|^#|^\/|^vlc-|^ea-|^as-|^home-|^hire-|^findwork-|^minh-chung/.test(inner)) return true;
  if (/\.(tsx?|css|json|png|jpg|svg|webp|woff2?)$/.test(inner)) return true;
  if (/^useSavedJobs /.test(inner)) return true; // dev error message - still translate? user said UI strings
  return false;
}

function getGitOriginal(relPath) {
  try {
    return execSync(`git show HEAD:"${relPath.replace(/\\/g, "/")}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

function fixCorruptedShortT(content, relPath) {
  const original = getGitOriginal(relPath);
  if (!original) return content;
  const origLines = original.split("\n");
  return content.replace(/t\("([^"]{1,3})"\)/g, (match, short) => {
    if (!viRegex.test(short)) return match;
    for (const line of origLines) {
      for (const re of [/label:\s*"([^"]+)"/, /title:\s*"([^"]+)"/, /:\s*"([^"]+)"/, /=\s*"([^"]+)"/, /aria-label="([^"]+)"/]) {
        const m = line.match(re);
        if (m && hasVi(m[1]) && m[1].endsWith(short) && m[1].length > short.length + 1) {
          return `t("${escapeForJs(m[1])}")`;
        }
      }
    }
    return match;
  });
}

function isInTCall(content, index) {
  const before = content.slice(Math.max(0, index - 3), index);
  return /t\($/.test(before) || before.endsWith("t(");
}

function wrapAllQuotedStrings(content) {
  // Double-quoted strings
  return content.replace(/"([^"\\]|\\.)*"/g, (match, _g, offset) => {
    const inner = match.slice(1, -1);
    if (shouldSkipString(inner)) return match;
    if (isInTCall(content, offset)) return match;
    // Skip import/module specifiers
    const lineStart = content.lastIndexOf("\n", offset) + 1;
    const linePrefix = content.slice(lineStart, offset);
    if (/^\s*import\s/.test(linePrefix + '"')) return match;
    if (/^\s*\/\//.test(linePrefix.trim())) return match;
    // Skip err.message patterns
    const ctx = content.slice(Math.max(0, offset - 40), offset + match.length + 20);
    if (/err\.message|error\.message|\.message\s*\|\|/.test(ctx)) return match;
    return `t("${escapeForJs(inner)}")`;
  });
}

function wrapJsxText(content) {
  return content.replace(/>([^<>{}]+)</g, (match, text) => {
    const trimmed = text.trim();
    if (!trimmed || !hasVi(trimmed)) return match;
    if (trimmed.startsWith("{") || trimmed.includes("t(")) return match;
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    return `>${lead}{t("${escapeForJs(trimmed)}")}${trail}<`;
  });
}

function usesFormatLib(content) {
  return /from ["']@\/lib\/format["']/.test(content);
}

function buildHook(c) {
  const p = ["t"];
  if (/\bformatVnd\s*\(/.test(c)) p.push("formatVnd");
  if (/\bformatDate\s*\(/.test(c)) p.push("formatDate");
  if (/\bformatDateTime\s*\(/.test(c)) p.push("formatDateTime");
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

function stripModuleLevelT(content) {
  // Remove t() from module-level const/object literals — they'll be handled via useMemo
  const lines = content.split("\n");
  let depth = 0;
  let inFunction = false;
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(export )?(default )?function /.test(trimmed) || /^const \w+ = (\(|function)/.test(trimmed)) {
      inFunction = true;
    }
    if (!inFunction && depth === 0 && line.includes("t(")) {
      result.push(line.replace(/t\("((?:[^"\\]|\\.)*)"\)/g, '"$1"'));
    } else {
      result.push(line);
    }
    for (const ch of line) {
      if (ch === "{") depth++;
      if (ch === "}") {
        depth--;
        if (depth === 0 && inFunction && trimmed === "}") inFunction = false;
      }
    }
  }
  return result.join("\n");
}

function hoistModuleLevelTArrays(content) {
  // Rename module-level arrays/objects that need t() to _RAW suffix and add useMemo in component
  const re = /^const (\w+)(?::[^=\n]+)? = (\[[\s\S]*?\]);?\s*$/gm;
  let m;
  const moves = [];
  while ((m = re.exec(content)) !== null) {
    if (!m[2].includes("t(")) continue;
    moves.push({ name: m[1], block: m[2], full: m[0], idx: m.index });
  }

  for (let i = moves.length - 1; i >= 0; i--) {
    const { name, block, full, idx } = moves[i];
    const rawName = `${name}_RAW`;
    const rawBlock = block.replace(/t\("((?:[^"\\]|\\.)*)"\)/g, '"$1"');
    const newConst = full.replace(`const ${name}`, `const ${rawName}`).replace(block, rawBlock);
    content = content.slice(0, idx) + newConst + content.slice(idx + full.length);

    const fnMatch = content.match(/export default function \w+[^{]*\{/);
    if (!fnMatch) continue;
    const hookMatch = content.slice(fnMatch.index).match(/\n\s*const \{ [^}]+\} = useTranslation\(\);/);
    if (!hookMatch) continue;
    const insertAt = fnMatch.index + hookMatch.index + hookMatch[0].length;
    const memo = `\n  const ${name} = useMemo(\n    () => ${rawName}.map((item) => ({\n      ...item,\n      ...(typeof item.label === "string" ? { label: t(item.label) } : {}),\n      ...(typeof item.title === "string" ? { title: t(item.title) } : {}),\n    })),\n    [t],\n  );`;
    if (!content.includes(`const ${name} = useMemo`)) {
      content = content.slice(0, insertAt) + memo + content.slice(insertAt);
    }
    if (!content.includes("useMemo")) {
      content = content.replace(/import \{([^}]+)\} from "react";/, (_, imp) => {
        const parts = imp.split(",").map((s) => s.trim());
        if (!parts.includes("useMemo")) parts.push("useMemo");
        return `import { ${parts.join(", ")} } from "react";`;
      });
    }
  }
  // Also hoist Record<string, string> style maps at module level with Vietnamese values
  const mapRe = /^const (\w+)(?::[^=\n]+)? = (\{[\s\S]*?\});?\s*$/gm;
  while ((m = mapRe.exec(content)) !== null) {
    if (!hasVi(m[2])) continue;
    const { name, block, full, idx } = { name: m[1], block: m[2], full: m[0], idx: m.index };
    const rawName = `${name}_RAW`;
    const newConst = full.replace(`const ${name}`, `const ${rawName}`);
    if (content.includes(`const ${rawName}`)) continue;
    content = content.slice(0, idx) + newConst + content.slice(idx + full.length);

    const fnMatch = content.match(/export default function \w+[^{]*\{/);
    if (!fnMatch) continue;
    const hookMatch = content.slice(fnMatch.index).match(/\n\s*const \{ [^}]+\} = useTranslation\(\);/);
    if (!hookMatch) continue;
    const insertAt = fnMatch.index + hookMatch.index + hookMatch[0].length;
    const memo = `\n  const ${name} = useMemo(\n    () => Object.fromEntries(Object.entries(${rawName}).map(([k, v]) => [k, typeof v === "string" ? t(v) : v])),\n    [t],\n  );`;
    if (!content.includes(`const ${name} = useMemo`)) {
      content = content.slice(0, insertAt) + memo + content.slice(insertAt);
    }
    if (!content.includes("useMemo")) {
      content = content.replace(/import \{([^}]+)\} from "react";/, (_, imp) => {
        const parts = imp.split(",").map((s) => s.trim());
        if (!parts.includes("useMemo")) parts.push("useMemo");
        return `import { ${parts.join(", ")} } from "react";`;
      });
    }
  }

  return content;
}

function ensureUseTranslation(content) {
  const needsHook =
    content.includes("t(") ||
    needsFormatVnd(content) ||
    needsFormatDate(content) ||
    needsFormatDateTime(content);
  if (!needsHook) return content;

  if (!content.includes('from "@/hooks/useTranslation"')) {
    content = ensureUseClient(content);
    const importLine = 'import { useTranslation } from "@/hooks/useTranslation";\n';
    content = content.replace(/^(["']use client["'];?\s*\n)/, `$1${importLine}`);
    if (!content.includes('from "@/hooks/useTranslation"')) content = importLine + content;
  }

  if (usesFormatLib(content)) content = removeFormatImport(content);

  const hookLine = buildHook(content);
  const fnPatterns = [/export default function (\w+)[^{]*\{/g, /export function (\w+)[^{]*\{/g];

  for (const re of fnPatterns) {
    let match;
    const inserts = [];
    while ((match = re.exec(content)) !== null) {
      const fnStart = match.index + match[0].length;
      const slice = content.slice(fnStart, fnStart + 400);
      if (/^\s*const\s*\{[^}]+\}\s*=\s*useTranslation\(\)/.test(slice)) continue;
      const body = extractFunctionBody(content, match.index);
      if (!body || !body.includes("t(")) continue;
      inserts.push(fnStart);
    }
    for (let i = inserts.length - 1; i >= 0; i--) {
      content = content.slice(0, inserts[i]) + `\n  ${hookLine}\n` + content.slice(inserts[i]);
    }
  }
  return content;
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

function fixDoubleT(content) {
  return content.replace(/t\(t\("([^"]*)"\)\)/g, 't("$1")');
}

function processFile(fp) {
  const rel = path.relative(process.cwd(), fp).replace(/\\/g, "/");
  let c = fs.readFileSync(fp, "utf8");
  if (!hasVi(c)) return false;
  const orig = c;

  c = fixCorruptedShortT(c, rel);
  c = wrapAllQuotedStrings(c);
  c = wrapJsxText(c);
  c = fixDoubleT(c);
  c = stripModuleLevelT(c);
  c = hoistModuleLevelTArrays(c);
  c = ensureUseTranslation(c);

  if (c === orig) return false;
  fs.writeFileSync(fp, c, "utf8");
  return true;
}

let n = 0;
for (const t of TARGETS) {
  for (const f of collectFiles(t)) {
    if (processFile(f)) {
      n++;
      console.log("Updated:", path.relative(process.cwd(), f).replace(/\\/g, "/"));
    }
  }
}
console.log("Done.", n, "files modified.");
