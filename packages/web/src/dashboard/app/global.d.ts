export {};

declare global {
  interface Window {
    /** Base path the dashboard SPA is served under, injected by the `@sidequest/web` façade. */
    __SQ_DASHBOARD_BASE__?: string;
  }
}
