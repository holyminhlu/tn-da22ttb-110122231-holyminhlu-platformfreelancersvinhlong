import { GOOGLE_MAPS_REFERRER_HINT } from "@/lib/geo/googleMaps";
import { getGoogleMapsApiKey } from "@/config/maps.config";

export { getGoogleMapsApiKey, isGoogleMapsConfigured } from "@/config/maps.config";

const SCRIPT_ATTR = "data-vlc-google-maps";
const CALLBACK_NAME = "__vlcGoogleMapsReady";

declare global {
  interface Window {
    [CALLBACK_NAME]?: () => void;
    gm_authFailure?: () => void;
  }
}

let loadPromise: Promise<void> | null = null;

function waitForMapsApi(timeoutMs = 12000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    function tick() {
      if (window.google?.maps?.Map) {
        resolve();
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error("Google Maps API chưa sẵn sàng."));
        return;
      }
      window.setTimeout(tick, 50);
    }

    tick();
  });
}

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps chỉ chạy trên trình duyệt."));
  }

  if (window.google?.maps?.Map) {
    return Promise.resolve();
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    let settled = false;

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      loadPromise = null;
      reject(new Error(message));
    };

    const succeed = () => {
      waitForMapsApi()
        .then(() => {
          if (settled) return;
          settled = true;
          resolve();
        })
        .catch((error) => {
          fail(error instanceof Error ? error.message : "Google Maps API chưa sẵn sàng.");
        });
    };

    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      previousAuthFailure?.();
      fail(`Google Maps Permission Denied. ${GOOGLE_MAPS_REFERRER_HINT}`);
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[${SCRIPT_ATTR}]`);
    if (existing) {
      if (window.google?.maps?.Map) {
        succeed();
        return;
      }
      existing.addEventListener("load", succeed, { once: true });
      existing.addEventListener(
        "error",
        () => fail("Không tải được script Google Maps."),
        { once: true },
      );
      return;
    }

    window[CALLBACK_NAME] = () => {
      delete window[CALLBACK_NAME];
      succeed();
    };

    const script = document.createElement("script");
    script.setAttribute(SCRIPT_ATTR, "1");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${CALLBACK_NAME}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window[CALLBACK_NAME];
      fail("Không tải được script Google Maps.");
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
