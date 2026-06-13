"use client";

import { useEffect, useState } from "react";
import { FaHome, FaMapMarkerAlt } from "react-icons/fa";
import AddressSearchPicker, { type AddressFormSlice } from "@/components/account/identity-verification/AddressSearchPicker";
import { VINH_LONG_PROVINCE } from "@/lib/geo/vinhLongCommunes2025";

import { REMOTE_WORK_LOCATION_LABEL } from "@/lib/hire/workLocation";

export type WorkLocationMode = "onsite" | "remote";

export { REMOTE_WORK_LOCATION_LABEL };

type JobWorkLocationFieldProps = {
  mode: WorkLocationMode;
  onModeChange: (mode: WorkLocationMode) => void;
  locationLabel: string;
  onLocationLabelChange: (label: string) => void;
  lat: number | null;
  lng: number | null;
  onCoordsChange: (lat: number | null, lng: number | null) => void;
};

const emptyAddressSlice = (): AddressFormSlice => ({
  addressSearch: "",
  street: "",
  country: "Việt Nam",
  state: VINH_LONG_PROVINCE,
  city: "",
  postal: "",
});

export default function JobWorkLocationField({
  mode,
  onModeChange,
  locationLabel,
  onLocationLabelChange,
  lat,
  lng,
  onCoordsChange,
}: JobWorkLocationFieldProps) {
  const [address, setAddress] = useState<AddressFormSlice>(() => ({
    ...emptyAddressSlice(),
    addressSearch: mode === "onsite" ? locationLabel : "",
  }));

  useEffect(() => {
    if (mode === "remote") return;
    if (locationLabel && !address.addressSearch) {
      setAddress((prev) => ({ ...prev, addressSearch: locationLabel }));
    }
  }, [mode, locationLabel, address.addressSearch]);

  function selectOnsite() {
    onModeChange("onsite");
    if (!locationLabel.trim() || locationLabel === REMOTE_WORK_LOCATION_LABEL) {
      onLocationLabelChange(address.addressSearch.trim());
    }
  }

  function selectRemote() {
    onModeChange("remote");
    onLocationLabelChange(REMOTE_WORK_LOCATION_LABEL);
    onCoordsChange(null, null);
  }

  function handleAddressChange(next: AddressFormSlice) {
    setAddress(next);
    onLocationLabelChange(next.addressSearch.trim());
  }

  return (
    <div className="post-job-location">
      <fieldset className="post-job-wizard__radio-group post-job-location__modes">
        <legend className="idv-field__label">Hình thức làm việc *</legend>
        <label className={`post-job-location__mode${mode === "onsite" ? " post-job-location__mode--active" : ""}`}>
          <input
            type="radio"
            name="workLocationMode"
            checked={mode === "onsite"}
            onChange={selectOnsite}
          />
          <FaMapMarkerAlt aria-hidden />
          <span>
            <strong>Làm trực tiếp tại chỗ</strong>
            <small>Dùng GPS hoặc chọn / nhập địa chỉ tại tỉnh Vĩnh Long</small>
          </span>
        </label>
        <label className={`post-job-location__mode${mode === "remote" ? " post-job-location__mode--active" : ""}`}>
          <input
            type="radio"
            name="workLocationMode"
            checked={mode === "remote"}
            onChange={selectRemote}
          />
          <FaHome aria-hidden />
          <span>
            <strong>Làm tại nhà</strong>
            <small>Freelancer làm sản phẩm tại nhà, không cần đến địa điểm</small>
          </span>
        </label>
      </fieldset>

      {mode === "onsite" ? (
        <div className="post-job-location__onsite">
          <AddressSearchPicker
            value={address}
            onChange={handleAddressChange}
            lat={lat}
            lng={lng}
            onCoordsChange={onCoordsChange}
          />
        </div>
      ) : (
        <p className="post-job-wizard__hint post-job-location__remote-hint">
          Địa điểm hiển thị: <strong>{REMOTE_WORK_LOCATION_LABEL}</strong>
        </p>
      )}
    </div>
  );
}
