# Tài liệu cơ sở dữ liệu VL Connected

> Tự động sinh từ schema PostgreSQL — 51 bảng.

| STT bảng | Tên bảng | Mô tả |
|----------|----------|-------|
| 1 | `accounts` | Tài khoản ví điện tử của người dùng (số dư khả dụng và escrow). |
| 2 | `billing_invoices` | Hóa đơn thanh toán gắn với giao dịch. |
| 3 | `chat_blocks` | Danh sách chặn giữa hai người dùng trong chat. |
| 4 | `chat_conversation_user_state` | Trạng thái đọc/ẩn hội thoại theo từng người dùng. |
| 5 | `chat_conversations` | Hội thoại giữa client và freelancer. |
| 6 | `chat_messages` | Tin nhắn trong hội thoại chat. |
| 7 | `client_billing_methods` | Phương thức thanh toán đã lưu của client. |
| 8 | `client_billing_profiles` | Thông tin xuất hóa đơn / công ty của client. |
| 9 | `client_favorite_freelancers` | Freelancer được client lưu yêu thích. |
| 10 | `contact_social_links` | Liên kết mạng xã hội trên trang liên hệ. |
| 11 | `contract_cancel_requests` | Yêu cầu hủy hợp đồng và thông tin hoàn tiền. |
| 12 | `contract_dispute_messages` | Tin nhắn trong luồng tranh chấp hợp đồng. |
| 13 | `contract_disputes` | Tranh chấp hợp đồng giữa client và freelancer. |
| 14 | `contract_milestones` | Cột mốc thanh toán trong hợp đồng. |
| 15 | `contract_progress_entries` | Nhật ký tiến độ / cập nhật công việc hợp đồng. |
| 16 | `contract_reviews` | Đánh giá hợp đồng sau khi hoàn thành. |
| 17 | `contract_workflow_events` | Sự kiện audit trong quy trình hợp đồng. |
| 18 | `contracts` | Hợp đồng làm việc giữa client và freelancer. |
| 19 | `email_verification_tokens` | Token xác minh email đăng ký. |
| 20 | `freelancer_exclusive_resources` | Tài nguyên độc quyền trên hồ sơ freelancer. |
| 21 | `freelancer_payout_accounts` | Tài khoản ngân hàng nhận rút tiền của freelancer. |
| 22 | `freelancer_portfolios` | Dự án portfolio trên hồ sơ freelancer. |
| 23 | `freelancer_profile_files` | File tải lên trên hồ sơ freelancer. |
| 24 | `freelancer_profiles` | Hồ sơ nghề nghiệp của freelancer. |
| 25 | `freelancer_withdrawal_orders` | Lệnh rút tiền qua PayOS. |
| 26 | `freelancer_withdrawal_pins` | Mã PIN bảo vệ thao tác rút tiền. |
| 27 | `identity_verifications` | Hồ sơ xác minh danh tính (KYC). |
| 28 | `job_quotes` | Báo giá / đề xuất của freelancer cho job. |
| 29 | `jobs` | Tin tuyển dụng / dự án do client đăng. |
| 30 | `ledger_entries` | Bút toán sổ cái kế toán nội bộ. |
| 31 | `login_attempts` | Lịch sử thử đăng nhập (thành công/thất bại). |
| 32 | `notifications` | Thông báo in-app cho người dùng. |
| 33 | `oauth_accounts` | Liên kết tài khoản OAuth (Google, ...). |
| 34 | `password_reset_tokens` | Token đặt lại mật khẩu. |
| 35 | `profile_analytics_events` | Sự kiện phân tích lượt xem hồ sơ/dịch vụ. |
| 36 | `refresh_tokens` | Refresh token phiên đăng nhập. |
| 37 | `reviews` | Đánh giá người dùng (bảng legacy). |
| 38 | `saved_jobs` | Job được freelancer lưu lại. |
| 39 | `schema_migrations` | Theo dõi file migration SQL đã áp dụng. |
| 40 | `service_categories` | Danh mục dịch vụ chuẩn. |
| 41 | `services` | Gói dịch vụ freelancer đăng bán. |
| 42 | `site_contact` | Thông tin liên hệ chung của website. |
| 43 | `skills` | Danh mục kỹ năng chuẩn. |
| 44 | `spatial_ref_sys` | Hệ tọa độ tham chiếu PostGIS (hệ thống). |
| 45 | `transactions` | Giao dịch tài chính (nạp, rút, thanh toán, ...). |
| 46 | `user_login_logs` | Lịch sử đăng nhập thành công. |
| 47 | `user_payout_methods` | Phương thức nhận tiền (legacy). |
| 48 | `user_profiles` | Thông tin hồ sơ cá nhân người dùng. |
| 49 | `user_skills` | Kỹ năng gắn với người dùng. |
| 50 | `users` | Tài khoản người dùng hệ thống. |
| 51 | `wallet_deposit_orders` | Đơn nạp ví qua cổng PayOS. |

---

## 1. Bảng `accounts`

Tài khoản ví điện tử của người dùng (số dư khả dụng và escrow).

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | user_id | uuid | FK → users(id); UNIQUE; NOT NULL | Tham chiếu người dùng (users.id) |
| 3 | balance | numeric(18,2) | NOT NULL; DEFAULT 0 | Thuộc tính balance của bảng accounts |
| 4 | currency | char(3) | UNIQUE; NOT NULL; DEFAULT VND | Mã tiền tệ (VD: VND) |
| 5 | created_at | timestamp | DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 6 | updated_at | timestamp | DEFAULT hiện tại | Thời điểm cập nhật gần nhất |
| 7 | escrow_balance | numeric(18,2) | NOT NULL; DEFAULT 0 | Thuộc tính escrow_balance của bảng accounts |

## 2. Bảng `billing_invoices`

Hóa đơn thanh toán gắn với giao dịch.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | transaction_id | uuid | FK → transactions(id) ON DELETE CASCADE; UNIQUE; NOT NULL | Tham chiếu giao dịch (transactions.id) |
| 3 | user_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 4 | invoice_number | varchar(80) | UNIQUE; NOT NULL | Thuộc tính invoice_number của bảng billing_invoices |
| 5 | issued_at | timestamp | NOT NULL; DEFAULT hiện tại | Thuộc tính issued_at của bảng billing_invoices |
| 6 | currency | char(3) | NOT NULL; DEFAULT VND | Mã tiền tệ (VD: VND) |
| 7 | subtotal | numeric(18,2) | NOT NULL; DEFAULT 0 | Thuộc tính subtotal của bảng billing_invoices |
| 8 | fee_amount | numeric(18,2) | NOT NULL; DEFAULT 0 | Thuộc tính fee_amount của bảng billing_invoices |
| 9 | total_amount | numeric(18,2) | NOT NULL; DEFAULT 0 | Thuộc tính total_amount của bảng billing_invoices |
| 10 | status | varchar(20) | NOT NULL; DEFAULT issued | Trạng thái nghiệp vụ |
| 11 | pdf_url | text | — | Thuộc tính pdf_url của bảng billing_invoices |
| 12 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |

## 3. Bảng `chat_blocks`

Danh sách chặn giữa hai người dùng trong chat.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | blocker_id | uuid | PK; FK → users(id) ON DELETE CASCADE; NOT NULL | Thuộc tính blocker_id của bảng chat_blocks |
| 2 | blocked_id | uuid | PK; FK → users(id) ON DELETE CASCADE; NOT NULL | Thuộc tính blocked_id của bảng chat_blocks |
| 3 | created_at | timestamptz | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |

## 4. Bảng `chat_conversation_user_state`

Trạng thái đọc/ẩn hội thoại theo từng người dùng.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | conversation_id | uuid | PK; FK → chat_conversations(id) ON DELETE CASCADE; NOT NULL | Thuộc tính conversation_id của bảng chat_conversation_user_state |
| 2 | user_id | uuid | PK; FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 3 | hidden_at | timestamptz | — | Thuộc tính hidden_at của bảng chat_conversation_user_state |
| 4 | last_read_at | timestamptz | — | Thuộc tính last_read_at của bảng chat_conversation_user_state |

## 5. Bảng `chat_conversations`

Hội thoại giữa client và freelancer.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | client_id | uuid | FK → users(id) ON DELETE CASCADE; UNIQUE; NOT NULL | Tham chiếu client (users.id) |
| 3 | freelancer_id | uuid | FK → users(id) ON DELETE CASCADE; UNIQUE; NOT NULL | Tham chiếu freelancer (users.id) |
| 4 | job_quote_id | uuid | FK → job_quotes(id) ON DELETE SET NULL | Thuộc tính job_quote_id của bảng chat_conversations |
| 5 | created_at | timestamptz | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 6 | updated_at | timestamptz | NOT NULL; DEFAULT hiện tại | Thời điểm cập nhật gần nhất |
| 7 | service_id | uuid | FK → services(id) ON DELETE SET NULL | Tham chiếu dịch vụ (services.id) |
| 8 | context_title | text | — | Thuộc tính context_title của bảng chat_conversations |

## 6. Bảng `chat_messages`

Tin nhắn trong hội thoại chat.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | conversation_id | uuid | FK → chat_conversations(id) ON DELETE CASCADE; NOT NULL | Thuộc tính conversation_id của bảng chat_messages |
| 3 | sender_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Thuộc tính sender_id của bảng chat_messages |
| 4 | body | text | NOT NULL | Thuộc tính body của bảng chat_messages |
| 5 | created_at | timestamptz | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 6 | kind | varchar(20) | NOT NULL; DEFAULT text | Thuộc tính kind của bảng chat_messages |
| 7 | context_type | varchar(20) | — | Thuộc tính context_type của bảng chat_messages |
| 8 | attachment_url | text | — | Thuộc tính attachment_url của bảng chat_messages |
| 9 | attachment_name | text | — | Thuộc tính attachment_name của bảng chat_messages |
| 10 | attachment_mime | text | — | Thuộc tính attachment_mime của bảng chat_messages |

## 7. Bảng `client_billing_methods`

Phương thức thanh toán đã lưu của client.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | user_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 3 | method_type | varchar(20) | NOT NULL | Thuộc tính method_type của bảng client_billing_methods |
| 4 | provider | varchar(80) | — | Thuộc tính provider của bảng client_billing_methods |
| 5 | card_brand | varchar(40) | — | Thuộc tính card_brand của bảng client_billing_methods |
| 6 | card_last4 | varchar(4) | — | Thuộc tính card_last4 của bảng client_billing_methods |
| 7 | card_exp_month | smallint | — | Thuộc tính card_exp_month của bảng client_billing_methods |
| 8 | card_exp_year | smallint | — | Thuộc tính card_exp_year của bảng client_billing_methods |
| 9 | paypal_email | varchar(255) | — | Thuộc tính paypal_email của bảng client_billing_methods |
| 10 | bank_name | varchar(120) | — | Thuộc tính bank_name của bảng client_billing_methods |
| 11 | bank_account_last4 | varchar(4) | — | Thuộc tính bank_account_last4 của bảng client_billing_methods |
| 12 | is_default | boolean | NOT NULL; DEFAULT false | Thuộc tính is_default của bảng client_billing_methods |
| 13 | is_active | boolean | NOT NULL; DEFAULT true | Thuộc tính is_active của bảng client_billing_methods |
| 14 | auto_billing_enabled | boolean | NOT NULL; DEFAULT false | Thuộc tính auto_billing_enabled của bảng client_billing_methods |
| 15 | auto_topup_threshold | numeric(18,2) | — | Thuộc tính auto_topup_threshold của bảng client_billing_methods |
| 16 | auto_topup_amount | numeric(18,2) | — | Thuộc tính auto_topup_amount của bảng client_billing_methods |
| 17 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 18 | updated_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm cập nhật gần nhất |

## 8. Bảng `client_billing_profiles`

Thông tin xuất hóa đơn / công ty của client.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | user_id | uuid | PK; FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 2 | company_name | varchar(255) | — | Thuộc tính company_name của bảng client_billing_profiles |
| 3 | company_address | text | — | Thuộc tính company_address của bảng client_billing_profiles |
| 4 | tax_id | varchar(100) | — | Thuộc tính tax_id của bảng client_billing_profiles |
| 5 | billing_email | varchar(255) | — | Thuộc tính billing_email của bảng client_billing_profiles |
| 6 | contact_name | varchar(255) | — | Thuộc tính contact_name của bảng client_billing_profiles |
| 7 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 8 | updated_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm cập nhật gần nhất |

## 9. Bảng `client_favorite_freelancers`

Freelancer được client lưu yêu thích.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | client_id | uuid | FK → users(id) ON DELETE CASCADE; UNIQUE; NOT NULL | Tham chiếu client (users.id) |
| 3 | freelancer_id | uuid | FK → users(id) ON DELETE CASCADE; UNIQUE; NOT NULL | Tham chiếu freelancer (users.id) |
| 4 | saved_at | timestamp | NOT NULL; DEFAULT hiện tại | Thuộc tính saved_at của bảng client_favorite_freelancers |

## 10. Bảng `contact_social_links`

Liên kết mạng xã hội trên trang liên hệ.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | platform | text | NOT NULL | Thuộc tính platform của bảng contact_social_links |
| 3 | label | text | NOT NULL | Thuộc tính label của bảng contact_social_links |
| 4 | url | text | NOT NULL; DEFAULT '' | Thuộc tính url của bảng contact_social_links |
| 5 | sort_order | integer | NOT NULL; DEFAULT 0 | Thuộc tính sort_order của bảng contact_social_links |
| 6 | is_visible | boolean | NOT NULL; DEFAULT true | Thuộc tính is_visible của bảng contact_social_links |
| 7 | created_at | timestamptz | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 8 | updated_at | timestamptz | NOT NULL; DEFAULT hiện tại | Thời điểm cập nhật gần nhất |

## 11. Bảng `contract_cancel_requests`

Yêu cầu hủy hợp đồng và thông tin hoàn tiền.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | contract_id | uuid | FK → contracts(id) ON DELETE CASCADE; NOT NULL | Tham chiếu hợp đồng (contracts.id) |
| 3 | requested_by | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Thuộc tính requested_by của bảng contract_cancel_requests |
| 4 | reason | text | NOT NULL | Thuộc tính reason của bảng contract_cancel_requests |
| 5 | status | varchar(32) | NOT NULL; DEFAULT pending | Trạng thái nghiệp vụ |
| 6 | respond_by_at | timestamp | NOT NULL | Thuộc tính respond_by_at của bảng contract_cancel_requests |
| 7 | freelancer_response | text | — | Thuộc tính freelancer_response của bảng contract_cancel_requests |
| 8 | resolved_at | timestamp | — | Thuộc tính resolved_at của bảng contract_cancel_requests |
| 9 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 10 | reason_code | varchar(64) | — | Thuộc tính reason_code của bảng contract_cancel_requests |
| 11 | detail | text | — | Thuộc tính detail của bảng contract_cancel_requests |
| 12 | refund_method | varchar(32) | DEFAULT wallet | Thuộc tính refund_method của bảng contract_cancel_requests |
| 13 | legitimacy | varchar(32) | — | Thuộc tính legitimacy của bảng contract_cancel_requests |
| 14 | split_type | varchar(32) | — | Thuộc tính split_type của bảng contract_cancel_requests |
| 15 | penalty_percent | numeric(5,4) | — | Thuộc tính penalty_percent của bảng contract_cancel_requests |
| 16 | work_done_percent | numeric(5,2) | — | Thuộc tính work_done_percent của bảng contract_cancel_requests |
| 17 | client_refund_amount | numeric(14,2) | — | Thuộc tính client_refund_amount của bảng contract_cancel_requests |
| 18 | freelancer_amount | numeric(14,2) | — | Thuộc tính freelancer_amount của bảng contract_cancel_requests |
| 19 | platform_fee_amount | numeric(14,2) | — | Thuộc tính platform_fee_amount của bảng contract_cancel_requests |
| 20 | workflow_stage_at_request | varchar(32) | — | Thuộc tính workflow_stage_at_request của bảng contract_cancel_requests |
| 21 | had_progress_at_request | boolean | NOT NULL; DEFAULT false | Thuộc tính had_progress_at_request của bảng contract_cancel_requests |
| 22 | admin_note | text | — | Thuộc tính admin_note của bảng contract_cancel_requests |

## 12. Bảng `contract_dispute_messages`

Tin nhắn trong luồng tranh chấp hợp đồng.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | dispute_id | uuid | FK → contract_disputes(id) ON DELETE CASCADE; NOT NULL | Thuộc tính dispute_id của bảng contract_dispute_messages |
| 3 | author_id | uuid | FK → users(id) ON DELETE SET NULL | Thuộc tính author_id của bảng contract_dispute_messages |
| 4 | author_role | varchar(16) | NOT NULL | Thuộc tính author_role của bảng contract_dispute_messages |
| 5 | body | text | NOT NULL | Thuộc tính body của bảng contract_dispute_messages |
| 6 | attachments | jsonb | NOT NULL; DEFAULT [] | Thuộc tính attachments của bảng contract_dispute_messages |
| 7 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |

## 13. Bảng `contract_disputes`

Tranh chấp hợp đồng giữa client và freelancer.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | contract_id | uuid | FK → contracts(id) ON DELETE CASCADE; NOT NULL | Tham chiếu hợp đồng (contracts.id) |
| 3 | opened_by | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Thuộc tính opened_by của bảng contract_disputes |
| 4 | reason | text | NOT NULL | Thuộc tính reason của bảng contract_disputes |
| 5 | evidence | jsonb | NOT NULL; DEFAULT {} | Thuộc tính evidence của bảng contract_disputes |
| 6 | status | varchar(32) | NOT NULL; DEFAULT open | Trạng thái nghiệp vụ |
| 7 | resolution | varchar(32) | — | Thuộc tính resolution của bảng contract_disputes |
| 8 | admin_notes | text | — | Thuộc tính admin_notes của bảng contract_disputes |
| 9 | resolved_at | timestamp | — | Thuộc tính resolved_at của bảng contract_disputes |
| 10 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 11 | issue_category | varchar(64) | — | Thuộc tính issue_category của bảng contract_disputes |
| 12 | desired_resolution | varchar(64) | — | Thuộc tính desired_resolution của bảng contract_disputes |
| 13 | desired_resolution_note | text | — | Thuộc tính desired_resolution_note của bảng contract_disputes |
| 14 | dispute_stage | varchar(32) | DEFAULT initiated | Thuộc tính dispute_stage của bảng contract_disputes |
| 15 | respond_by_at | timestamp | — | Thuộc tính respond_by_at của bảng contract_disputes |
| 16 | updated_at | timestamp | DEFAULT hiện tại | Thời điểm cập nhật gần nhất |

## 14. Bảng `contract_milestones`

Cột mốc thanh toán trong hợp đồng.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | contract_id | uuid | FK → contracts(id) ON DELETE CASCADE; NOT NULL | Tham chiếu hợp đồng (contracts.id) |
| 3 | title | varchar(255) | NOT NULL | Thuộc tính title của bảng contract_milestones |
| 4 | amount | numeric(12,2) | NOT NULL | Số tiền (VND) |
| 5 | sort_order | integer | NOT NULL; DEFAULT 0 | Thuộc tính sort_order của bảng contract_milestones |
| 6 | status | varchar(32) | NOT NULL; DEFAULT pending | Trạng thái nghiệp vụ |
| 7 | note | text | — | Thuộc tính note của bảng contract_milestones |
| 8 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 9 | updated_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm cập nhật gần nhất |

## 15. Bảng `contract_progress_entries`

Nhật ký tiến độ / cập nhật công việc hợp đồng.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | contract_id | uuid | FK → contracts(id) ON DELETE CASCADE; NOT NULL | Tham chiếu hợp đồng (contracts.id) |
| 3 | entry_type | varchar(32) | NOT NULL | Thuộc tính entry_type của bảng contract_progress_entries |
| 4 | note | text | NOT NULL | Thuộc tính note của bảng contract_progress_entries |
| 5 | demo_url | text | — | Thuộc tính demo_url của bảng contract_progress_entries |
| 6 | actor_id | uuid | FK → users(id) ON DELETE SET NULL | Thuộc tính actor_id của bảng contract_progress_entries |
| 7 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |

## 16. Bảng `contract_reviews`

Đánh giá hợp đồng sau khi hoàn thành.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | contract_id | uuid | FK → contracts(id) ON DELETE CASCADE; UNIQUE; NOT NULL | Tham chiếu hợp đồng (contracts.id) |
| 3 | job_id | uuid | FK → jobs(id) ON DELETE CASCADE; NOT NULL | Tham chiếu tin tuyển dụng (jobs.id) |
| 4 | client_id | uuid | FK → users(id) ON DELETE CASCADE; UNIQUE; NOT NULL | Tham chiếu client (users.id) |
| 5 | freelancer_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu freelancer (users.id) |
| 6 | rating | smallint | NOT NULL | Thuộc tính rating của bảng contract_reviews |
| 7 | comment | text | — | Thuộc tính comment của bảng contract_reviews |
| 8 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 9 | updated_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm cập nhật gần nhất |
| 10 | freelancer_reply | text | — | Thuộc tính freelancer_reply của bảng contract_reviews |
| 11 | freelancer_reply_at | timestamp | — | Thuộc tính freelancer_reply_at của bảng contract_reviews |

## 17. Bảng `contract_workflow_events`

Sự kiện audit trong quy trình hợp đồng.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | contract_id | uuid | FK → contracts(id) ON DELETE CASCADE; NOT NULL | Tham chiếu hợp đồng (contracts.id) |
| 3 | event_type | varchar(64) | NOT NULL | Thuộc tính event_type của bảng contract_workflow_events |
| 4 | payload | jsonb | NOT NULL; DEFAULT {} | Thuộc tính payload của bảng contract_workflow_events |
| 5 | actor_id | uuid | FK → users(id) ON DELETE SET NULL | Thuộc tính actor_id của bảng contract_workflow_events |
| 6 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |

## 18. Bảng `contracts`

Hợp đồng làm việc giữa client và freelancer.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | job_id | uuid | FK → jobs(id) ON DELETE SET NULL | Tham chiếu tin tuyển dụng (jobs.id) |
| 3 | service_id | uuid | FK → services(id) ON DELETE SET NULL | Tham chiếu dịch vụ (services.id) |
| 4 | client_id | uuid | FK → users(id); NOT NULL | Tham chiếu client (users.id) |
| 5 | freelancer_id | uuid | FK → users(id); NOT NULL | Tham chiếu freelancer (users.id) |
| 6 | agreed_price | numeric(12,2) | — | Thuộc tính agreed_price của bảng contracts |
| 7 | start_date | timestamp | — | Thuộc tính start_date của bảng contracts |
| 8 | end_date | timestamp | — | Thuộc tính end_date của bảng contracts |
| 9 | status | contract_status | NOT NULL | Trạng thái nghiệp vụ |
| 10 | created_at | timestamp | DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 11 | updated_at | timestamp | DEFAULT hiện tại | Thời điểm cập nhật gần nhất |
| 12 | deleted_at | timestamp | — | Thời điểm xóa mềm (NULL = còn hiệu lực) |
| 13 | progress_note | text | — | Thuộc tính progress_note của bảng contracts |
| 14 | delivered_at | timestamp | — | Thuộc tính delivered_at của bảng contracts |
| 15 | workflow_stage | varchar(32) | NOT NULL; DEFAULT selection | Thuộc tính workflow_stage của bảng contracts |
| 16 | escrow_status | varchar(32) | NOT NULL; DEFAULT none | Thuộc tính escrow_status của bảng contracts |
| 17 | package_snapshot | jsonb | NOT NULL; DEFAULT {} | Thuộc tính package_snapshot của bảng contracts |
| 18 | client_brief | text | — | Thuộc tính client_brief của bảng contracts |
| 19 | proposal_text | text | — | Thuộc tính proposal_text của bảng contracts |
| 20 | proposal_budget | numeric(12,2) | — | Thuộc tính proposal_budget của bảng contracts |
| 21 | proposal_submitted_at | timestamp | — | Thuộc tính proposal_submitted_at của bảng contracts |
| 22 | demo_url | varchar(2000) | — | Thuộc tính demo_url của bảng contracts |
| 23 | revisions_limit | integer | NOT NULL; DEFAULT 2 | Thuộc tính revisions_limit của bảng contracts |
| 24 | revisions_used | integer | NOT NULL; DEFAULT 0 | Thuộc tính revisions_used của bảng contracts |
| 25 | funded_at | timestamp | — | Thuộc tính funded_at của bảng contracts |
| 26 | released_at | timestamp | — | Thuộc tính released_at của bảng contracts |
| 27 | accepted_at | timestamp | — | Thuộc tính accepted_at của bảng contracts |
| 28 | stage_deadline_at | timestamp | — | Thuộc tính stage_deadline_at của bảng contracts |
| 29 | escrow_deadline_at | timestamp | — | Thuộc tính escrow_deadline_at của bảng contracts |
| 30 | cancelled_at | timestamp | — | Thuộc tính cancelled_at của bảng contracts |
| 31 | cancelled_by | uuid | FK → users(id) ON DELETE SET NULL | Thuộc tính cancelled_by của bảng contracts |
| 32 | cancel_reason | text | — | Thuộc tính cancel_reason của bảng contracts |
| 33 | cancel_type | varchar(32) | — | Thuộc tính cancel_type của bảng contracts |
| 34 | delivery_review_deadline_at | timestamp | — | Thuộc tính delivery_review_deadline_at của bảng contracts |
| 35 | auto_accepted_at | timestamp | — | Thuộc tính auto_accepted_at của bảng contracts |
| 36 | revision_requested_at | timestamp | — | Thuộc tính revision_requested_at của bảng contracts |
| 37 | sla_reminder_48_sent | boolean | NOT NULL; DEFAULT false | Thuộc tính sla_reminder_48_sent của bảng contracts |
| 38 | sla_reminder_24_sent | boolean | NOT NULL; DEFAULT false | Thuộc tính sla_reminder_24_sent của bảng contracts |
| 39 | last_rejected_proposal_text | text | — | Thuộc tính last_rejected_proposal_text của bảng contracts |
| 40 | last_rejected_proposal_at | timestamp | — | Thuộc tính last_rejected_proposal_at của bảng contracts |
| 41 | proposal_rejection_note | text | — | Thuộc tính proposal_rejection_note của bảng contracts |

## 19. Bảng `email_verification_tokens`

Token xác minh email đăng ký.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | user_id | uuid | FK → users(id) | Tham chiếu người dùng (users.id) |
| 2 | token | text | — | Chuỗi token bảo mật |
| 3 | expires_at | timestamp | — | Thời điểm hết hạn token |

## 20. Bảng `freelancer_exclusive_resources`

Tài nguyên độc quyền trên hồ sơ freelancer.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | freelancer_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu freelancer (users.id) |
| 3 | title | varchar(200) | NOT NULL | Thuộc tính title của bảng freelancer_exclusive_resources |
| 4 | description | text | — | Thuộc tính description của bảng freelancer_exclusive_resources |
| 5 | resource_type | varchar(20) | NOT NULL; DEFAULT link | Thuộc tính resource_type của bảng freelancer_exclusive_resources |
| 6 | link_url | varchar(500) | — | Thuộc tính link_url của bảng freelancer_exclusive_resources |
| 7 | file_url | varchar(500) | — | Thuộc tính file_url của bảng freelancer_exclusive_resources |
| 8 | file_name | varchar(255) | — | Thuộc tính file_name của bảng freelancer_exclusive_resources |
| 9 | created_at | timestamptz | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 10 | deleted_at | timestamptz | — | Thời điểm xóa mềm (NULL = còn hiệu lực) |

## 21. Bảng `freelancer_payout_accounts`

Tài khoản ngân hàng nhận rút tiền của freelancer.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | user_id | uuid | PK; FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 2 | bank_name | varchar(120) | NOT NULL | Thuộc tính bank_name của bảng freelancer_payout_accounts |
| 3 | account_holder_name | varchar(255) | NOT NULL | Thuộc tính account_holder_name của bảng freelancer_payout_accounts |
| 4 | account_number | varchar(32) | NOT NULL | Thuộc tính account_number của bảng freelancer_payout_accounts |
| 5 | linked_at | timestamp | NOT NULL; DEFAULT hiện tại | Thuộc tính linked_at của bảng freelancer_payout_accounts |
| 6 | updated_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm cập nhật gần nhất |
| 7 | bank_bin | varchar(6) | — | Thuộc tính bank_bin của bảng freelancer_payout_accounts |

## 22. Bảng `freelancer_portfolios`

Dự án portfolio trên hồ sơ freelancer.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | freelancer_id | uuid | FK → freelancer_profiles(user_id) ON DELETE CASCADE; NOT NULL | Tham chiếu freelancer (users.id) |
| 3 | title | varchar(255) | NOT NULL | Thuộc tính title của bảng freelancer_portfolios |
| 4 | description | text | — | Thuộc tính description của bảng freelancer_portfolios |
| 5 | project_url | text | — | Thuộc tính project_url của bảng freelancer_portfolios |
| 6 | images | jsonb | DEFAULT [] | Thuộc tính images của bảng freelancer_portfolios |
| 7 | created_at | timestamp | DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 8 | updated_at | timestamp | DEFAULT hiện tại | Thời điểm cập nhật gần nhất |
| 9 | deleted_at | timestamp | — | Thời điểm xóa mềm (NULL = còn hiệu lực) |

## 23. Bảng `freelancer_profile_files`

File tải lên trên hồ sơ freelancer.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | freelancer_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu freelancer (users.id) |
| 3 | title | varchar(200) | NOT NULL | Thuộc tính title của bảng freelancer_profile_files |
| 4 | description | text | — | Thuộc tính description của bảng freelancer_profile_files |
| 5 | file_url | varchar(500) | NOT NULL | Thuộc tính file_url của bảng freelancer_profile_files |
| 6 | file_name | varchar(255) | — | Thuộc tính file_name của bảng freelancer_profile_files |
| 7 | file_size | integer | — | Thuộc tính file_size của bảng freelancer_profile_files |
| 8 | mime_type | varchar(120) | — | Thuộc tính mime_type của bảng freelancer_profile_files |
| 9 | created_at | timestamptz | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 10 | deleted_at | timestamptz | — | Thời điểm xóa mềm (NULL = còn hiệu lực) |

## 24. Bảng `freelancer_profiles`

Hồ sơ nghề nghiệp của freelancer.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | user_id | uuid | PK; FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 2 | title | varchar(255) | — | Thuộc tính title của bảng freelancer_profiles |
| 3 | hourly_rate | numeric(10,2) | — | Thuộc tính hourly_rate của bảng freelancer_profiles |
| 4 | experience_years | integer | — | Thuộc tính experience_years của bảng freelancer_profiles |
| 5 | availability_status | varchar(50) | — | Thuộc tính availability_status của bảng freelancer_profiles |
| 6 | total_earnings | numeric(12,2) | DEFAULT 0 | Thuộc tính total_earnings của bảng freelancer_profiles |
| 7 | rating_avg | numeric(3,2) | DEFAULT 0 | Thuộc tính rating_avg của bảng freelancer_profiles |
| 8 | total_reviews | integer | DEFAULT 0 | Thuộc tính total_reviews của bảng freelancer_profiles |
| 9 | languages | jsonb | DEFAULT [] | Thuộc tính languages của bảng freelancer_profiles |
| 10 | deleted_at | timestamp | — | Thời điểm xóa mềm (NULL = còn hiệu lực) |
| 11 | created_at | timestamptz | DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 12 | updated_at | timestamptz | DEFAULT hiện tại | Thời điểm cập nhật gần nhất |
| 13 | job_success_score | smallint | — | Điểm thành công hợp đồng (0–100), nhập thủ công hoặc cập nhật từ batch sau. |
| 14 | avg_response_minutes | integer | — | Thời gian phản hồi trung bình (phút), phục vụ hiển thị “trả lời trong X giờ”. |
| 15 | profile_badges | jsonb | NOT NULL; DEFAULT [] | Mảng chuỗi huy hiệu/hạn ngữ hiển thị trên hồ sơ (vd: Top Rated, Đã xác thực địa phương). |

## 25. Bảng `freelancer_withdrawal_orders`

Lệnh rút tiền qua PayOS.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | user_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 3 | reference_id | varchar(64) | UNIQUE; NOT NULL | Thuộc tính reference_id của bảng freelancer_withdrawal_orders |
| 4 | amount | numeric(18,2) | NOT NULL | Số tiền (VND) |
| 5 | status | varchar(24) | NOT NULL; DEFAULT PENDING_AUTH | Trạng thái nghiệp vụ |
| 6 | payos_payout_id | varchar(128) | — | Thuộc tính payos_payout_id của bảng freelancer_withdrawal_orders |
| 7 | payos_tx_id | varchar(128) | — | Thuộc tính payos_tx_id của bảng freelancer_withdrawal_orders |
| 8 | payos_tx_state | varchar(32) | — | Thuộc tính payos_tx_state của bảng freelancer_withdrawal_orders |
| 9 | bank_name | varchar(120) | NOT NULL | Thuộc tính bank_name của bảng freelancer_withdrawal_orders |
| 10 | account_holder_name | varchar(255) | NOT NULL | Thuộc tính account_holder_name của bảng freelancer_withdrawal_orders |
| 11 | account_last4 | varchar(4) | NOT NULL; DEFAULT '' | Thuộc tính account_last4 của bảng freelancer_withdrawal_orders |
| 12 | to_bin | varchar(6) | NOT NULL | Thuộc tính to_bin của bảng freelancer_withdrawal_orders |
| 13 | to_account_number | varchar(32) | NOT NULL | Thuộc tính to_account_number của bảng freelancer_withdrawal_orders |
| 14 | description | varchar(100) | — | Thuộc tính description của bảng freelancer_withdrawal_orders |
| 15 | failure_reason | text | — | Thuộc tính failure_reason của bảng freelancer_withdrawal_orders |
| 16 | transaction_id | uuid | FK → transactions(id) ON DELETE SET NULL | Tham chiếu giao dịch (transactions.id) |
| 17 | auth_verified_at | timestamp | — | Thuộc tính auth_verified_at của bảng freelancer_withdrawal_orders |
| 18 | paid_at | timestamp | — | Thuộc tính paid_at của bảng freelancer_withdrawal_orders |
| 19 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 20 | updated_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm cập nhật gần nhất |

## 26. Bảng `freelancer_withdrawal_pins`

Mã PIN bảo vệ thao tác rút tiền.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | user_id | uuid | PK; FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 2 | pin_hash | varchar(255) | NOT NULL | Thuộc tính pin_hash của bảng freelancer_withdrawal_pins |
| 3 | failed_attempts | smallint | NOT NULL; DEFAULT 0 | Thuộc tính failed_attempts của bảng freelancer_withdrawal_pins |
| 4 | locked_until | timestamp | — | Thuộc tính locked_until của bảng freelancer_withdrawal_pins |
| 5 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 6 | updated_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm cập nhật gần nhất |

## 27. Bảng `identity_verifications`

Hồ sơ xác minh danh tính (KYC).

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | user_id | uuid | PK; FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 2 | account_type | varchar(20) | NOT NULL; DEFAULT personal | Thuộc tính account_type của bảng identity_verifications |
| 3 | use_existing_account_info | boolean | NOT NULL; DEFAULT true | Thuộc tính use_existing_account_info của bảng identity_verifications |
| 4 | legal_first_name | varchar(100) | — | Thuộc tính legal_first_name của bảng identity_verifications |
| 5 | legal_last_name | varchar(100) | — | Thuộc tính legal_last_name của bảng identity_verifications |
| 6 | address_search | varchar(255) | — | Thuộc tính address_search của bảng identity_verifications |
| 7 | address_street | varchar(255) | — | Thuộc tính address_street của bảng identity_verifications |
| 8 | address_country | varchar(100) | DEFAULT Việt Nam | Thuộc tính address_country của bảng identity_verifications |
| 9 | address_state | varchar(100) | — | Thuộc tính address_state của bảng identity_verifications |
| 10 | address_city | varchar(100) | — | Thuộc tính address_city của bảng identity_verifications |
| 11 | address_postal | varchar(20) | — | Thuộc tính address_postal của bảng identity_verifications |
| 12 | contact_confirmed | boolean | NOT NULL; DEFAULT false | Thuộc tính contact_confirmed của bảng identity_verifications |
| 13 | contact_confirmed_at | timestamp | — | Thuộc tính contact_confirmed_at của bảng identity_verifications |
| 14 | selfie_url | varchar(500) | — | Thuộc tính selfie_url của bảng identity_verifications |
| 15 | id_doc_type | varchar(50) | — | Thuộc tính id_doc_type của bảng identity_verifications |
| 16 | id_front_url | varchar(500) | — | Thuộc tính id_front_url của bảng identity_verifications |
| 17 | id_back_url | varchar(500) | — | Thuộc tính id_back_url của bảng identity_verifications |
| 18 | address_proof_type | varchar(50) | — | Thuộc tính address_proof_type của bảng identity_verifications |
| 19 | address_proof_url | varchar(500) | — | Thuộc tính address_proof_url của bảng identity_verifications |
| 20 | phone_submitted_at | timestamp | — | Thuộc tính phone_submitted_at của bảng identity_verifications |
| 21 | photo_submitted_at | timestamp | — | Thuộc tính photo_submitted_at của bảng identity_verifications |
| 22 | id_submitted_at | timestamp | — | Thuộc tính id_submitted_at của bảng identity_verifications |
| 23 | address_proof_submitted_at | timestamp | — | Thuộc tính address_proof_submitted_at của bảng identity_verifications |
| 24 | submitted_for_review_at | timestamp | — | Thuộc tính submitted_for_review_at của bảng identity_verifications |
| 25 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 26 | updated_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm cập nhật gần nhất |
| 27 | card_last4 | varchar(4) | — | Thuộc tính card_last4 của bảng identity_verifications |
| 28 | card_brand | varchar(20) | — | Thuộc tính card_brand của bảng identity_verifications |
| 29 | card_expiry | varchar(7) | — | Thuộc tính card_expiry của bảng identity_verifications |
| 30 | cardholder_name | varchar(120) | — | Thuộc tính cardholder_name của bảng identity_verifications |
| 31 | is_business_card | boolean | NOT NULL; DEFAULT false | Thuộc tính is_business_card của bảng identity_verifications |
| 32 | billing_street | varchar(255) | — | Thuộc tính billing_street của bảng identity_verifications |
| 33 | billing_country | varchar(100) | — | Thuộc tính billing_country của bảng identity_verifications |
| 34 | billing_state | varchar(100) | — | Thuộc tính billing_state của bảng identity_verifications |
| 35 | billing_city | varchar(100) | — | Thuộc tính billing_city của bảng identity_verifications |
| 36 | billing_postal | varchar(20) | — | Thuộc tính billing_postal của bảng identity_verifications |
| 37 | billing_phone | varchar(40) | — | Thuộc tính billing_phone của bảng identity_verifications |
| 38 | billing_currency | varchar(40) | DEFAULT VND | Thuộc tính billing_currency của bảng identity_verifications |
| 39 | card_charge_cents | integer | — | Số tiền tạm trừ xác minh (cent USD), người dùng nhập lại để xác nhận. |
| 40 | card_added_at | timestamp | — | Thuộc tính card_added_at của bảng identity_verifications |
| 41 | card_verified_at | timestamp | — | Thuộc tính card_verified_at của bảng identity_verifications |
| 42 | address_lat | double precision | — | Vĩ độ từ GPS hoặc chọn trên bản đồ (Nominatim). |
| 43 | address_lng | double precision | — | Kinh độ từ GPS hoặc chọn trên bản đồ (Nominatim). |
| 44 | admin_review_status | varchar(20) | — | pending |
| 45 | admin_reviewed_at | timestamp | — | Thuộc tính admin_reviewed_at của bảng identity_verifications |
| 46 | admin_reviewed_by | uuid | FK → users(id) ON DELETE SET NULL | Thuộc tính admin_reviewed_by của bảng identity_verifications |
| 47 | admin_review_note | text | — | Thuộc tính admin_review_note của bảng identity_verifications |

## 28. Bảng `job_quotes`

Báo giá / đề xuất của freelancer cho job.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | job_id | uuid | FK → jobs(id) ON DELETE CASCADE; NOT NULL | Tham chiếu tin tuyển dụng (jobs.id) |
| 3 | freelancer_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu freelancer (users.id) |
| 4 | amount | numeric(12,2) | — | Số tiền (VND) |
| 5 | currency | char(3) | NOT NULL; DEFAULT USD | Mã tiền tệ (VD: VND) |
| 6 | message | text | — | Thuộc tính message của bảng job_quotes |
| 7 | status | varchar(20) | NOT NULL; DEFAULT pending | Trạng thái nghiệp vụ |
| 8 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 9 | updated_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm cập nhật gần nhất |
| 10 | pricing_type | varchar(20) | NOT NULL; DEFAULT fixed | fixed = trọn gói dự án, hourly = theo giờ. |

## 29. Bảng `jobs`

Tin tuyển dụng / dự án do client đăng.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | client_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu client (users.id) |
| 3 | title | varchar(255) | NOT NULL | Thuộc tính title của bảng jobs |
| 4 | description | text | — | Thuộc tính description của bảng jobs |
| 5 | budget | numeric(12,2) | — | Thuộc tính budget của bảng jobs |
| 6 | status | varchar(20) | DEFAULT open | Trạng thái nghiệp vụ |
| 7 | created_at | timestamp | DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 8 | updated_at | timestamp | DEFAULT hiện tại | Thời điểm cập nhật gần nhất |
| 9 | images | jsonb | NOT NULL; DEFAULT [] | Mảng URL ảnh đính kèm tin (tối đa 3) |
| 10 | due_at | timestamp | — | Thời điểm mong muốn hoàn thành (tùy chọn, gấp) |
| 11 | location_label | text | — | Mô tả địa điểm làm việc do client nhập (VD: TP. Vĩnh Long — phường 1) |
| 12 | location_lat | double precision | — | Vĩ độ khi client dùng GPS lúc đăng tin (tùy chọn) |
| 13 | location_lng | double precision | — | Kinh độ khi client dùng GPS lúc đăng tin (tùy chọn) |
| 14 | category | varchar(255) | — | Danh mục việc (hiển thị trên card Find Work) |
| 15 | tags | jsonb | NOT NULL; DEFAULT [] | Thẻ kỹ năng / từ khóa (mảng chuỗi JSON) |
| 16 | budget_type | varchar(20) | NOT NULL; DEFAULT fixed | fixed = trọn gói, hourly = theo giờ (budget = mức giờ hoặc ngân sách chính). |
| 17 | budget_max | numeric(12,2) | — | Ngân sách tối đa / trần dự án (VND). |
| 18 | deleted_at | timestamp | — | Client xóa mềm tin — không hiển thị trong quản lý / danh sách của client |

## 30. Bảng `ledger_entries`

Bút toán sổ cái kế toán nội bộ.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | transaction_id | uuid | FK → transactions(id); NOT NULL | Tham chiếu giao dịch (transactions.id) |
| 3 | account_id | uuid | FK → accounts(id); NOT NULL | Thuộc tính account_id của bảng ledger_entries |
| 4 | amount | numeric(18,2) | NOT NULL | Số tiền (VND) |
| 5 | direction | varchar(10) | — | Thuộc tính direction của bảng ledger_entries |
| 6 | created_at | timestamp | DEFAULT hiện tại | Thời điểm tạo bản ghi |

## 31. Bảng `login_attempts`

Lịch sử thử đăng nhập (thành công/thất bại).

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | email | varchar(255) | NOT NULL | Địa chỉ email |
| 3 | ip_address | varchar(45) | NOT NULL | Thuộc tính ip_address của bảng login_attempts |
| 4 | success | boolean | NOT NULL | Thuộc tính success của bảng login_attempts |
| 5 | attempted_at | timestamp | DEFAULT hiện tại | Thuộc tính attempted_at của bảng login_attempts |

## 32. Bảng `notifications`

Thông báo in-app cho người dùng.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | user_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 3 | category | varchar(32) | NOT NULL; DEFAULT system | Thuộc tính category của bảng notifications |
| 4 | action | varchar(64) | NOT NULL | Thuộc tính action của bảng notifications |
| 5 | title | varchar(255) | NOT NULL | Thuộc tính title của bảng notifications |
| 6 | body | text | NOT NULL; DEFAULT '' | Thuộc tính body của bảng notifications |
| 7 | href | varchar(512) | — | Thuộc tính href của bảng notifications |
| 8 | actor_id | uuid | FK → users(id) ON DELETE SET NULL | Thuộc tính actor_id của bảng notifications |
| 9 | actor_name | varchar(255) | — | Thuộc tính actor_name của bảng notifications |
| 10 | entity_type | varchar(32) | — | Thuộc tính entity_type của bảng notifications |
| 11 | entity_id | uuid | — | Thuộc tính entity_id của bảng notifications |
| 12 | read_at | timestamptz | — | Thuộc tính read_at của bảng notifications |
| 13 | deleted_at | timestamptz | — | Thời điểm xóa mềm (NULL = còn hiệu lực) |
| 14 | created_at | timestamptz | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |

## 33. Bảng `oauth_accounts`

Liên kết tài khoản OAuth (Google, ...).

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | user_id | uuid | FK → users(id) | Tham chiếu người dùng (users.id) |
| 2 | provider | varchar(50) | PK; NOT NULL | Thuộc tính provider của bảng oauth_accounts |
| 3 | provider_user_id | varchar(255) | PK; NOT NULL | Thuộc tính provider_user_id của bảng oauth_accounts |

## 34. Bảng `password_reset_tokens`

Token đặt lại mật khẩu.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | user_id | uuid | FK → users(id) | Tham chiếu người dùng (users.id) |
| 2 | token | text | — | Chuỗi token bảo mật |
| 3 | expires_at | timestamp | — | Thời điểm hết hạn token |

## 35. Bảng `profile_analytics_events`

Sự kiện phân tích lượt xem hồ sơ/dịch vụ.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | freelancer_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu freelancer (users.id) |
| 3 | event_type | varchar(40) | NOT NULL | Thuộc tính event_type của bảng profile_analytics_events |
| 4 | service_id | uuid | FK → services(id) ON DELETE SET NULL | Tham chiếu dịch vụ (services.id) |
| 5 | portfolio_id | uuid | FK → freelancer_portfolios(id) ON DELETE SET NULL | Thuộc tính portfolio_id của bảng profile_analytics_events |
| 6 | metadata | jsonb | NOT NULL; DEFAULT {} | Thuộc tính metadata của bảng profile_analytics_events |
| 7 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |

## 36. Bảng `refresh_tokens`

Refresh token phiên đăng nhập.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | user_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 3 | token | text | UNIQUE; NOT NULL | Chuỗi token bảo mật |
| 4 | expires_at | timestamp | NOT NULL | Thời điểm hết hạn token |
| 5 | ip_address | varchar(45) | — | Thuộc tính ip_address của bảng refresh_tokens |
| 6 | user_agent | text | — | Thuộc tính user_agent của bảng refresh_tokens |
| 7 | is_revoked | boolean | DEFAULT false | Thuộc tính is_revoked của bảng refresh_tokens |
| 8 | created_at | timestamp | DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 9 | revoked_at | timestamp | — | Thuộc tính revoked_at của bảng refresh_tokens |

## 37. Bảng `reviews`

Đánh giá người dùng (bảng legacy).

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | contract_id | uuid | FK → contracts(id) ON DELETE CASCADE | Tham chiếu hợp đồng (contracts.id) |
| 3 | reviewer_id | uuid | FK → users(id) | Thuộc tính reviewer_id của bảng reviews |
| 4 | reviewee_id | uuid | FK → users(id) | Thuộc tính reviewee_id của bảng reviews |
| 5 | rating | integer | — | Thuộc tính rating của bảng reviews |
| 6 | comment | text | — | Thuộc tính comment của bảng reviews |
| 7 | created_at | timestamp | DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 8 | deleted_at | timestamp | — | Thời điểm xóa mềm (NULL = còn hiệu lực) |

## 38. Bảng `saved_jobs`

Job được freelancer lưu lại.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | freelancer_id | uuid | FK → users(id) ON DELETE CASCADE; UNIQUE; NOT NULL | Tham chiếu freelancer (users.id) |
| 3 | job_id | uuid | FK → jobs(id) ON DELETE CASCADE; UNIQUE; NOT NULL | Tham chiếu tin tuyển dụng (jobs.id) |
| 4 | saved_at | timestamp | NOT NULL; DEFAULT hiện tại | Thuộc tính saved_at của bảng saved_jobs |

## 39. Bảng `schema_migrations`

Theo dõi file migration SQL đã áp dụng.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | integer | PK; NOT NULL; DEFAULT tự tăng | Khóa chính / định danh bản ghi |
| 2 | filename | varchar(255) | UNIQUE; NOT NULL | Thuộc tính filename của bảng schema_migrations |
| 3 | applied_at | timestamptz | NOT NULL; DEFAULT hiện tại | Thuộc tính applied_at của bảng schema_migrations |

## 40. Bảng `service_categories`

Danh mục dịch vụ chuẩn.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | integer | PK; NOT NULL; DEFAULT tự tăng | Khóa chính / định danh bản ghi |
| 2 | name | varchar(200) | UNIQUE; NOT NULL | Thuộc tính name của bảng service_categories |
| 3 | sort_order | integer | NOT NULL; DEFAULT 0 | Thuộc tính sort_order của bảng service_categories |

## 41. Bảng `services`

Gói dịch vụ freelancer đăng bán.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | freelancer_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu freelancer (users.id) |
| 3 | title | varchar(255) | NOT NULL | Thuộc tính title của bảng services |
| 4 | description | text | — | Thuộc tính description của bảng services |
| 5 | price | numeric(12,2) | NOT NULL | Thuộc tính price của bảng services |
| 6 | delivery_days | integer | — | Thuộc tính delivery_days của bảng services |
| 7 | created_at | timestamp | DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 8 | updated_at | timestamp | DEFAULT hiện tại | Thời điểm cập nhật gần nhất |
| 9 | category | varchar(255) | — | Thuộc tính category của bảng services |
| 10 | media_urls | jsonb | NOT NULL; DEFAULT [] | Thuộc tính media_urls của bảng services |
| 11 | packages | jsonb | NOT NULL; DEFAULT [] | Thuộc tính packages của bảng services |
| 12 | tech_stack | jsonb | NOT NULL; DEFAULT [] | Thuộc tính tech_stack của bảng services |
| 13 | requirements | text | — | Thuộc tính requirements của bảng services |
| 14 | faqs | jsonb | NOT NULL; DEFAULT [] | Thuộc tính faqs của bảng services |
| 15 | response_time_hours | integer | — | Thuộc tính response_time_hours của bảng services |
| 16 | support_upsell | varchar(255) | — | Thuộc tính support_upsell của bảng services |
| 17 | demo_media | jsonb | — | Một file giới thiệu/demo: {"url":"...","kind":"image" |
| 18 | thumbnail_url | varchar(2000) | — | Ảnh đại diện hiển thị trên card dịch vụ (URL https hoặc /uploads/services/...) |
| 19 | listing_status | varchar(32) | NOT NULL; DEFAULT active | Thuộc tính listing_status của bảng services |
| 20 | admin_note | text | — | Thuộc tính admin_note của bảng services |
| 21 | published_at | timestamp | — | Thuộc tính published_at của bảng services |

## 42. Bảng `site_contact`

Thông tin liên hệ chung của website.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | smallint | PK; NOT NULL; DEFAULT 1 | Khóa chính / định danh bản ghi |
| 2 | email | text | NOT NULL; DEFAULT '' | Địa chỉ email |
| 3 | phone | text | NOT NULL; DEFAULT '' | Thuộc tính phone của bảng site_contact |
| 4 | address | text | NOT NULL; DEFAULT '' | Thuộc tính address của bảng site_contact |
| 5 | updated_at | timestamptz | NOT NULL; DEFAULT hiện tại | Thời điểm cập nhật gần nhất |

## 43. Bảng `skills`

Danh mục kỹ năng chuẩn.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | integer | PK; NOT NULL; DEFAULT tự tăng | Khóa chính / định danh bản ghi |
| 2 | name | varchar(100) | UNIQUE; NOT NULL | Thuộc tính name của bảng skills |

## 44. Bảng `spatial_ref_sys`

Hệ tọa độ tham chiếu PostGIS (hệ thống).

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | srid | integer | PK; NOT NULL | Thuộc tính srid của bảng spatial_ref_sys |
| 2 | auth_name | varchar(256) | — | Thuộc tính auth_name của bảng spatial_ref_sys |
| 3 | auth_srid | integer | — | Thuộc tính auth_srid của bảng spatial_ref_sys |
| 4 | srtext | varchar(2048) | — | Thuộc tính srtext của bảng spatial_ref_sys |
| 5 | proj4text | varchar(2048) | — | Thuộc tính proj4text của bảng spatial_ref_sys |

## 45. Bảng `transactions`

Giao dịch tài chính (nạp, rút, thanh toán, ...).

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | contract_id | uuid | FK → contracts(id) | Tham chiếu hợp đồng (contracts.id) |
| 3 | type | varchar(50) | NOT NULL | Thuộc tính type của bảng transactions |
| 4 | status | varchar(30) | NOT NULL | Trạng thái nghiệp vụ |
| 5 | idempotency_key | text | UNIQUE | Thuộc tính idempotency_key của bảng transactions |
| 6 | created_at | timestamp | DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 7 | user_id | uuid | FK → users(id) ON DELETE SET NULL | Tham chiếu người dùng (users.id) |
| 8 | amount | numeric(18,2) | — | Số tiền (VND) |
| 9 | currency | char(3) | DEFAULT VND | Mã tiền tệ (VD: VND) |
| 10 | direction | varchar(10) | — | Thuộc tính direction của bảng transactions |
| 11 | category | varchar(40) | — | Thuộc tính category của bảng transactions |
| 12 | job_id | uuid | FK → jobs(id) ON DELETE SET NULL | Tham chiếu tin tuyển dụng (jobs.id) |
| 13 | freelancer_id | uuid | FK → users(id) ON DELETE SET NULL | Tham chiếu freelancer (users.id) |
| 14 | description | text | — | Thuộc tính description của bảng transactions |
| 15 | occurred_at | timestamp | DEFAULT hiện tại | Thuộc tính occurred_at của bảng transactions |

## 46. Bảng `user_login_logs`

Lịch sử đăng nhập thành công.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | user_id | uuid | FK → users(id) | Tham chiếu người dùng (users.id) |
| 3 | ip_address | inet | — | Thuộc tính ip_address của bảng user_login_logs |
| 4 | user_agent | text | — | Thuộc tính user_agent của bảng user_login_logs |
| 5 | logged_in_at | timestamp | DEFAULT hiện tại | Thuộc tính logged_in_at của bảng user_login_logs |

## 47. Bảng `user_payout_methods`

Phương thức nhận tiền (legacy).

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | user_id | uuid | FK → users(id) | Tham chiếu người dùng (users.id) |
| 3 | provider | varchar(50) | — | Thuộc tính provider của bảng user_payout_methods |
| 4 | provider_account_id | text | — | Thuộc tính provider_account_id của bảng user_payout_methods |
| 5 | is_default | boolean | DEFAULT false | Thuộc tính is_default của bảng user_payout_methods |

## 48. Bảng `user_profiles`

Thông tin hồ sơ cá nhân người dùng.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | user_id | uuid | PK; FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 2 | full_name | varchar(255) | — | Thuộc tính full_name của bảng user_profiles |
| 3 | avatar_url | text | — | Thuộc tính avatar_url của bảng user_profiles |
| 4 | phone | varchar(20) | — | Thuộc tính phone của bảng user_profiles |
| 5 | date_of_birth | date | — | Thuộc tính date_of_birth của bảng user_profiles |
| 6 | gender | varchar(20) | — | Thuộc tính gender của bảng user_profiles |
| 7 | bio | text | — | Thuộc tính bio của bảng user_profiles |
| 8 | website | text | — | Thuộc tính website của bảng user_profiles |
| 9 | updated_at | timestamp | DEFAULT hiện tại | Thời điểm cập nhật gần nhất |
| 10 | location | geography | — | Thuộc tính location của bảng user_profiles |
| 11 | tagline | varchar(220) | — | Dòng định vị ngắn hiển thị dưới tên (vd: Chuyên gia Full-Stack |
| 12 | district_city | varchar(180) | — | Địa danh hiển thị cấp quận/huyện/thị xã/thành phố (hyper-local). |
| 13 | city | varchar(120) | — | Thành phố / đô thị (hiển thị tìm kiếm freelancer). |
| 14 | state_province | varchar(120) | — | Bang / tỉnh / vùng. |
| 15 | country | varchar(120) | — | Quốc gia hiển thị trên card employer (job list). |
| 16 | client_satisfaction_score | smallint | — | Điểm hài lòng employer 0–100 (tùy chọn, hiển thị trên card). |
| 17 | cover_url | varchar(500) | — | URL ảnh bìa hồ sơ freelancer (tải qua upload dịch vụ / lưu đường dẫn tương đối). |

## 49. Bảng `user_skills`

Kỹ năng gắn với người dùng.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | user_id | uuid | PK; FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 2 | skill_id | integer | PK; FK → skills(id); NOT NULL | Thuộc tính skill_id của bảng user_skills |
| 3 | level | varchar(20) | — | Thuộc tính level của bảng user_skills |
| 4 | years_of_experience | integer | DEFAULT 0 | Thuộc tính years_of_experience của bảng user_skills |

## 50. Bảng `users`

Tài khoản người dùng hệ thống.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | email | varchar(255) | UNIQUE; NOT NULL | Địa chỉ email |
| 3 | password_hash | text | NOT NULL | Mật khẩu đã băm |
| 4 | role | varchar(20) | NOT NULL | Vai trò: client \| freelancer \| admin |
| 5 | status | varchar(20) | DEFAULT active | Trạng thái nghiệp vụ |
| 6 | is_email_verified | boolean | DEFAULT false | Thuộc tính is_email_verified của bảng users |
| 7 | is_phone_verified | boolean | DEFAULT false | Thuộc tính is_phone_verified của bảng users |
| 8 | created_at | timestamp | DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 9 | updated_at | timestamp | DEFAULT hiện tại | Thời điểm cập nhật gần nhất |
| 10 | deleted_at | timestamp | — | Thời điểm xóa mềm (NULL = còn hiệu lực) |
| 11 | google_id | varchar(255) | — | Thuộc tính google_id của bảng users |
| 12 | password_user_set_at | timestamp | — | Thuộc tính password_user_set_at của bảng users |
| 13 | recovery_email | varchar(255) | — | Email khôi phục (có thể khác email đăng nhập) |
| 14 | recovery_phone | varchar(40) | — | SĐT khôi phục (có thể khác SĐT hồ sơ) |
| 15 | login_alerts_enabled | boolean | NOT NULL; DEFAULT true | Gửi cảnh báo khi đăng nhập từ IP/thiết bị mới |
| 16 | deactivated_at | timestamp | — | Tài khoản tạm khóa bởi người dùng |
| 17 | notification_prefs | jsonb | NOT NULL; DEFAULT {"orders": true, "quotes": true, "messages": true, "emailDigest": false} | Tùy chọn thông báo in-app: orders, messages, quotes |

## 51. Bảng `wallet_deposit_orders`

Đơn nạp ví qua cổng PayOS.

| STT | Thuộc tính | Kiểu dữ liệu | Ràng buộc | Diễn giải |
|-----|------------|--------------|-----------|----------|
| 1 | id | uuid | PK; NOT NULL; DEFAULT gen_random_uuid() | Khóa chính / định danh bản ghi |
| 2 | user_id | uuid | FK → users(id) ON DELETE CASCADE; NOT NULL | Tham chiếu người dùng (users.id) |
| 3 | order_code | bigint | UNIQUE; NOT NULL | Thuộc tính order_code của bảng wallet_deposit_orders |
| 4 | amount | numeric(18,2) | NOT NULL | Số tiền (VND) |
| 5 | type | varchar(20) | NOT NULL; DEFAULT DEPOSIT | Thuộc tính type của bảng wallet_deposit_orders |
| 6 | status | varchar(20) | NOT NULL; DEFAULT PENDING | Trạng thái nghiệp vụ |
| 7 | payment_link_id | varchar(128) | — | Thuộc tính payment_link_id của bảng wallet_deposit_orders |
| 8 | checkout_url | text | — | Thuộc tính checkout_url của bảng wallet_deposit_orders |
| 9 | payos_reference | varchar(128) | — | Thuộc tính payos_reference của bảng wallet_deposit_orders |
| 10 | transaction_id | uuid | FK → transactions(id) ON DELETE SET NULL | Tham chiếu giao dịch (transactions.id) |
| 11 | cancel_reason | text | — | Thuộc tính cancel_reason của bảng wallet_deposit_orders |
| 12 | paid_at | timestamp | — | Thuộc tính paid_at của bảng wallet_deposit_orders |
| 13 | created_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm tạo bản ghi |
| 14 | updated_at | timestamp | NOT NULL; DEFAULT hiện tại | Thời điểm cập nhật gần nhất |

