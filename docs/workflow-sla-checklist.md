# Checklist: SLA, hủy đơn, hoàn tiền & tranh chấp (5 giai đoạn workflow)

> Áp dụng cho đơn dịch vụ `/hire/orders/{id}` — luồng `selection → escrow → execution → delivery → completion`.

**Trạng thái triển khai:** Code Phase 0–D đã merge; **Phase E (notifications/badge dashboard)** và **mục Kiểm thử** chờ bạn xác nhận thủ công.

**SLA đã chốt:**

| Substate | Mốc đếm | SLA | Hành động tự động |
|----------|---------|-----|-------------------|
| Chờ đề xuất (GĐ1) | `created_at` / vào `selection` | 7 ngày | `expired` |
| Chờ chấp nhận đề xuất (GĐ1) | `proposal_submitted_at` | 7 ngày | `expired` |
| Chờ nạp Escrow (GĐ2) | chuyển sang `escrow` | 5 ngày | `expired` |
| Yêu cầu hủy & hoàn tiền (GĐ3) | Khách hàng mở request | 3 ngày FL phản hồi | auto-refund 100% |
| Chờ nghiệm thu (GĐ4) | `delivered_at` | 7 ngày | auto-accept + auto-release |
| Yêu cầu chỉnh sửa (GĐ4) | `revision_requested_at` | 3 ngày FL phản hồi | Khách hàng mở dispute |

Nhắc trước hết hạn: **48h** và **24h** (log + cờ `sla_reminder_*` trên `contracts`; email/notifications v2).

---

## Phase 0 — Chuẩn bị (bắt buộc trước code)

- [x] **Chốt spec** với giảng viên / nhóm: bảng SLA trên, ma trận quyền (Khách hàng / Freelancer / Admin).
- [x] **Vẽ state machine** — `docs/workflow-state-machine.md`.
- [x] **Cập nhật điều khoản / trang Help**: auto-hủy, auto-accept, auto-refund, dispute (`components/help/help-data.ts`).
- [x] **Chạy migration** `backend/sql/workflow_sla.sql` (đã chạy trên DB local).

---

## Phase A — Giai đoạn 1 & 2 (pre-Escrow)

### Database

- [x] Migration `backend/sql/workflow_sla.sql`:
  - [x] `contracts.stage_deadline_at`, `escrow_deadline_at`
  - [x] `contracts.cancelled_at`, `cancelled_by`, `cancel_reason`, `cancel_type`
  - [x] `contract_workflow_events` (audit)
- [x] Index: `(workflow_stage, stage_deadline_at)` cho cron.

### Backend API

- [x] `withdraw_proposal`, `reject_proposal`, `cancel_order`
- [x] Set / reset deadline khi tạo đơn, gửi proposal, accept, vào escrow
- [x] Cron `backend/scripts/workflow-sla-tick.js` + `setInterval` trong `backend/src/index.js`
- [x] Nhắc 48h / 24h (cờ DB; chưa gửi email)

### Frontend

- [x] Countdown trên `SelectionAgreementPanel`, `EscrowFundPanel` (`WorkflowDeadlineBanner`)
- [x] Nút Rút đề xuất / Từ chối / Hủy đơn
- [x] Trạng thái Hết hạn trên list `/hire/orders`, `/findwork/orders` (`orderDeadlineSubtitle`, `cancelTypeLabel`)
- [x] Copy Help: pre-Escrow hủy không phạt uy tín (mô tả trong Help → Hợp đồng)

### Kiểm thử Phase A *(bạn tick sau khi verify)*

- [ ] FL gửi proposal → Khách hàng không phản hồi 7 ngày → auto `expired`.
- [ ] Khách hàng accept → không nạp 5 ngày → auto `expired`, tiền chưa trừ.
- [ ] FL rút proposal / Khách hàng hủy thủ công → đúng trạng thái, không refund.

**Gợi ý test nhanh (PowerShell — thay `UUID-THAT` bằng id đơn thật, không dùng `<>`):**

```powershell
cd backend
npm run workflow:backdate -- b80b10d1-5bec-4bf2-9d27-7d254c2f2f6c 1
npm run workflow:sla
```

---

## Phase B — Giai đoạn 4: Auto-accept bàn giao

### Database

- [x] `contracts.delivery_review_deadline_at`, `auto_accepted_at`, `revision_requested_at`

### Backend

- [x] `mark_delivered` set deadline +7 ngày
- [x] `request_revision` tạm dừng deadline auto-accept
- [x] Cron: auto-accept + auto-release + `auto_accepted_at` + transaction
- [ ] Thông báo Khách hàng khi FL bàn giao *(chờ notifications v2)*

### Frontend

- [x] `DeliveryAcceptancePanel`: countdown + cảnh báo auto-accept
- [x] `CompletionReviewPanel`: banner “Đã tự động nghiệm thu”

### Kiểm thử Phase B *(bạn tick)*

- [ ] FL bàn giao → Khách hàng im lặng 7 ngày → auto accept + release tiền.
- [ ] Khách hàng yêu cầu sửa → đồng hồ dừng / gia hạn đúng.
- [ ] Khách hàng nghiệm thu thủ công trước deadline → không auto-accept.

---

## Phase C — Giai đoạn 3: Hủy & hoàn tiền (Escrow đã nạp)

### Database

- [x] Bảng `contract_cancel_requests`

### Backend

- [x] `request_cancel_refund`, `respond_cancel_request`
- [x] Cron auto-refund 100% sau 3 ngày không phản hồi
- [x] Không auto-refund nếu chưa có request từ Khách hàng

### Frontend

- [x] Nút Yêu cầu hủy & hoàn tiền (`ExecutionReviewPanel`)
- [x] FL banner phản hồi cancel request
- [x] Trang `/payments`: hiển thị giao dịch `refund` (type mapping)

### Kiểm thử Phase C *(bạn tick)*

- [ ] Khách hàng request → FL im lặng 3 ngày → refund 100%.
- [ ] FL phản đối → chuyển dispute hoặc chờ admin.

---

## Phase D — Dispute & Admin

### Database

- [x] Bảng `contract_disputes`
- [x] `contracts.status = disputed` khi mở tranh chấp

### Backend

- [x] `open_dispute`
- [x] Script admin: `npm run workflow:resolve-dispute -- <id> full_refund|release|dismiss`
- [ ] Cửa sời khiếu nại sau auto-accept *(optional, chưa làm)*

### Frontend

- [x] Nút Mở tranh chấp + form lý do (`DeliveryAcceptancePanel`, `ServiceOrderWorkflow`)
- [x] Admin: CLI script (chưa có trang admin web)
- [x] Help: liên hệ Support khi cần tư liệu

### Kiểm thử Phase D *(bạn tick)*

- [ ] Dispute mở → tiền Escrow không release thêm đến khi resolve.
- [ ] Admin full refund / release đúng số dư.

---

## Phase E — Giai đoạn 5 & thông báo

- [x] Đánh giá không bắt buộc — giữ như hiện tại
- [ ] (v2) Đánh giá ẩn
- [ ] Bảng `notifications` / email cho SLA tick
- [ ] Badge “Cần xử lý” trên `/dashboard`, `/manage` theo deadline

---

## Hạ tầng & vận hành

- [x] **Scheduler**: `setInterval` backend + `npm run workflow:sla`
- [x] **Logging**: `contract_workflow_events`
- [ ] **Feature flag** từng phase *(optional)*
- [x] **Seed / test**: `npm run workflow:backdate`

---

## Tài liệu DATN (deliverables)

- [x] State machine trong repo (`docs/workflow-state-machine.md`)
- [ ] Sequence diagram trong báo cáo Word/PDF
- [ ] Bảng test case manual (tick mục Kiểm thử Phase A–D)
- [ ] Ảnh chụp UI countdown / nút hủy

---

## Thứ tự ưu tiên đề xuất

1. **Phase 0 + A** — ít rủi ro, giải quyết đơn treo pre-Escrow.
2. **Phase B** — bảo vệ Freelancer.
3. **Phase C** — refund ledger.
4. **Phase D + E** — admin + polish.

---

## File code liên quan

| Khu vực | File |
|---------|------|
| Migration SLA | `backend/sql/workflow_sla.sql` |
| SLA engine | `backend/src/utils/workflowSla.js` |
| Workflow API | `backend/src/controllers/contractWorkflow.controller.js` |
| UI 5 giai đoạn | `components/orders/ServiceOrderWorkflow.tsx`, `*Panel.tsx` |
| Hiển thị list | `lib/orders/serviceOrderDisplay.ts`, `workflowSlaDisplay.ts` |
| Thanh toán / refund | `backend/src/controllers/payments.controller.js` |
| Cron scripts | `backend/scripts/workflow-sla-tick.js`, `workflow-sla-backdate.js`, `resolve-dispute.js` |

---

*Cập nhật: triển khai code SLA — chờ kiểm thử manual Phase A–D.*
