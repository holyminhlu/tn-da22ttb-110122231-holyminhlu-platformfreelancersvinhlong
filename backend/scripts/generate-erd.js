const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, "..", "..", ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

/** @type {Set<string>} child|parent|column */
const oneToOneKeys = new Set([
  "user_profiles|users|user_id",
  "freelancer_profiles|users|user_id",
  "identity_verifications|users|user_id",
  "freelancer_payout_accounts|users|user_id",
  "freelancer_withdrawal_pins|users|user_id",
  "client_billing_profiles|users|user_id",
  "billing_invoices|transactions|transaction_id",
  "contract_reviews|contracts|contract_id",
  "reviews|contracts|contract_id",
]);

/** @type {Set<string>} child|parent|column */
const manyToManyKeys = new Set([
  "user_skills|users|user_id",
  "user_skills|skills|skill_id",
  "client_favorite_freelancers|users|client_id",
  "client_favorite_freelancers|users|freelancer_id",
  "saved_jobs|users|freelancer_id",
  "saved_jobs|jobs|job_id",
  "chat_blocks|users|blocker_id",
  "chat_blocks|users|blocked_id",
  "chat_conversation_user_state|users|user_id",
  "chat_conversation_user_state|chat_conversations|conversation_id",
]);

function card(child, parent, column) {
  const key = `${child}|${parent}|${column}`;
  if (manyToManyKeys.has(key)) return "}o--o{";
  if (oneToOneKeys.has(key)) return "||--||";
  return "||--o{";
}

function mermaidCardLabel(c) {
  if (c === "||--||") return "1-1";
  if (c === "}o--o{") return "n-n";
  return "1-n";
}

async function main() {
  const c = new Client({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  });
  await c.connect();

  const tablesRes = await c.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  const allTables = tablesRes.rows.map((r) => r.tablename);

  const fksRes = await c.query(`
    SELECT
      tc.table_name AS child_table,
      kcu.column_name AS child_column,
      ccu.table_name AS parent_table,
      ccu.column_name AS parent_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY parent_table, child_table, child_column
  `);

  const connected = new Set();
  const edges = [];
  const edgeKeys = new Set();

  for (const fk of fksRes.rows) {
    connected.add(fk.child_table);
    connected.add(fk.parent_table);
    const c = card(fk.child_table, fk.parent_table, fk.child_column);
    const dedupe = `${fk.parent_table}|${c}|${fk.child_table}|${fk.child_column}`;
    if (edgeKeys.has(dedupe)) continue;
    edgeKeys.add(dedupe);
    const label = `${mermaidCardLabel(c)} ${fk.child_column}`;
    edges.push(`    ${fk.parent_table} ${c} ${fk.child_table} : "${label}"`);
  }

  const standalone = allTables.filter((t) => !connected.has(t));

  let md = `# VL Connected — ERD đầy đủ 51 bảng

> Tự sinh từ PostgreSQL \`${env.DB_NAME}\`. Một sơ đồ duy nhất: tất cả bảng và quan hệ FK.
>
> **Ký hiệu:** \`||--||\` = 1-1 · \`||--o{\` = 1-n · \`}o--o{\` = n-n

## Sơ đồ ERD

\`\`\`mermaid
erDiagram
`;

  for (const line of edges) {
    md += line + "\n";
  }

  // Bảng không có FK — khai báo entity để vẫn hiện trên sơ đồ
  const standaloneDefs = {
    login_attempts: "uuid id PK, varchar email, inet ip_address",
    service_categories: "serial id PK, varchar name UK",
    site_contact: "smallint id PK, text email, text phone",
    contact_social_links: "uuid id PK, varchar platform, text url",
    schema_migrations: "serial id PK, varchar filename UK",
    spatial_ref_sys: "int srid PK, varchar auth_name",
  };

  for (const t of standalone) {
    const attrs = standaloneDefs[t] || "uuid id PK";
    md += `    ${t} {\n        ${attrs}\n    }\n`;
  }

  md += "```\n\n";

  md += `## Danh sách 51 bảng\n\n`;
  md += `| # | Bảng | Loại |\n|---|------|------|\n`;
  allTables.forEach((t, i) => {
    const type = standalone.includes(t)
      ? "Độc lập (không FK)"
      : connected.has(t) && !fksRes.rows.some((fk) => fk.child_table === t)
        ? "Chỉ là cha (PK tham chiếu)"
        : "Có FK";
    md += `| ${i + 1} | \`${t}\` | ${type} |\n`;
  });

  md += `\n## Tóm tắt quan hệ theo cardinality\n\n`;
  md += `### 1-1\n`;
  md += `- users ↔ user_profiles, freelancer_profiles, identity_verifications\n`;
  md += `- users ↔ freelancer_payout_accounts, freelancer_withdrawal_pins, client_billing_profiles\n`;
  md += `- contracts ↔ contract_reviews (và reviews legacy)\n`;
  md += `- transactions ↔ billing_invoices\n\n`;
  md += `### n-n (bảng trung gian)\n`;
  md += `- user_skills: users ↔ skills\n`;
  md += `- client_favorite_freelancers: users (client) ↔ users (freelancer)\n`;
  md += `- saved_jobs: users (freelancer) ↔ jobs\n`;
  md += `- chat_blocks: users ↔ users\n`;
  md += `- chat_conversation_user_state: users ↔ chat_conversations\n\n`;
  md += `### 1-n\n`;
  md += `Tất cả quan hệ FK còn lại (jobs→job_quotes, contracts→milestones, users→notifications, ...)\n`;

  const outPath = path.join(__dirname, "..", "..", "docs", "database-erd.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md, "utf8");

  console.log("Written:", outPath);
  console.log("Tables:", allTables.length);
  console.log("FK edges:", edges.length);
  console.log("Standalone:", standalone.join(", "));

  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
