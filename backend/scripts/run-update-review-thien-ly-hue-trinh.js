/**
 * Chỉnh sửa đánh giá contract_reviews:
 * Khách hàng "Nguyễn Thị Thiên Lý" -> Freelancer "Thạch Thị Huệ Trinh"
 * "Nó ngu" => "Tôi rất hài lòng"
 *
 * Usage: node backend/scripts/run-update-review-thien-ly-hue-trinh.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const fs = require("fs");
const path = require("path");
const { pool } = require("../src/db/pool");

const sqlPath = path.join(__dirname, "../sql/update_review_thien_ly_hue_trinh.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(sql);
    const check = await client.query(
      `SELECT
         cr.id,
         cr.rating,
         cr.comment,
         cr.updated_at,
         client_up.full_name AS client_name,
         freelancer_up.full_name AS freelancer_name
       FROM public.contract_reviews cr
       INNER JOIN public.users client_u ON client_u.id = cr.client_id
       INNER JOIN public.user_profiles client_up ON client_up.user_id = cr.client_id
       INNER JOIN public.users freelancer_u ON freelancer_u.id = cr.freelancer_id
       INNER JOIN public.user_profiles freelancer_up ON freelancer_up.user_id = cr.freelancer_id
       WHERE client_u.deleted_at IS NULL
         AND freelancer_u.deleted_at IS NULL
         AND TRIM(client_up.full_name) ILIKE 'Nguyễn Thị Thiên Lý'
         AND TRIM(freelancer_up.full_name) ILIKE 'Thạch Thị Huệ Trinh'
         AND TRIM(cr.comment) = 'Tôi rất hài lòng'
       ORDER BY cr.updated_at DESC
       LIMIT 5`,
    );
    if (check.rowCount === 0) {
      console.error("Không tìm thấy đánh giá đã cập nhật. Kiểm tra tên user hoặc nội dung cũ.");
      process.exit(1);
    }
    console.log(`OK — đã cập nhật ${check.rowCount} đánh giá:`);
    console.table(check.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
