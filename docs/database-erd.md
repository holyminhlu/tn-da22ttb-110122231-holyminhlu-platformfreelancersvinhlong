# VL Connected — ERD đầy đủ 51 bảng

> Tự sinh từ PostgreSQL `vl_freelancer`. Một sơ đồ duy nhất: tất cả bảng và quan hệ FK.
>
> **Ký hiệu:** `||--||` = 1-1 · `||--o{` = 1-n · `}o--o{` = n-n

## Sơ đồ ERD

```mermaid
erDiagram
    accounts ||--o{ ledger_entries : "1-n account_id"
    chat_conversations }o--o{ chat_conversation_user_state : "n-n conversation_id"
    chat_conversations ||--o{ chat_messages : "1-n conversation_id"
    contract_disputes ||--o{ contract_dispute_messages : "1-n dispute_id"
    contracts ||--o{ contract_cancel_requests : "1-n contract_id"
    contracts ||--o{ contract_disputes : "1-n contract_id"
    contracts ||--o{ contract_milestones : "1-n contract_id"
    contracts ||--o{ contract_progress_entries : "1-n contract_id"
    contracts ||--|| contract_reviews : "1-1 contract_id"
    contracts ||--o{ contract_workflow_events : "1-n contract_id"
    contracts ||--|| reviews : "1-1 contract_id"
    contracts ||--o{ transactions : "1-n contract_id"
    freelancer_portfolios ||--o{ profile_analytics_events : "1-n portfolio_id"
    freelancer_profiles ||--o{ freelancer_portfolios : "1-n freelancer_id"
    job_quotes ||--o{ chat_conversations : "1-n job_quote_id"
    jobs ||--o{ contract_reviews : "1-n job_id"
    jobs ||--o{ contracts : "1-n job_id"
    jobs ||--o{ job_quotes : "1-n job_id"
    jobs }o--o{ saved_jobs : "n-n job_id"
    jobs ||--o{ transactions : "1-n job_id"
    services ||--o{ chat_conversations : "1-n service_id"
    services ||--o{ contracts : "1-n service_id"
    services ||--o{ profile_analytics_events : "1-n service_id"
    skills }o--o{ user_skills : "n-n skill_id"
    transactions ||--|| billing_invoices : "1-1 transaction_id"
    transactions ||--o{ freelancer_withdrawal_orders : "1-n transaction_id"
    transactions ||--o{ ledger_entries : "1-n transaction_id"
    transactions ||--o{ wallet_deposit_orders : "1-n transaction_id"
    users ||--o{ accounts : "1-n user_id"
    users ||--o{ billing_invoices : "1-n user_id"
    users }o--o{ chat_blocks : "n-n blocked_id"
    users }o--o{ chat_blocks : "n-n blocker_id"
    users }o--o{ chat_conversation_user_state : "n-n user_id"
    users ||--o{ chat_conversations : "1-n client_id"
    users ||--o{ chat_conversations : "1-n freelancer_id"
    users ||--o{ chat_messages : "1-n sender_id"
    users ||--o{ client_billing_methods : "1-n user_id"
    users ||--|| client_billing_profiles : "1-1 user_id"
    users }o--o{ client_favorite_freelancers : "n-n client_id"
    users }o--o{ client_favorite_freelancers : "n-n freelancer_id"
    users ||--o{ contract_cancel_requests : "1-n requested_by"
    users ||--o{ contract_dispute_messages : "1-n author_id"
    users ||--o{ contract_disputes : "1-n opened_by"
    users ||--o{ contract_progress_entries : "1-n actor_id"
    users ||--o{ contract_reviews : "1-n client_id"
    users ||--o{ contract_reviews : "1-n freelancer_id"
    users ||--o{ contract_workflow_events : "1-n actor_id"
    users ||--o{ contracts : "1-n cancelled_by"
    users ||--o{ contracts : "1-n client_id"
    users ||--o{ contracts : "1-n freelancer_id"
    users ||--o{ email_verification_tokens : "1-n user_id"
    users ||--o{ freelancer_exclusive_resources : "1-n freelancer_id"
    users ||--|| freelancer_payout_accounts : "1-1 user_id"
    users ||--o{ freelancer_profile_files : "1-n freelancer_id"
    users ||--|| freelancer_profiles : "1-1 user_id"
    users ||--o{ freelancer_withdrawal_orders : "1-n user_id"
    users ||--|| freelancer_withdrawal_pins : "1-1 user_id"
    users ||--o{ identity_verifications : "1-n admin_reviewed_by"
    users ||--|| identity_verifications : "1-1 user_id"
    users ||--o{ job_quotes : "1-n freelancer_id"
    users ||--o{ jobs : "1-n client_id"
    users ||--o{ notifications : "1-n actor_id"
    users ||--o{ notifications : "1-n user_id"
    users ||--o{ oauth_accounts : "1-n user_id"
    users ||--o{ password_reset_tokens : "1-n user_id"
    users ||--o{ profile_analytics_events : "1-n freelancer_id"
    users ||--o{ refresh_tokens : "1-n user_id"
    users ||--o{ reviews : "1-n reviewee_id"
    users ||--o{ reviews : "1-n reviewer_id"
    users }o--o{ saved_jobs : "n-n freelancer_id"
    users ||--o{ services : "1-n freelancer_id"
    users ||--o{ transactions : "1-n freelancer_id"
    users ||--o{ transactions : "1-n user_id"
    users ||--o{ user_login_logs : "1-n user_id"
    users ||--o{ user_payout_methods : "1-n user_id"
    users ||--|| user_profiles : "1-1 user_id"
    users }o--o{ user_skills : "n-n user_id"
    users ||--o{ wallet_deposit_orders : "1-n user_id"
    contact_social_links {
        uuid id PK, varchar platform, text url
    }
    login_attempts {
        uuid id PK, varchar email, inet ip_address
    }
    schema_migrations {
        serial id PK, varchar filename UK
    }
    service_categories {
        serial id PK, varchar name UK
    }
    site_contact {
        smallint id PK, text email, text phone
    }
    spatial_ref_sys {
        int srid PK, varchar auth_name
    }
```

## Danh sách 51 bảng

| # | Bảng | Loại |
|---|------|------|
| 1 | `accounts` | Có FK |
| 2 | `billing_invoices` | Có FK |
| 3 | `chat_blocks` | Có FK |
| 4 | `chat_conversation_user_state` | Có FK |
| 5 | `chat_conversations` | Có FK |
| 6 | `chat_messages` | Có FK |
| 7 | `client_billing_methods` | Có FK |
| 8 | `client_billing_profiles` | Có FK |
| 9 | `client_favorite_freelancers` | Có FK |
| 10 | `contact_social_links` | Độc lập (không FK) |
| 11 | `contract_cancel_requests` | Có FK |
| 12 | `contract_dispute_messages` | Có FK |
| 13 | `contract_disputes` | Có FK |
| 14 | `contract_milestones` | Có FK |
| 15 | `contract_progress_entries` | Có FK |
| 16 | `contract_reviews` | Có FK |
| 17 | `contract_workflow_events` | Có FK |
| 18 | `contracts` | Có FK |
| 19 | `email_verification_tokens` | Có FK |
| 20 | `freelancer_exclusive_resources` | Có FK |
| 21 | `freelancer_payout_accounts` | Có FK |
| 22 | `freelancer_portfolios` | Có FK |
| 23 | `freelancer_profile_files` | Có FK |
| 24 | `freelancer_profiles` | Có FK |
| 25 | `freelancer_withdrawal_orders` | Có FK |
| 26 | `freelancer_withdrawal_pins` | Có FK |
| 27 | `identity_verifications` | Có FK |
| 28 | `job_quotes` | Có FK |
| 29 | `jobs` | Có FK |
| 30 | `ledger_entries` | Có FK |
| 31 | `login_attempts` | Độc lập (không FK) |
| 32 | `notifications` | Có FK |
| 33 | `oauth_accounts` | Có FK |
| 34 | `password_reset_tokens` | Có FK |
| 35 | `profile_analytics_events` | Có FK |
| 36 | `refresh_tokens` | Có FK |
| 37 | `reviews` | Có FK |
| 38 | `saved_jobs` | Có FK |
| 39 | `schema_migrations` | Độc lập (không FK) |
| 40 | `service_categories` | Độc lập (không FK) |
| 41 | `services` | Có FK |
| 42 | `site_contact` | Độc lập (không FK) |
| 43 | `skills` | Chỉ là cha (PK tham chiếu) |
| 44 | `spatial_ref_sys` | Độc lập (không FK) |
| 45 | `transactions` | Có FK |
| 46 | `user_login_logs` | Có FK |
| 47 | `user_payout_methods` | Có FK |
| 48 | `user_profiles` | Có FK |
| 49 | `user_skills` | Có FK |
| 50 | `users` | Chỉ là cha (PK tham chiếu) |
| 51 | `wallet_deposit_orders` | Có FK |

## Tóm tắt quan hệ theo cardinality

### 1-1
- users ↔ user_profiles, freelancer_profiles, identity_verifications
- users ↔ freelancer_payout_accounts, freelancer_withdrawal_pins, client_billing_profiles
- contracts ↔ contract_reviews (và reviews legacy)
- transactions ↔ billing_invoices

### n-n (bảng trung gian)
- user_skills: users ↔ skills
- client_favorite_freelancers: users (client) ↔ users (freelancer)
- saved_jobs: users (freelancer) ↔ jobs
- chat_blocks: users ↔ users
- chat_conversation_user_state: users ↔ chat_conversations

### 1-n
Tất cả quan hệ FK còn lại (jobs→job_quotes, contracts→milestones, users→notifications, ...)
