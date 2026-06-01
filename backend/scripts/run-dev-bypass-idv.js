/**
 * Chạy bypass xác minh cho holyminhlu1@gmail.com (cần .env DB giống backend).
 * Usage: node scripts/run-dev-bypass-idv.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const fs = require("fs");
const path = require("path");
const { pool } = require("../src/db/pool");

const sqlPath = path.join(__dirname, "../sql/dev_bypass_idv_holyminhlu1.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(sql);
    const check = await client.query(
      `SELECT u.email, u.role, iv.card_verified_at, iv.submitted_for_review_at,
              iv.contact_confirmed, iv.selfie_url IS NOT NULL AS has_photo
       FROM public.users u
       LEFT JOIN public.identity_verifications iv ON iv.user_id = u.id
       WHERE LOWER(TRIM(u.email)) = 'holyminhlu1@gmail.com'
       LIMIT 1`,
    );
    if (check.rowCount === 0) {
      console.error("Không tìm thấy user holyminhlu1@gmail.com");
      process.exit(1);
    }
    console.log("OK — đã cập nhật:", check.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
