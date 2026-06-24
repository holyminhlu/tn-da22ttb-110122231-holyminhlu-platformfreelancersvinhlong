import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const columnsRaw = fs.readFileSync(path.join(__dirname, 'db_columns_raw.txt'), 'utf8').trim().split('\n');
const constraintsRaw = fs.readFileSync(path.join(__dirname, 'db_constraints_raw.txt'), 'utf8').trim().split('\n');

const SKIP_TABLES = new Set(['geography_columns', 'geometry_columns']);

const TABLE_DESC = {
  accounts: 'Tài khoản ví điện tử của người dùng (số dư khả dụng và escrow).',
  billing_invoices: 'Hóa đơn thanh toán gắn với giao dịch.',
  chat_blocks: 'Danh sách chặn giữa hai người dùng trong chat.',
  chat_conversation_user_state: 'Trạng thái đọc/ẩn hội thoại theo từng người dùng.',
  chat_conversations: 'Hội thoại giữa client và freelancer.',
  chat_messages: 'Tin nhắn trong hội thoại chat.',
  client_billing_methods: 'Phương thức thanh toán đã lưu của client.',
  client_billing_profiles: 'Thông tin xuất hóa đơn / công ty của client.',
  client_favorite_freelancers: 'Freelancer được client lưu yêu thích.',
  contact_social_links: 'Liên kết mạng xã hội trên trang liên hệ.',
  contract_cancel_requests: 'Yêu cầu hủy hợp đồng và thông tin hoàn tiền.',
  contract_dispute_messages: 'Tin nhắn trong luồng tranh chấp hợp đồng.',
  contract_disputes: 'Tranh chấp hợp đồng giữa client và freelancer.',
  contract_milestones: 'Cột mốc thanh toán trong hợp đồng.',
  contract_progress_entries: 'Nhật ký tiến độ / cập nhật công việc hợp đồng.',
  contract_reviews: 'Đánh giá hợp đồng sau khi hoàn thành.',
  contract_workflow_events: 'Sự kiện audit trong quy trình hợp đồng.',
  contracts: 'Hợp đồng làm việc giữa client và freelancer.',
  email_verification_tokens: 'Token xác minh email đăng ký.',
  freelancer_exclusive_resources: 'Tài nguyên độc quyền trên hồ sơ freelancer.',
  freelancer_payout_accounts: 'Tài khoản ngân hàng nhận rút tiền của freelancer.',
  freelancer_portfolios: 'Dự án portfolio trên hồ sơ freelancer.',
  freelancer_profile_files: 'File tải lên trên hồ sơ freelancer.',
  freelancer_profiles: 'Hồ sơ nghề nghiệp của freelancer.',
  freelancer_withdrawal_orders: 'Lệnh rút tiền qua PayOS.',
  freelancer_withdrawal_pins: 'Mã PIN bảo vệ thao tác rút tiền.',
  identity_verifications: 'Hồ sơ xác minh danh tính (KYC).',
  job_quotes: 'Báo giá / đề xuất của freelancer cho job.',
  jobs: 'Tin tuyển dụng / dự án do client đăng.',
  ledger_entries: 'Bút toán sổ cái kế toán nội bộ.',
  login_attempts: 'Lịch sử thử đăng nhập (thành công/thất bại).',
  notifications: 'Thông báo in-app cho người dùng.',
  oauth_accounts: 'Liên kết tài khoản OAuth (Google, ...).',
  password_reset_tokens: 'Token đặt lại mật khẩu.',
  profile_analytics_events: 'Sự kiện phân tích lượt xem hồ sơ/dịch vụ.',
  refresh_tokens: 'Refresh token phiên đăng nhập.',
  reviews: 'Đánh giá người dùng (bảng legacy).',
  saved_jobs: 'Job được freelancer lưu lại.',
  schema_migrations: 'Theo dõi file migration SQL đã áp dụng.',
  service_categories: 'Danh mục dịch vụ chuẩn.',
  services: 'Gói dịch vụ freelancer đăng bán.',
  site_contact: 'Thông tin liên hệ chung của website.',
  skills: 'Danh mục kỹ năng chuẩn.',
  spatial_ref_sys: 'Hệ tọa độ tham chiếu PostGIS (hệ thống).',
  transactions: 'Giao dịch tài chính (nạp, rút, thanh toán, ...).',
  user_login_logs: 'Lịch sử đăng nhập thành công.',
  user_payout_methods: 'Phương thức nhận tiền (legacy).',
  user_profiles: 'Thông tin hồ sơ cá nhân người dùng.',
  user_skills: 'Kỹ năng gắn với người dùng.',
  users: 'Tài khoản người dùng hệ thống.',
  wallet_deposit_orders: 'Đơn nạp ví qua cổng PayOS.',
};

function simplifyDefault(def) {
  if (!def) return '';
  return def
    .replace(/::[\w\s]+/g, '')
    .replace(/^'(.+)'$/, '$1')
    .replace(/gen_random_uuid\(\)/, 'gen_random_uuid()')
    .replace(/now\(\)|CURRENT_TIMESTAMP/, 'hiện tại')
    .replace(/nextval\([^)]+\)/, 'tự tăng');
}

function buildConstraints(table, col, nullable, defaultVal, consMap) {
  const parts = [];
  const c = consMap[`${table}.${col}`] || {};
  if (c.pk) parts.push('PK');
  if (c.fk?.length) {
    for (const fk of c.fk) {
      const del = fk.deleteRule && fk.deleteRule !== 'NO ACTION' ? ` ON DELETE ${fk.deleteRule}` : '';
      parts.push(`FK → ${fk.ref}${del}`);
    }
  }
  if (c.unique) parts.push('UNIQUE');
  if (nullable === 'NO') parts.push('NOT NULL');
  const d = simplifyDefault(defaultVal);
  if (d) parts.push(`DEFAULT ${d}`);
  return parts.join('; ') || '—';
}

const consMap = {};
for (const line of constraintsRaw) {
  const parts = line.replace(/\r/g, '').split('|');
  const [table, column, type, ref, deleteRule] = parts;
  const key = `${table}.${column}`;
  if (!consMap[key]) consMap[key] = { pk: false, fk: [], unique: false };
  if (type === 'PRIMARY KEY') consMap[key].pk = true;
  if (type === 'FOREIGN KEY' && ref) {
    const exists = consMap[key].fk.some((f) => f.ref === ref);
    if (!exists) consMap[key].fk.push({ ref, deleteRule });
  }
  if (type === 'UNIQUE') consMap[key].unique = true;
}

const tables = {};
for (const line of columnsRaw) {
  const [table, pos, column, dataType, nullable, defaultVal, comment] = line.split('|');
  if (SKIP_TABLES.has(table)) continue;
  if (!tables[table]) tables[table] = [];
  tables[table].push({ pos: Number(pos), column, dataType, nullable, defaultVal, comment });
}

const COLUMN_HINTS = {
  id: 'Khóa chính / định danh bản ghi',
  created_at: 'Thời điểm tạo bản ghi',
  updated_at: 'Thời điểm cập nhật gần nhất',
  deleted_at: 'Thời điểm xóa mềm (NULL = còn hiệu lực)',
  user_id: 'Tham chiếu người dùng (users.id)',
  client_id: 'Tham chiếu client (users.id)',
  freelancer_id: 'Tham chiếu freelancer (users.id)',
  contract_id: 'Tham chiếu hợp đồng (contracts.id)',
  job_id: 'Tham chiếu tin tuyển dụng (jobs.id)',
  service_id: 'Tham chiếu dịch vụ (services.id)',
  transaction_id: 'Tham chiếu giao dịch (transactions.id)',
  status: 'Trạng thái nghiệp vụ',
  amount: 'Số tiền (VND)',
  currency: 'Mã tiền tệ (VD: VND)',
  email: 'Địa chỉ email',
  password_hash: 'Mật khẩu đã băm',
  role: 'Vai trò: client | freelancer | admin',
  token: 'Chuỗi token bảo mật',
  expires_at: 'Thời điểm hết hạn token',
};

function describe(table, col, comment) {
  if (comment?.trim()) return comment.trim();
  if (COLUMN_HINTS[col]) return COLUMN_HINTS[col];
  return `Thuộc tính ${col} của bảng ${table}`;
}

const sortedTables = Object.keys(tables).sort((a, b) => a.localeCompare(b));
let md = `# Tài liệu cơ sở dữ liệu VL Connected\n\n`;
md += `> Tự động sinh từ schema PostgreSQL — ${sortedTables.length} bảng.\n\n`;
md += `| STT bảng | Tên bảng | Mô tả |\n|----------|----------|-------|\n`;
sortedTables.forEach((t, i) => {
  md += `| ${i + 1} | \`${t}\` | ${TABLE_DESC[t] || '—'} |\n`;
});
md += '\n---\n\n';

sortedTables.forEach((table, tableIdx) => {
  md += `## ${tableIdx + 1}. Bảng \`${table}\`\n\n`;
  md += `${TABLE_DESC[table] || ''}\n\n`;
  md += `| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |\n`;
  md += `|-----|------------|--------------|-----------|----------|\n`;
  tables[table]
    .sort((a, b) => a.pos - b.pos)
    .forEach((row, i) => {
      const constraints = buildConstraints(table, row.column, row.nullable, row.defaultVal, consMap);
      const desc = describe(table, row.column, row.comment).replace(/\|/g, '\\|').replace(/\n/g, ' ');
      md += `| ${i + 1} | ${row.column} | ${row.dataType} | ${constraints} | ${desc} |\n`;
    });
  md += '\n';
});

const outPath = path.join(__dirname, 'database-tables.md');
fs.writeFileSync(outPath, md, 'utf8');
console.log(`Written ${sortedTables.length} tables to ${outPath}`);
