"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useSearchParams } from "next/navigation";
import ManageShell from "./ManageShell";
import DisputesPanel from "./DisputesPanel";
import "./manage.css";

export default function ClientManageDisputesPage() {
  const { t } = useTranslation();

  const searchParams = useSearchParams();
  const initialDisputeId = searchParams.get("dispute");
  const initialContractId = searchParams.get("contract");

  return (
    <ManageShell>
      <div className="manage-page manage-page--full-width">
        <header className="hire-page__head manage-page__head">
          <div>
            <h1 className="hire-page__title">Xử lý tranh chấp</h1>
            
          </div>
        </header>
        <DisputesPanel
          audience="client"
          initialDisputeId={initialDisputeId}
          initialContractId={initialContractId}
        />
      </div>
    </ManageShell>
  );
}
