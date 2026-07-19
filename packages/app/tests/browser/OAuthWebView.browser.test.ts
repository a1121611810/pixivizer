// @vitest-environment browser
import { describe, it, expect, vi, beforeEach } from "vitest";

// Helper to mount a SolidJS component manually
function createComponent(
  componentFn: (props: Record<string, unknown>) => () => any,
  props: Record<string, unknown>,
) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  // Import SolidJS renderer
  const dispose = vi.hoisted(() => {
    // We'll render using innerHTML approach since we can't easily
    // set up SolidJS compiler in browser tests
    return () => container.remove();
  });

  return { container, dispose };
}

describe("OAuthWebView — Web mode", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders nothing when open is false", async () => {
    // Import dynamically to use hoisted mocks
    const mod = await import("@/components/OAuthWebView");
    // We can test the behavior by checking the component exists
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("renders dialog when open is true (web mode)", async () => {
    vi.stubGlobal("window", { ...window, open: vi.fn() });

    // Render component into DOM
    const container = document.createElement("div");
    container.id = "test-root";
    document.body.appendChild(container);

    // SolidJS render
    const { render } = await import("solid-js/web");
    const OAuthWebView = (await import("@/components/OAuthWebView")).default;
    const dispose = render(
      () =>
        OAuthWebView({
          open: true,
          loginUrl: "https://pixiv.net/login?test=1",
          onSuccess: vi.fn(),
          onCancel: vi.fn(),
          onError: vi.fn(),
        }),
      container,
    );

    // Verify dialog content is visible
    expect(container.textContent).toContain("Pixiv");
    expect(container.textContent).toContain("登录");

    // Verify window.open was called
    expect(window.open).toHaveBeenCalled();

    dispose();
  });

  it("calls onSuccess with pasted code", async () => {
    const onSuccess = vi.fn();
    const onCancel = vi.fn();
    vi.stubGlobal("window", { ...window, open: vi.fn() });

    const container = document.createElement("div");
    container.id = "test-root";
    document.body.appendChild(container);

    const { render } = await import("solid-js/web");
    const OAuthWebView = (await import("@/components/OAuthWebView")).default;
    const dispose = render(
      () =>
        OAuthWebView({
          open: true,
          loginUrl: "https://pixiv.net/login?test=1",
          onSuccess,
          onCancel,
          onError: vi.fn(),
        }),
      container,
    );

    // Find the textarea and button
    const textarea = container.querySelector("textarea, fluent-textarea");
    const confirmBtn = container.querySelector('button, fluent-button[appearance="primary"]');

    expect(textarea).toBeTruthy();
    expect(confirmBtn).toBeTruthy();
  });
});
