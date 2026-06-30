import { defineConfig, presetUno, presetIcons } from "unocss";
// Fluent Design System 2 — precise token-based shortcuts
// Uses bracket syntax [property:value] to avoid UnoCSS text- ambiguity with CSS variables

export default defineConfig({
  presets: [presetUno(), presetIcons()],

  shortcuts: {
    // ── Page (full-height root surface) ──
    page: "min-h-screen bg-[var(--colorNeutralBackground3)] text-[var(--colorNeutralForeground1)]",

    // ── Surfaces ──
    "surface-card":
      "bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] border border-[var(--colorNeutralStroke2)]",
    "surface-card-elevated":
      "bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)]",
    "surface-flyout":
      "bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusLarge)] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)]",
    "surface-appbar":
      "bg-[var(--colorNeutralBackgroundAlpha)] backdrop-blur-[30px] backdrop-saturate-[125%] border-b border-[var(--colorNeutralStroke2)] rounded-[var(--borderRadiusNone)]",
    "surface-overlay":
      "bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusXLarge)] shadow-[var(--elevation16)]",
    "surface-dialog":
      "bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadius2XLarge)] shadow-[var(--elevation28)]",

    "surface-glass":
      "bg-[var(--colorNeutralBackgroundAlpha)] backdrop-blur-[30px] backdrop-saturate-[125%] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)]",

    // ── Image card (feed thumbnail) ──
    "image-card":
      "bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] overflow-hidden shadow-[var(--elevation2)] border border-[var(--colorNeutralStroke2)] cursor-pointer transition-all active:scale-[0.98] select-none max-w-full",

    // ── Input fields (Fluent 2) ──
    input:
      "w-full px-[var(--spacingHorizontalMNudge)] py-[var(--spacingVerticalSNudge)] rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] text-[var(--fontSizeBase300)] leading-[var(--lineHeightBase300)] border border-[var(--colorNeutralStroke1)] placeholder:text-[var(--colorNeutralForegroundDisabled)] focus:outline-none focus:border-[var(--colorBrandStroke1)] focus:shadow-[0_0_0_1px_var(--colorBrandStroke1)] transition-all disabled:opacity-50 disabled:bg-[var(--colorNeutralBackground2)]",
    "input-mono": "input font-mono [font-size:var(--fontSizeBase200)]",

    // ── Form label (Caption 1: 12px/400) ──
    label:
      "text-[var(--fontSizeBase200)] font-400 text-[var(--colorNeutralForeground2)] leading-[var(--lineHeightBase200)]",

    // ── Segmented control (Fluent toggle buttons) ──
    segmented:
      "flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1",
    "segmented-item":
      "flex-1 flex flex-col items-center justify-center py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 select-none cursor-pointer",
    "segmented-item-active":
      "segmented-item bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]",
    "segmented-item-inactive":
      "segmented-item bg-transparent text-[var(--colorNeutralForeground2)] hover:text-[var(--colorNeutralForeground1)] hover:bg-[var(--colorNeutralBackground2)]",

    // ── Bottom Navigation Bar (Fluent 2 floating pill pattern) ──
    "bottom-nav": "fixed bottom-0 left-0 right-0 z-30 flex justify-center px-4 select-none",
    "bottom-nav-container":
      "flex relative bg-[var(--colorNeutralBackgroundAlpha)] backdrop-blur-[30px] backdrop-saturate-[125%] rounded-[var(--borderRadius2XLarge)] border-t border-[var(--colorNeutralStroke2)] shadow-[var(--elevation8)]",
    "bottom-nav-pill":
      "absolute top-[var(--spacingVerticalS)] bottom-[var(--spacingVerticalS)] rounded-[var(--borderRadiusLarge)] bg-[var(--colorBrandStroke2)] opacity-0 transition-all duration-[var(--durationFast)] ease-[var(--curveDecelerateMid)]",
    "bottom-nav-item":
      "relative flex flex-col items-center justify-center gap-[var(--spacingHorizontalXXS)] min-w-20 h-12 px-[var(--spacingHorizontalL)] rounded-[var(--borderRadiusMedium)] text-[var(--fontSizeBase200)] font-medium leading-none border-none outline-none appearance-none cursor-pointer select-none transition-colors duration-[var(--durationFast)] ease-[var(--curveEasyEase)] focus-visible:[box-shadow:0_0_0_var(--strokeWidthThick)_var(--colorStrokeFocus2),0_0_0_calc(var(--strokeWidthThick)+var(--strokeWidthThin))_var(--colorStrokeFocus1)]",
    "bottom-nav-item-inactive":
      "text-[var(--colorNeutralForeground3)] hover:text-[var(--colorNeutralForeground2)] hover:bg-[var(--colorNeutralBackground1Hover)] active:bg-[var(--colorNeutralBackground1Pressed)] active:scale-[0.96]",
    "bottom-nav-item-active":
      "text-[var(--colorCompoundBrandForeground1)] font-semibold active:scale-[0.97]",
    // ── Nav icon crossfade helpers ──
    "nav-icon-regular":
      "absolute inset-0 transition-opacity duration-[var(--durationFast)] ease-[var(--curveEasyEase)]",
    "nav-icon-filled":
      "absolute inset-0 transition-opacity duration-[var(--durationFast)] ease-[var(--curveEasyEase)]",
  },
});
