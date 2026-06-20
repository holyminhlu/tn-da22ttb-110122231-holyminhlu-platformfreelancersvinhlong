import { LOCALE_STORAGE_KEY } from "@/lib/userPreferences";

/** Inline script — chạy trước paint để đặt lang HTML đúng. */
export const localeInitScript = `(function(){try{var l=localStorage.getItem("${LOCALE_STORAGE_KEY}");document.documentElement.lang=l==="en"?"en":"vi";}catch(e){}})();`;
