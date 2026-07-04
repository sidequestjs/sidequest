import { useCallback, useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** The current route path from the URL hash, defaulting to "/". */
export function currentPath(): string {
  return window.location.hash.replace(/^#/, "") || "/";
}

/** Reads the hash route and lets you navigate. Hash-based, so no server rewrites are needed. */
export function useHashRoute() {
  const path = useSyncExternalStore(subscribe, currentPath, () => "/");
  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);
  return { path, navigate };
}
