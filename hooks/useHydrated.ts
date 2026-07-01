import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/** True after the client has hydrated — avoids SSR/extension attribute mismatches on forms. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
