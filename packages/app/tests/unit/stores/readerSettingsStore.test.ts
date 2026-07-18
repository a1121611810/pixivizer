import { describe, it, expect, vi, beforeEach } from "vitest";

async function loadStore() {
  vi.resetModules();
  return import("@/stores/readerSettingsStore");
}

describe("readerSettingsStore", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      get length() {
        return 0;
      },
      key: vi.fn(() => null),
    });
  });

  describe("default values", () => {
    it("fontSize defaults to 18", async () => {
      const store = await loadStore();
      expect(store.fontSize()).toBe(18);
    });

    it("fontWeight defaults to 400", async () => {
      const store = await loadStore();
      expect(store.fontWeight()).toBe(400);
    });

    it("fontFamily defaults to sans-serif", async () => {
      const store = await loadStore();
      expect(store.fontFamily()).toBe("sans-serif");
    });

    it("fontColor defaults to empty (theme)", async () => {
      const store = await loadStore();
      expect(store.fontColor()).toBe("");
    });

    it("lineHeight defaults to 1.8", async () => {
      const store = await loadStore();
      expect(store.lineHeight()).toBe(1.8);
    });

    it("bgColor defaults to empty (theme)", async () => {
      const store = await loadStore();
      expect(store.bgColor()).toBe("");
    });

    it("FONT_SIZES includes 12 as minimum", async () => {
      const store = await loadStore();
      expect(store.FONT_SIZES[0]).toBe(12);
      expect(store.FONT_SIZES).toContain(28);
    });

    it("FONT_WEIGHTS has 5 levels", async () => {
      const store = await loadStore();
      expect(store.FONT_WEIGHTS).toHaveLength(5);
      expect(store.FONT_WEIGHTS[0].value).toBe(300);
      expect(store.FONT_WEIGHTS[4].value).toBe(700);
    });

    it("FONT_FAMILIES has 4 options", async () => {
      const store = await loadStore();
      expect(store.FONT_FAMILIES).toHaveLength(4);
    });

    it("LINE_HEIGHTS has 5 options", async () => {
      const store = await loadStore();
      expect(store.LINE_HEIGHTS).toHaveLength(5);
    });

    it("BG_COLORS has 6 options", async () => {
      const store = await loadStore();
      expect(store.BG_COLORS).toHaveLength(6);
    });
  });

  describe("setter functions", () => {
    it("setReaderFontSize updates fontSize and persists", async () => {
      const store = await loadStore();
      store.setReaderFontSize(24);
      expect(store.fontSize()).toBe(24);
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it("setReaderFontWeight updates fontWeight", async () => {
      const store = await loadStore();
      store.setReaderFontWeight(700);
      expect(store.fontWeight()).toBe(700);
    });

    it("setReaderFontFamily updates fontFamily", async () => {
      const store = await loadStore();
      store.setReaderFontFamily("serif");
      expect(store.fontFamily()).toBe("serif");
    });

    it("setReaderFontColor updates fontColor", async () => {
      const store = await loadStore();
      store.setReaderFontColor("#5c3e24");
      expect(store.fontColor()).toBe("#5c3e24");
    });

    it("setReaderLineHeight updates lineHeight", async () => {
      const store = await loadStore();
      store.setReaderLineHeight(2.0);
      expect(store.lineHeight()).toBe(2.0);
    });

    it("setReaderBgColor updates bgColor", async () => {
      const store = await loadStore();
      store.setReaderBgColor("#f5e6c8");
      expect(store.bgColor()).toBe("#f5e6c8");
    });
  });

  describe("readerStyle", () => {
    it("returns CSS variable object with current settings", async () => {
      const store = await loadStore();
      store.setReaderFontSize(16);
      store.setReaderFontWeight(500);
      store.setReaderFontFamily("serif");
      store.setReaderLineHeight(2.0);
      store.setReaderFontColor("#333");
      store.setReaderBgColor("#fff");

      const style = store.readerStyle() as Record<string, string>;
      expect(style["--reader-font-size"]).toBe("16px");
      expect(style["--reader-font-weight"]).toBe("500");
      expect(style["--reader-font-family"]).toBe("serif");
      expect(style["--reader-line-height"]).toBe("2");
      expect(style["--reader-font-color"]).toBe("#333");
      expect(style["--reader-bg-color"]).toBe("#fff");
    });

    it("omits empty fontColor and bgColor from output", async () => {
      const store = await loadStore();
      const style = store.readerStyle() as Record<string, string>;
      expect(style["--reader-font-color"]).toBeUndefined();
      expect(style["--reader-bg-color"]).toBeUndefined();
    });
  });

  describe("persistence", () => {
    it("saves settings as JSON on any setter call", async () => {
      const store = await loadStore();
      store.setReaderFontSize(14);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "novel_reader_settings",
        expect.stringContaining('"fontSize":14'),
      );
    });

    it("restores persisted settings on load", async () => {
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === "novel_reader_settings") {
          return JSON.stringify({
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "monospace",
            lineHeight: 2.2,
          });
        }
        return null;
      });

      const store = await loadStore();
      expect(store.fontSize()).toBe(12);
      expect(store.fontWeight()).toBe(700);
      expect(store.fontFamily()).toBe("monospace");
      expect(store.lineHeight()).toBe(2.2);
    });

    it("falls back to defaults when stored JSON is invalid", async () => {
      vi.mocked(localStorage.getItem).mockReturnValue("invalid json{{{");

      const store = await loadStore();
      expect(store.fontSize()).toBe(18);
      expect(store.fontWeight()).toBe(400);
    });

    it("partially applies stored settings with defaults for missing fields", async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ fontSize: 22 }));

      const store = await loadStore();
      expect(store.fontSize()).toBe(22);
      expect(store.fontWeight()).toBe(400); // Default
      expect(store.fontFamily()).toBe("sans-serif"); // Default
    });
  });
});
