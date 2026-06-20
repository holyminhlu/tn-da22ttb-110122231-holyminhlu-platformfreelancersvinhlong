/**
 * Deduplicates useTranslation() hooks — keeps one merged hook as first statement per function.
 * Run: node scripts/dedupe-i18n-hooks.js [dir...]
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_DIRS = [
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

const HOOK_RE = /^\s*const\s*\{\s*([^}]+)\s*\}\s*=\s*useTranslation\(\);\s*\n/gm;

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

function dedupeFunctionBody(body) {
  const hooks = [];
  let match;
  const re = /^\s*const\s*\{\s*([^}]+)\s*\}\s*=\s*useTranslation\(\);\s*$/gm;
  while ((match = re.exec(body)) !== null) {
    const parts = match[1].split(",").map((s) => s.trim()).filter(Boolean);
    hooks.push(...parts);
  }
  if (hooks.length <= 1) return body;

  const unique = [...new Set(hooks)];
  const merged = `  const { ${unique.join(", ")} } = useTranslation();\n`;

  let cleaned = body.replace(/^\s*const\s*\{\s*[^}]+\s*\}\s*=\s*useTranslation\(\);\s*\n/gm, "");
  const braceIdx = cleaned.search(/\n/);
  if (braceIdx === -1) return body;
  cleaned = cleaned.replace(/^(\s*\n)?/, merged);
  return cleaned;
}

function processFunction(content, fnStart, braceStart) {
  let depth = 0;
  let bodyEnd = -1;
  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) {
        bodyEnd = i;
        break;
      }
    }
  }
  if (bodyEnd === -1) return content;

  const body = content.slice(braceStart + 1, bodyEnd);
  const newBody = dedupeFunctionBody(body);
  if (newBody === body) return content;
  return content.slice(0, braceStart + 1) + newBody + content.slice(bodyEnd);
}

function dedupeFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  const fnRe = /(export default function \w+|export function \w+|function \w+)\([^)]*\)\s*\{/g;
  let match;
  const positions = [];
  while ((match = fnRe.exec(content)) !== null) {
    const braceStart = content.indexOf("{", match.index);
    positions.push(braceStart);
  }

  for (let i = positions.length - 1; i >= 0; i--) {
    content = processFunction(content, 0, positions[i]);
  }

  content = content.replace(/t\("ụ"\)/g, 't("Dịch vụ")');

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_DIRS;
const allFiles = new Set();
for (const d of dirs) {
  for (const f of collectFiles(d)) allFiles.add(f);
}

let count = 0;
for (const file of allFiles) {
  if (dedupeFile(file)) {
    count++;
    console.log("Deduped:", path.relative(process.cwd(), file));
  }
}
console.log("Done. Deduped", count, "files.");
