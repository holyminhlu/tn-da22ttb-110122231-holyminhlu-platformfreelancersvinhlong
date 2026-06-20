const fs = require("fs");
const path = require("path");

const SKIP_DIRS = new Set(["node_modules", ".next"]);
const SKIP_FILES = new Set(["lib/i18n/translate.ts", "lib/i18n/runtime.ts"]);

function walk(d, f = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, f);
    else if (/\.(tsx|ts)$/.test(p)) f.push(p.replace(/\\/g, "/"));
  }
  return f;
}

function ensureTUiImport(content) {
  if (!content.includes("tUi(")) return content;
  if (content.includes('from "@/lib/i18n/runtime"') || content.includes("from '@/lib/i18n/runtime'")) {
    if (!/\btUi\b/.test(content.split("from")[0] + content.match(/import[^;]*runtime[^;]*;/)?.[0])) {
      content = content.replace(
        /import \{([^}]*)\} from ["']@\/lib\/i18n\/runtime["'];/,
        (m, imports) => {
          const parts = imports.split(",").map((s) => s.trim()).filter(Boolean);
          if (!parts.includes("tUi")) parts.unshift("tUi");
          return `import { ${parts.join(", ")} } from "@/lib/i18n/runtime";`;
        },
      );
    }
    return content;
  }
  const firstImport = content.match(/^import .+?;\s*\n/m);
  const imp = 'import { tUi } from "@/lib/i18n/runtime";\n';
  if (firstImport) {
    return content.replace(firstImport[0], firstImport[0] + imp);
  }
  return imp + content;
}

function moduleScopeEnd(content) {
  const m = content.match(/\nexport default function /);
  return m ? m.index : content.length;
}

function fixModuleScope(content) {
  const end = moduleScopeEnd(content);
  const head = content.slice(0, end);
  const tail = content.slice(end);
  const fixed = head.replace(/\bt\(/g, "tUi(");
  return fixed + tail;
}

function fixFunctionBlocks(content) {
  const fnRe = /(?:^|\n)((?:export )?function \w+[^{]*\{)/g;
  let result = content;
  let match;
  const inserts = [];

  while ((match = fnRe.exec(content)) !== null) {
    const start = match.index + match[0].length;
    let depth = 1;
    let i = start;
    while (i < content.length && depth > 0) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") depth--;
      i++;
    }
    const body = content.slice(start, i - 1);
    if (!/\bt\(/.test(body)) continue;
    if (/useTranslation\s*\(/.test(body.slice(0, 400))) continue;
    if (/const t = tUi/.test(body.slice(0, 120))) continue;
    if (/const \{[^}]*\bt\b[^}]*\} = useTranslation/.test(body.slice(0, 400))) continue;

    inserts.push({ pos: start, text: "\n  const t = tUi;" });
  }

  inserts.sort((a, b) => b.pos - a.pos);
  for (const { pos, text } of inserts) {
    result = result.slice(0, pos) + text + result.slice(pos);
  }
  return result;
}

function fixFormatHelpers(content) {
  let c = content;
  c = c.replace(/\bformatDate\(/g, (all, offset) => {
    const before = c.slice(Math.max(0, offset - 80), offset);
    if (/formatDate[,}\s]/.test(before) || /const \{[^}]*formatDate/.test(before)) return all;
    if (/formatDateUi/.test(before)) return all;
    return "formatDateUi(";
  });
  c = c.replace(/\bformatVnd\(/g, (all, offset) => {
    const before = c.slice(Math.max(0, offset - 80), offset);
    if (/formatVnd[,}\s]/.test(before) || /const \{[^}]*formatVnd/.test(before)) return all;
    if (/formatVndUi/.test(before)) return all;
    return "formatVndUi(";
  });

  if (c.includes("formatDateUi(") && !c.includes("formatDateUi")) {
    // noop
  }
  if (/\bformatDateUi\(/.test(c) && !/formatDateUi/.test(c.match(/import[^;]*runtime[^;]*;/)?.[0] || "")) {
    c = c.replace(
      /import \{([^}]*)\} from ["']@\/lib\/i18n\/runtime["'];/,
      (m, imports) => {
        const parts = imports.split(",").map((s) => s.trim()).filter(Boolean);
        if (!parts.includes("formatDateUi")) parts.push("formatDateUi");
        return `import { ${parts.join(", ")} } from "@/lib/i18n/runtime";`;
      },
    );
  }
  if (/\bformatVndUi\(/.test(c) && !/formatVndUi/.test(c.match(/import[^;]*runtime[^;]*;/)?.[0] || "")) {
    c = c.replace(
      /import \{([^}]*)\} from ["']@\/lib\/i18n\/runtime["'];/,
      (m, imports) => {
        const parts = imports.split(",").map((s) => s.trim()).filter(Boolean);
        if (!parts.includes("formatVndUi")) parts.push("formatVndUi");
        return `import { ${parts.join(", ")} } from "@/lib/i18n/runtime";`;
      },
    );
  }
  return c;
}

let n = 0;
for (const file of walk(".")) {
  if (SKIP_FILES.has(file)) continue;
  if (file.startsWith("lib/api/")) continue;
  if (file.startsWith("scripts/")) continue;

  let c = fs.readFileSync(file, "utf8");
  if (!/\bt\(/.test(c) && !/\bformatDate\(/.test(c) && !/\bformatVnd\(/.test(c)) continue;

  const o = c;
  c = fixModuleScope(c);
  c = fixFunctionBlocks(c);
  c = fixFormatHelpers(c);
  c = ensureTUiImport(c);

  if (c !== o) {
    fs.writeFileSync(file, c);
    n++;
  }
}
console.log("fixed", n, "files");
