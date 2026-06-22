"use client";



import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useMemo, useState } from "react";

import {

  patchIdentityVerification,

  type IdentityVerificationResponse,

} from "@/lib/api/identityVerification";

import AddressSearchPicker, { type AddressFormSlice } from "./AddressSearchPicker";



type ContactVerifyPanelProps = {

  data: IdentityVerificationResponse;

  onSaved: () => void;

};



function splitName(fullName: string | null | undefined) {

  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return { first: "", last: "" };

  if (parts.length === 1) return { first: parts[0], last: "" };

  return { first: parts[0], last: parts.slice(1).join(" ") };

}



function initialAddress(v: IdentityVerificationResponse["verification"]): AddressFormSlice {

  return {

    addressSearch: v?.address_search ?? "",

    street: v?.address_street ?? "",

    country: v?.address_country ?? "Việt Nam",

    state: v?.address_state ?? "",

    city: v?.address_city ?? "",

    postal: v?.address_postal ?? "",

  };

}



export default function ContactVerifyPanel({ data, onSaved }: ContactVerifyPanelProps) {
  const { t } = useTranslation();


  const v = data.verification;

  const parsed = useMemo(() => splitName(data.profile.full_name), [data.profile.full_name]);



  const [accountType, setAccountType] = useState<"personal" | "company">(

    v?.account_type === "company" ? "company" : "personal",

  );

  const [useExisting, setUseExisting] = useState(v?.use_existing_account_info ?? true);

  const [firstName, setFirstName] = useState(v?.legal_first_name ?? parsed.first);

  const [lastName, setLastName] = useState(v?.legal_last_name ?? parsed.last);

  const [address, setAddress] = useState<AddressFormSlice>(() => initialAddress(v));

  const [mapLat, setMapLat] = useState<number | null>(

    v?.address_lat != null && Number.isFinite(Number(v.address_lat)) ? Number(v.address_lat) : null,

  );

  const [mapLng, setMapLng] = useState<number | null>(

    v?.address_lng != null && Number.isFinite(Number(v.address_lng)) ? Number(v.address_lng) : null,

  );

  const [confirmed, setConfirmed] = useState(v?.contact_confirmed ?? false);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");



  async function handleSave() {

    if (!firstName.trim() || !lastName.trim()) {

      setMessage("Vui lòng nhập tên và họ.");

      return;

    }

    if (!address.addressSearch.trim()) {

      setMessage("Vui lòng chọn hoặc nhập địa chỉ.");

      return;

    }

    if (!confirmed) {

      setMessage("Vui lòng xác nhận thông tin trùng khớp giấy tờ.");

      return;

    }

    setSaving(true);

    setMessage("");

    try {

      await patchIdentityVerification({

        accountType,

        useExistingAccountInfo: useExisting,

        legalFirstName: firstName.trim(),

        legalLastName: lastName.trim(),

        addressSearch: address.addressSearch.trim(),

        addressStreet: address.street.trim(),

        addressCountry: address.country.trim(),

        addressState: address.state.trim(),

        addressCity: address.city.trim(),

        addressPostal: address.postal.trim(),

        addressLat: mapLat,

        addressLng: mapLng,

        contactConfirmed: true,

        syncProfile: true,

      });

      setMessage("Đã lưu thông tin liên hệ.");

      onSaved();

    } catch (err) {

      const msg =

        err && typeof err === "object" && "message" in err

          ? String((err as { message: string }).message)

          : "Không thể lưu.";

      setMessage(msg);

    } finally {

      setSaving(false);

    }

  }



  return (

    <div className="idv-detail">

      <h2 className="idv-detail__title">Thông tin liên hệ</h2>

      <p className="idv-detail__subtitle">Thông tin cá nhân</p>

      <p className="idv-detail__lead">Xác nhận tên và địa chỉ cho tài khoản của bạn</p>



      <fieldset className="idv-fieldset">

        <legend className="idv-field__label">Loại tài khoản</legend>

        <label className="idv-radio">

          <input

            type="radio"

            name="accountType"

            checked={accountType === "personal"}

            onChange={() => setAccountType("personal")}

          />

          Cá nhân

        </label>

        <label className="idv-radio">

          <input

            type="radio"

            name="accountType"

            checked={accountType === "company"}

            onChange={() => setAccountType("company")}

          />

          Công ty

        </label>

      </fieldset>



      <fieldset className="idv-fieldset">

        <legend className="idv-field__label">Thông tin tài khoản</legend>

        <label className="idv-radio">

          <input

            type="radio"

            name="useExisting"

            checked={useExisting}

            onChange={() => setUseExisting(true)}

          />

          Sử dụng thông tin tài khoản hiện có

        </label>

        <label className="idv-radio">

          <input

            type="radio"

            name="useExisting"

            checked={!useExisting}

            onChange={() => setUseExisting(false)}

          />

          Nhập thông tin tài khoản mới

        </label>

      </fieldset>



      <div className="idv-form-grid">

        <label className="idv-field">

          <span className="idv-field__label">Tên</span>

          <input className="idv-field__input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />

        </label>

        <label className="idv-field">

          <span className="idv-field__label">Họ</span>

          <input className="idv-field__input" value={lastName} onChange={(e) => setLastName(e.target.value)} />

        </label>

      </div>



      <h3 className="idv-detail__subtitle">Địa chỉ</h3>



      <AddressSearchPicker

        value={address}

        onChange={setAddress}

        lat={mapLat}

        lng={mapLng}

        onCoordsChange={(la, ln) => {

          setMapLat(la);

          setMapLng(ln);

        }}

      />



      <label className="idv-check">

        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />

        <span>

          Tôi xác nhận rằng thông tin trên trùng khớp với thông tin trong giấy tờ tùy thân và giấy chứng

          minh địa chỉ do chính phủ cấp mà tôi sẽ nộp trong quá trình xác minh này.

        </span>

      </label>

      <p className="idv-note">

        Lưu ý: Thông tin được chia sẻ ở trên sẽ được sử dụng để cập nhật thông tin hồ sơ hiện tại của bạn.

      </p>



      <div className="idv-detail__actions">

        {message ? <p className="idv-msg">{message}</p> : null}

        <button

          type="button"

          className="idv-btn idv-btn--primary"

          disabled={saving}

          onClick={() => void handleSave()}

        >

          {saving ? "Đang lưu..." : "Lưu thông tin liên hệ"}

        </button>

      </div>

    </div>

  );

}


