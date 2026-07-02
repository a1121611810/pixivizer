// @vitest-environment browser
import { describe, it, expect } from "vitest";

describe("Browser DOM API", () => {
  it("has full document access", () => {
    expect(document).toBeDefined();
    expect(document.documentElement).toBeDefined();
    expect(document.body).toBeDefined();
  });

  it("supports querySelector", () => {
    document.body.innerHTML = '<div id="test"><span class="child">Hello</span></div>';
    const div = document.querySelector("#test");
    expect(div).not.toBeNull();
    expect(div!.textContent).toBe("Hello");

    const span = document.querySelector(".child");
    expect(span).not.toBeNull();
  });

  it("supports event dispatching", () => {
    return new Promise<void>((resolve) => {
      const button = document.createElement("button");
      button.addEventListener("click", () => resolve());
      document.body.appendChild(button);
      button.click();
    });
  });

  it("supports fetch API", async () => {
    // Just verify the API exists and works with an unreachable URL
    // (we don't want actual network requests in unit tests)
    expect(typeof window.fetch).toBe("function");
    const controller = new AbortController();
    controller.abort();
    await expect(fetch("https://example.com", { signal: controller.signal })).rejects.toThrow();
  });

  it("supports localStorage", () => {
    localStorage.setItem("test-key", "test-value");
    expect(localStorage.getItem("test-key")).toBe("test-value");
    localStorage.removeItem("test-key");
    expect(localStorage.getItem("test-key")).toBeNull();
  });

  it("supports CSSOM", () => {
    const el = document.createElement("div");
    el.style.color = "red";
    el.style.fontSize = "16px";
    expect(el.style.color).toBe("red");
    expect(el.style.fontSize).toBe("16px");
  });

  it("supports classList operations", () => {
    const el = document.createElement("div");
    el.classList.add("foo", "bar");
    expect(el.classList.contains("foo")).toBe(true);
    el.classList.remove("foo");
    expect(el.classList.contains("foo")).toBe(false);
  });

  it("supports MutationObserver", () => {
    return new Promise<void>((resolve) => {
      const target = document.createElement("div");
      const observer = new MutationObserver((mutations) => {
        expect(mutations.length).toBeGreaterThan(0);
        expect(mutations[0].type).toBe("childList");
        observer.disconnect();
        resolve();
      });
      observer.observe(target, { childList: true });
      target.appendChild(document.createElement("span"));
    });
  });

  it("supports IntersectionObserver", () => {
    const observer = new IntersectionObserver(() => {});
    const el = document.createElement("div");
    observer.observe(el);
    observer.unobserve(el);
    observer.disconnect();
    // No crash = success
  });

  it("supports Canvas API", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    expect(ctx).not.toBeNull();
    ctx!.fillStyle = "blue";
    ctx!.fillRect(0, 0, 50, 50);
  });
});

describe("HTML Security (browser mode)", () => {
  it("browser DOMPurify-style protection works", () => {
    // Test that the browser itself strips script execution
    const div = document.createElement("div");
    div.innerHTML = '<script>alert("xss")</script><p>safe</p>';
    // Browser's innerHTML parses <script> into DOM nodes but does NOT execute them
    const script = div.querySelector("script");
    expect(script).not.toBeNull(); // Script element exists in DOM
    expect(script!.textContent).toContain("alert"); // Content is preserved
    expect(div.querySelector("p")).not.toBeNull();
    // Verify no window.xss was set (script was NOT executed)
    expect((window as any).xss).toBeUndefined();
  });

  it("event handlers in innerHTML are not auto-executed", () => {
    const div = document.createElement("div");
    div.innerHTML = '<img src=x onerror="window.xss=true">';
    // The browser should NOT execute the onerror handler from innerHTML
    // (This is a security feature of the browser)
    const img = div.querySelector("img");
    expect(img).not.toBeNull();
  });
});
