require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("../src/db/pool");

function daysFromText(text) {
  const raw = String(text || "");
  const idx = raw.lastIndexOf("## Tiến độ dự kiến");
  if (idx === -1) return null;
  const match = raw.slice(idx).match(/(\d+)\s*ngày\s*làm\s*việc/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function main() {
  const result = await pool.query(
    `SELECT id, proposal_text
     FROM public.contracts
     WHERE proposal_delivery_days IS NULL
       AND proposal_text IS NOT NULL`,
  );
  let updated = 0;
  for (const row of result.rows) {
    const days = daysFromText(row.proposal_text);
    if (!days) continue;
    await pool.query(
      `UPDATE public.contracts SET proposal_delivery_days = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [row.id, days],
    );
    updated += 1;
  }
  console.log(`Backfilled proposal_delivery_days for ${updated} contract(s).`);
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err.message);
    pool.end();
    process.exit(1);
  });
