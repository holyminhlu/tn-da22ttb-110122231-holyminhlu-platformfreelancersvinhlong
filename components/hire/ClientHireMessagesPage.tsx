"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { Suspense } from "react";
import MessagesInbox from "@/components/chat/MessagesInbox";
import { useClientIdentityVerification } from "@/hooks/useClientIdentityVerification";
import ClientIdentityVerifyGate from "./ClientIdentityVerifyGate";
import HireShell from "./HireShell";

export default function ClientHireMessagesPage() {
  const { t } = useTranslation();

  const { loading, verified, user, idv } = useClientIdentityVerification();

  return (
    <HireShell>
      {loading ? (
        <p className="fw-messages-inbox__state">{t("hireMessages.checking")}</p>
      ) : !verified ? (
        <ClientIdentityVerifyGate
          user={user}
          idv={idv}
          title={t("hireMessages.verifyTitle")}
          lead={t("hireMessages.verifyLead")}
          backHref="/hire/search"
          backLabel={t("hireMessages.backToSearch")}
        />
      ) : (
        <Suspense fallback={<p className="fw-messages-inbox__state">{t("hireMessages.loading")}</p>}>
          <MessagesInbox
            viewerRole="client"
            copy={{
              guestMessage: t("hireMessages.guestMessage"),
              wrongRoleMessage: t("hireMessages.wrongRole"),
              emptyListMessage: t("hireMessages.emptyList"),
              emptyListHint: t("hireMessages.emptyHint"),
            }}
          />
        </Suspense>
      )}
    </HireShell>
  );
}
