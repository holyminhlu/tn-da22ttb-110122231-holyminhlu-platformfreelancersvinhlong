"use client";

import type { VerifyItemId } from "./types";
import type { IdentityVerificationResponse } from "@/lib/api/identityVerification";
import AddressProofVerifyPanel from "./AddressProofVerifyPanel";
import ContactVerifyPanel from "./ContactVerifyPanel";
import IdDocumentVerifyPanel from "./IdDocumentVerifyPanel";
import PhoneVerifyPanel from "./PhoneVerifyPanel";
import PhotoVerifyPanel from "./PhotoVerifyPanel";

type VerifyDetailPanelProps = {
  selectedId: VerifyItemId;
  data: IdentityVerificationResponse;
  onSaved: () => void;
};

export default function VerifyDetailPanel({ selectedId, data, onSaved }: VerifyDetailPanelProps) {
  switch (selectedId) {
    case "phone":
      return <PhoneVerifyPanel data={data} onSaved={onSaved} />;
    case "contact":
      return <ContactVerifyPanel data={data} onSaved={onSaved} />;
    case "photo":
      return <PhotoVerifyPanel data={data} onSaved={onSaved} />;
    case "id_document":
      return <IdDocumentVerifyPanel data={data} onSaved={onSaved} />;
    case "address_proof":
      return <AddressProofVerifyPanel data={data} onSaved={onSaved} />;
    default:
      return null;
  }
}
