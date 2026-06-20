"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaCrosshairs, FaMapMarkerAlt, FaSearch } from "react-icons/fa";
import {
  formatLocalityFromNominatim,
  formatStreetFromNominatim,
  reverseGeocode,
  searchAddressInVinhLong,
  type NominatimSearchResult,
} from "@/lib/geo/nominatim";
import {
  isInsideVinhLongBbox,
  VINH_LONG_MAP_CENTER,
} from "@/lib/geo/vinhLongBounds";
import { VINH_LONG_COMMUNES_2025, VINH_LONG_PROVINCE } from "@/lib/geo/vinhLongCommunes2025";
import GoogleRoutePreviewMap from "@/components/maps/GoogleRoutePreviewMap";

/** Chi tiết địa chỉ — điền tự động từ GPS/xã-phường/OSM, lưu DB khi submit (không hiển thị form riêng). */
export type AddressFormSlice = {
  addressSearch: string;
  street: string;
  country: string;
  state: string;
  city: string;
  postal: string;
};

type AddressSearchPickerProps = {
  value: AddressFormSlice;
  onChange: (next: AddressFormSlice) => void;
  lat?: number | null;
  lng?: number | null;
  onCoordsChange?: (lat: number | null, lng: number | null) => void;
  /** Tự động lấy GPS và đối chiếu khi mount (ví dụ form đổi địa chỉ tài khoản). */
  requestGpsOnMount?: boolean;
};

type Suggestion =
  | { type: "commune"; id: string; label: string; subtitle: string }
  | { type: "osm"; id: string; label: string; subtitle: string; result: NominatimSearchResult };

function normalizeSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export default function AddressSearchPicker({
  value,
  onChange,
  lat,
  lng,
  onCoordsChange,
  requestGpsOnMount = false,
}: AddressSearchPickerProps) {
  const { t } = useTranslation();

  const [query, setQuery] = useState(value.addressSearch);
  const [open, setOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [osmLoading, setOsmLoading] = useState(false);
  const [osmResults, setOsmResults] = useState<NominatimSearchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gpsOnMountRan = useRef(false);

  const mapLat = lat ?? VINH_LONG_MAP_CENTER.lat;
  const mapLng = lng ?? VINH_LONG_MAP_CENTER.lng;
  const hasPin = lat != null && lng != null;
  const routeOrigin = useMemo(
    () => ({ lat: VINH_LONG_MAP_CENTER.lat, lng: VINH_LONG_MAP_CENTER.lng }),
    [],
  );
  const routeDestination = hasPin ? { lat: lat!, lng: lng! } : null;

  useEffect(() => {
    setQuery(value.addressSearch);
  }, [value.addressSearch]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
  const t = tUi;
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const communeMatches = useMemo(() => {
    const n = normalizeSearch(query);
    if (n.length < 1) return VINH_LONG_COMMUNES_2025.slice(0, 12);
    return VINH_LONG_COMMUNES_2025.filter((c) => normalizeSearch(c.label).includes(n)).slice(0, 15);
  }, [query]);

  const suggestions: Suggestion[] = useMemo(() => {
    const commune: Suggestion[] = communeMatches.map((c) => ({
      type: "commune" as const,
      id: `c-${c.kind}-${c.name}`,
      label: c.label,
      subtitle: `${VINH_LONG_PROVINCE} (sau sáp nhập 2025)`,
    }));
    const osm: Suggestion[] = osmResults.map((r, i) => ({
      type: "osm" as const,
      id: `o-${i}-${r.lat}`,
      label: r.display_name.split(",").slice(0, 2).join(", "),
      subtitle: r.display_name,
      result: r,
    }));
    return [...commune, ...osm];
  }, [communeMatches, osmResults]);

  const runOsmSearch = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = text.trim();
      if (q.length < 3) {
        setOsmResults([]);
        return;
      }
      setOsmLoading(true);
      searchAddressInVinhLong(q)
        .then(setOsmResults)
        .catch(() => setOsmResults([]))
        .finally(() => setOsmLoading(false));
    }, 450);
  }, []);

  function applyCommune(label: string) {
  const t = tUi;
    onChange({
      ...value,
      addressSearch: label,
      street: value.street.trim() || label,
      country: "Việt Nam",
      state: VINH_LONG_PROVINCE,
      city: label,
    });
    setQuery(label);
    setOpen(false);
  }

  function applyOsmResult(result: NominatimSearchResult) {
  const t = tUi;
    const latNum = Number(result.lat);
    const lonNum = Number(result.lon);
    const street = formatStreetFromNominatim(result.address);
    const locality = formatLocalityFromNominatim(result.address);
    onChange({
      addressSearch: result.display_name,
      street: street || locality || result.display_name,
      country: "Việt Nam",
      state: result.address?.state || VINH_LONG_PROVINCE,
      city: locality || value.city,
      postal: result.address?.postcode || value.postal,
    });
    setQuery(result.display_name);
    if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
      onCoordsChange?.(latNum, lonNum);
    }
    setOpen(false);
  }

  function applyReverse(latNum: number, lonNum: number, data: Awaited<ReturnType<typeof reverseGeocode>>) {
  const t = tUi;
    const street = formatStreetFromNominatim(data.address);
    const locality = formatLocalityFromNominatim(data.address);
    const display = data.display_name || `${latNum.toFixed(5)}, ${lonNum.toFixed(5)}`;
    const nextAddress: AddressFormSlice = {
      addressSearch: display,
      street: street || locality || display,
      country: "Việt Nam",
      state: data.address?.state || VINH_LONG_PROVINCE,
      city: locality || value.city,
      postal: data.address?.postcode || value.postal,
    };
    onChange(nextAddress);
    setQuery(display);
    onCoordsChange?.(latNum, lonNum);
  }

  function handleUseGps() {
  const t = tUi;
    setGpsError("");
    if (!navigator.geolocation) {
      setGpsError("Trình duyệt không hỗ trợ GPS.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const latNum = pos.coords.latitude;
          const lonNum = pos.coords.longitude;
          if (!isInsideVinhLongBbox(latNum, lonNum)) {
            setGpsError(
              "Tọa độ GPS nằm ngoài phạm vi tỉnh Vĩnh Long. Vui lòng chọn địa chỉ trong danh sách hoặc di chuyển vào khu vực tỉnh.",
            );
            return;
          }
          const data = await reverseGeocode(latNum, lonNum);
          applyReverse(latNum, lonNum, data);
          setOpen(false);
        } catch {
          setGpsError("Không thể đối chiếu GPS với bản đồ. Thử lại sau.");
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("Bạn cần cho phép truy cập vị trí (GPS) trong trình duyệt.");
        } else {
          setGpsError("Không lấy được vị trí GPS. Kiểm tra GPS/Wi‑Fi và thử lại.");
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  }

  useEffect(() => {
    if (!requestGpsOnMount || gpsOnMountRan.current) return;
    gpsOnMountRan.current = true;
    handleUseGps();
    // Chỉ chạy một lần khi mở form với requestGpsOnMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestGpsOnMount]);

  return (
    <div className="idv-address-picker" ref={wrapRef}>
      <div className="idv-address-picker__search-row">
        <label className="idv-field idv-field--grow">
          <span className="idv-field__label">Tìm kiếm địa chỉ</span>
          <div className="idv-address-picker__input-wrap">
            <FaSearch className="idv-address-picker__input-icon" aria-hidden />
            <input
              className="idv-field__input idv-address-picker__input"
              placeholder="Xã/phường Vĩnh Long 2025, đường, hoặc từ khóa..."
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                onChange({ ...value, addressSearch: next });
                setOpen(true);
                runOsmSearch(next);
              }}
              onFocus={() => setOpen(true)}
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={open}
            />
          </div>
        </label>
        <button
          type="button"
          className="idv-start idv-start--secondary idv-address-picker__gps-btn"
          onClick={handleUseGps}
          disabled={gpsLoading}
        >
          <FaCrosshairs aria-hidden />
          {gpsLoading ? "Đang lấy GPS..." : "Dùng GPS"}
        </button>
      </div>

      {gpsError ? (
        <p className="idv-address-picker__error" role="alert">
          {gpsError}
        </p>
      ) : null}

      {open && suggestions.length > 0 ? (
        <ul className="idv-address-picker__suggestions" role="listbox">
          <li className="idv-address-picker__suggestions-head">
            Xã / phường tỉnh Vĩnh Long (124 đơn vị sau sáp nhập 2025)
            {osmLoading ? " · Đang tìm trên bản đồ..." : ""}
          </li>
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="idv-address-picker__option"
                role="option"
                onClick={() => {
                  if (s.type === "commune") applyCommune(s.label);
                  else applyOsmResult(s.result);
                }}
              >
                <FaMapMarkerAlt aria-hidden />
                <span>
                  <strong>{s.label}</strong>
                  <small>{s.subtitle}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="idv-address-picker__map-wrap">
        <p className="idv-address-picker__map-label">
          Bản đồ tham chiếu (Google Maps)
          {hasPin ? " — A: Trung tâm tỉnh → B: địa chỉ đã chọn" : " — trung tâm tỉnh Vĩnh Long"}
        </p>
        <GoogleRoutePreviewMap
          className="idv-address-picker__google-map"
          origin={hasPin ? routeOrigin : null}
          destination={routeDestination}
          originLabel="Trung tâm tỉnh Vĩnh Long"
          destinationLabel="Địa chỉ của bạn"
          fallbackCenter={{ lat: mapLat, lng: mapLng }}
          fallbackZoom={hasPin ? 15 : VINH_LONG_MAP_CENTER.zoom}
          mapHeight={220}
        />
        {hasPin ? (
          <p className="idv-address-picker__coords">
            GPS (B): {lat!.toFixed(5)}, {lng!.toFixed(5)}
          </p>
        ) : null}
      </div>

      <p className="idv-note idv-address-picker__hint">
        Chọn xã/phường trong danh sách chuẩn 2025, tìm địa chỉ trong phạm vi tỉnh Vĩnh Long, hoặc bấm{" "}
        <strong>Dùng GPS</strong> để lấy vị trí hiện tại và đối chiếu tự động.
      </p>
    </div>
  );
}
