export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
