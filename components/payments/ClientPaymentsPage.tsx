"use client";

import ClientShell from "@/components/layout/ClientShell";
import "./payments.css";

type BillingMethodType = "card" | "paypal" | "bank";
type TransactionType = "milestone" | "deposit" | "withdraw" | "processing_fee";

type BillingMethod = {
  id: string;
  type: BillingMethodType;
  label: string;
  detail: string;
  isPrimary: boolean;
  isAutoBillingEnabled?: boolean;
};

type BillingTransaction = {
  id: string;
  createdAt: string;
  project: string;
  freelancer: string;
  type: TransactionType;
  amount: number;
  currency: string;
  invoiceCode: string;
};

const billingMethods: BillingMethod[] = [
  {
    id: "bm_visa_1018",
    type: "card",
    label: "Visa",
    detail: "**** 1018 • Hết hạn 08/28",
    isPrimary: true,
    isAutoBillingEnabled: true,
  },
  {
    id: "bm_paypal_work",
    type: "paypal",
    label: "PayPal",
    detail: "finance@company.vn",
    isPrimary: false,
  },
  {
    id: "bm_bank_vcb",
    type: "bank",
    label: "Vietcombank",
    detail: "TK **** 6688",
    isPrimary: false,
  },
];

const billingHistory: BillingTransaction[] = [
  {
    id: "trx_001",
    createdAt: "2026-05-27",
    project: "App đặt lịch khám",
    freelancer: "Nguyen Van A",
    type: "milestone",
    amount: -4200000,
    currency: "VND",
    invoiceCode: "INV-2026-0527-001",
  },
  {
    id: "trx_002",
    createdAt: "2026-05-24",
    project: "Ví công ty",
    freelancer: "-",
    type: "deposit",
    amount: 6000000,
    currency: "VND",
    invoiceCode: "INV-2026-0524-002",
  },
  {
    id: "trx_003",
    createdAt: "2026-05-22",
    project: "Website giới thiệu",
    freelancer: "Tran Thi B",
    type: "processing_fee",
    amount: -95000,
    currency: "VND",
    invoiceCode: "INV-2026-0522-003",
  },
  {
    id: "trx_004",
    createdAt: "2026-05-20",
    project: "Ví công ty",
    freelancer: "-",
    type: "withdraw",
    amount: -1500000,
    currency: "VND",
    invoiceCode: "INV-2026-0520-004",
  },
];

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function typeLabel(type: TransactionType) {
  switch (type) {
    case "milestone":
      return "Thanh toán Milestone";
    case "deposit":
      return "Nạp tiền vào ví";
    case "withdraw":
      return "Rút tiền / Hoàn tiền";
    case "processing_fee":
      return "Phí nền tảng";
    default:
      return type;
  }
}

function methodTypeLabel(type: BillingMethodType) {
  switch (type) {
    case "card":
      return "Thẻ tín dụng/ghi nợ";
    case "paypal":
      return "PayPal";
    case "bank":
      return "Tài khoản ngân hàng";
    default:
      return type;
  }
}

export default function ClientPaymentsPage() {
  const availableBalance = 18850000;
  const escrowBalance = 6500000;

  return (
    <ClientShell>
      <div className="client-payments">
        <header className="client-payments__header">
          <h1 className="client-page__title">Thanh toán</h1>
          <p className="client-page__desc">
            Quản lý số dư, ký quỹ, phương thức thanh toán, hóa đơn và thông tin xuất hóa đơn.
          </p>
        </header>

        <section className="client-payments__panel">
          <h2 className="client-payments__section-title">1. Tổng quan Số dư &amp; Ký quỹ</h2>
          <div className="client-payments__balance-grid">
            <article className="client-payments__balance-card">
              <p className="client-payments__label">Số dư khả dụng</p>
              <p className="client-payments__amount">{formatMoney(availableBalance, "VND")}</p>
            </article>
            <article className="client-payments__balance-card">
              <p className="client-payments__label">Tiền đang ký quỹ</p>
              <p className="client-payments__amount">{formatMoney(escrowBalance, "VND")}</p>
            </article>
          </div>

          <div className="client-payments__cta-row">
            <button type="button" className="client-payments__btn client-payments__btn--primary">
              Nạp tiền
            </button>
            <button type="button" className="client-payments__btn client-payments__btn--secondary">
              Rút tiền / Hoàn tiền
            </button>
          </div>
        </section>

        <section className="client-payments__panel">
          <div className="client-payments__section-head">
            <h2 className="client-payments__section-title">2. Phương thức thanh toán</h2>
            <button type="button" className="client-payments__link-btn">
              + Thêm phương thức
            </button>
          </div>

          <div className="client-payments__method-list">
            {billingMethods.map((method) => (
              <article key={method.id} className="client-payments__method-item">
                <div>
                  <p className="client-payments__method-title">{method.label}</p>
                  <p className="client-payments__method-detail">
                    {methodTypeLabel(method.type)} • {method.detail}
                  </p>
                </div>
                <div className="client-payments__method-actions">
                  {method.isPrimary ? (
                    <span className="client-payments__badge">Phương thức mặc định</span>
                  ) : (
                    <button type="button" className="client-payments__text-btn">
                      Đặt mặc định
                    </button>
                  )}
                  <button type="button" className="client-payments__text-btn">
                    Cập nhật
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="client-payments__auto-billing">
            <h3 className="client-payments__sub-title">Tự động thanh toán</h3>
            <p className="client-payments__muted">
              Khi số dư dưới 2.000.000 VND, hệ thống tự động nạp 5.000.000 VND từ phương thức mặc định.
            </p>
            <label className="client-payments__switch-row">
              <input type="checkbox" defaultChecked aria-label="Bật tự động thanh toán" />
              <span>Bật Auto-billing</span>
            </label>
          </div>
        </section>

        <section className="client-payments__panel">
          <div className="client-payments__section-head">
            <h2 className="client-payments__section-title">3. Lịch sử giao dịch &amp; Hóa đơn</h2>
            <button type="button" className="client-payments__btn client-payments__btn--secondary">
              Export Statement (CSV)
            </button>
          </div>

          <div className="client-payments__filters">
            <select aria-label="Lọc theo dự án">
              <option>Tất cả dự án</option>
            </select>
            <select aria-label="Lọc theo freelancer">
              <option>Tất cả freelancer</option>
            </select>
            <input type="month" aria-label="Lọc theo tháng" />
          </div>

          <div className="client-payments__table-wrap">
            <table className="client-payments__table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Dự án</th>
                  <th>Freelancer</th>
                  <th>Loại giao dịch</th>
                  <th>Số tiền</th>
                  <th>Hóa đơn</th>
                </tr>
              </thead>
              <tbody>
                {billingHistory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.createdAt}</td>
                    <td>{item.project}</td>
                    <td>{item.freelancer}</td>
                    <td>{typeLabel(item.type)}</td>
                    <td className={item.amount < 0 ? "client-payments__neg" : "client-payments__pos"}>
                      {formatMoney(item.amount, item.currency)}
                    </td>
                    <td>
                      <div className="client-payments__invoice-actions">
                        <span>{item.invoiceCode}</span>
                        <button type="button" className="client-payments__text-btn">
                          PDF
                        </button>
                        <button type="button" className="client-payments__text-btn">
                          In
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="client-payments__panel">
          <h2 className="client-payments__section-title">4. Cài đặt Thông tin Thanh toán</h2>
          <p className="client-payments__muted">
            Thông tin này được in trực tiếp trên hóa đơn tải về.
          </p>
          <form className="client-payments__form-grid">
            <label>
              <span>Tên công ty</span>
              <input type="text" defaultValue="Công ty TNHH ABC" />
            </label>
            <label>
              <span>Mã số thuế (Tax ID / VAT)</span>
              <input type="text" defaultValue="0312345678" />
            </label>
            <label className="client-payments__full-width">
              <span>Địa chỉ công ty</span>
              <input type="text" defaultValue="12A Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM" />
            </label>
            <label>
              <span>Email nhận hóa đơn</span>
              <input type="email" defaultValue="accounting@company.vn" />
            </label>
            <label>
              <span>Người liên hệ kế toán</span>
              <input type="text" defaultValue="Le Thi C" />
            </label>
          </form>
          <div className="client-payments__cta-row">
            <button type="button" className="client-payments__btn client-payments__btn--primary">
              Lưu Billing Details
            </button>
          </div>
        </section>
      </div>
    </ClientShell>
  );
}
