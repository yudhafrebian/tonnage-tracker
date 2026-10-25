import { useSyncExternalStore } from "react";

const noop = () => () => {};

// false di server dan selama hydration (React memakai server snapshot), true sesudahnya.
// Dipakai untuk nilai yang hanya ada di browser (tema dari localStorage, data user yang sudah
// ter-cache) di dalam Suspense: isi Suspense di-hydrate belakangan, saat nilai itu mungkin
// sudah tersedia, sehingga render pertamanya bisa beda dengan HTML server (hydration mismatch).
export const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
