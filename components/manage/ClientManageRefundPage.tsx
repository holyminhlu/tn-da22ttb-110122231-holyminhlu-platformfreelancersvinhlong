"use client";

import ManageShell from "./ManageShell";
import RefundRequestsPanel from "./RefundRequestsPanel";
import "./manage.css";

export default function ClientManageRefundPage() {
  return (
    <ManageShell>
      <div className="manage-page manage-page--full-width">
        <header className="hire-page__head manage-page__head">
          <div>
            <h1 className="hire-page__title">Yêu cầu hoàn tiền</h1>
            <p className="hire-page__lead">
              Theo dõi yêu cầu hủy &amp; hoàn tiền, xem phân bổ theo chính sách chính đáng / hủy
              ngang. Tiền hoàn mặc định về <strong>ví VLC</strong>.
            </p>
          </div>
        </header>
        <RefundRequestsPanel audience="client" />
      </div>
    </ManageShell>
  );
}
