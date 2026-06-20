import { defineConfig, presetUno, presetIcons } from 'unocss';
// Fluent Design System 2 — precise token-based shortcuts
// Uses bracket syntax [property:value] to avoid UnoCSS text- ambiguity with CSS variables

export default defineConfig({
  presets: [presetUno(), presetIcons()],

  shortcuts: {
    // ── Page (full-height root surface) ──
    'page':
      'min-h-screen [background-color:var(--colorNeutralBackground3)] [color:var(--colorNeutralForeground1)]',

    // ── Surfaces ──
    'surface-card':
      '[background-color:var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] border border-[var(--colorNeutralStroke2)]',
    'surface-card-elevated':
      '[background-color:var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)]',
    'surface-flyout':
      '[background-color:var(--colorNeutralBackground1)] rounded-[var(--borderRadiusLarge)] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)]',
    'surface-appbar':
      '[background-color:var(--colorNeutralBackgroundAlpha)] backdrop-blur-[30px] backdrop-saturate-[125%] border-b border-[var(--colorNeutralStroke2)] rounded-[var(--borderRadiusNone)]',
    'surface-overlay':
      '[background-color:var(--colorNeutralBackground1)] rounded-[var(--borderRadiusXLarge)] shadow-[var(--elevation16)]',
    'surface-dialog':
      '[background-color:var(--colorNeutralBackground1)] rounded-[var(--borderRadius2XLarge)] shadow-[var(--elevation28)]',

    // ── Image card (feed thumbnail) ──
    'image-card':
      '[background-color:var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] overflow-hidden shadow-[var(--elevation2)] border border-[var(--colorNeutralStroke2)] cursor-pointer transition-all active:scale-[0.98] select-none',

    // ── Buttons (Fluent 2 anatomy: 14px/600, 32px min-height, 4px radius, 16px h-pad) ──
    'btn':
      'inline-flex items-center justify-center gap-[var(--spacingHorizontalXS)] rounded-[var(--borderRadiusMedium)] font-semibold [font-size:var(--fontSizeBase300)] [line-height:var(--lineHeightBase300)] min-h-8 px-[var(--spacingHorizontalL)] border border-[var(--colorNeutralStroke1)] transition-all active:scale-[0.97] select-none appearance-none outline-none cursor-pointer focus-visible:outline-none focus-visible:[box-shadow:0_0_0_var(--strokeWidthThick)_var(--colorStrokeFocus2),0_0_0_calc(var(--strokeWidthThick)+var(--strokeWidthThin))_var(--colorStrokeFocus1)]',
    'btn-primary':
      'btn [background-color:var(--colorBrandBackground)] text-white [border-color:var(--colorBrandBackground)] hover:[background-color:var(--colorBrandBackgroundHover)] hover:[border-color:var(--colorBrandBackgroundHover)] active:[background-color:var(--colorBrandBackgroundPressed)] active:[border-color:var(--colorBrandBackgroundPressed)] disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-secondary':
      'btn [background-color:var(--colorNeutralBackground1)] [color:var(--colorNeutralForeground1)] [border-color:var(--colorNeutralStroke1)] hover:[background-color:var(--colorNeutralBackground1Hover)] hover:[border-color:var(--colorNeutralStrokeAccessible)] active:[background-color:var(--colorNeutralBackground1Pressed)] active:[border-color:var(--colorNeutralStrokeAccessible)] disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-subtle':
      'btn bg-transparent [color:var(--colorNeutralForeground2)] border-transparent hover:[background-color:var(--colorNeutralBackground1Hover)] active:[background-color:var(--colorNeutralBackground1Pressed)] disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-icon':
      'inline-flex items-center justify-center w-8 h-8 rounded-[var(--borderRadiusMedium)] [color:var(--colorNeutralForeground2)] bg-transparent border-transparent hover:[background-color:var(--colorNeutralBackground1Hover)] active:[background-color:var(--colorNeutralBackground1Pressed)] active:scale-90 transition-all select-none',

    // ── Input fields (Fluent 2) ──
    'input':
      'w-full px-[var(--spacingHorizontalMNudge)] py-[var(--spacingVerticalSNudge)] rounded-[var(--borderRadiusMedium)] [background-color:var(--colorNeutralBackground1)] [color:var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase300)] [line-height:var(--lineHeightBase300)] border border-[var(--colorNeutralStroke1)] placeholder:text-[var(--colorNeutralForegroundDisabled)] focus:outline-none focus:border-[var(--colorBrandStroke1)] focus:shadow-[0_0_0_1px_var(--colorBrandStroke1)] transition-all disabled:opacity-50 disabled:[background-color:var(--colorNeutralBackground2)]',
    'input-mono':
      'input font-mono [font-size:var(--fontSizeBase200)]',

    // ── Form label (Caption 1: 12px/400) ──
    'label':
      '[font-size:var(--fontSizeBase200)] font-400 [color:var(--colorNeutralForeground2)] [line-height:var(--lineHeightBase200)]',

    // ── Badge (Fluent 2 Tag) ──
    'badge':
      'inline-flex items-center rounded-[var(--borderRadiusCircular)] px-[var(--spacingHorizontalS)] py-[var(--spacingVerticalXXS)] [font-size:var(--fontSizeBase200)] font-400 [color:var(--colorNeutralForeground2)] [background-color:var(--colorNeutralBackground2)] border border-[var(--colorNeutralStroke2)]',

    // ── Segmented control (Fluent toggle buttons) ──
    'segmented':
      'flex [background-color:var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1',
    'segmented-item':
      'flex-1 flex flex-col items-center justify-center py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 select-none appearance-none border-none cursor-pointer',
    'segmented-item-active':
      'segmented-item [background-color:var(--colorNeutralBackground1)] [color:var(--colorNeutralForeground1)] shadow-[var(--elevation2)]',
    'segmented-item-inactive':
      'segmented-item [background-color:transparent] [color:var(--colorNeutralForeground2)] hover:[color:var(--colorNeutralForeground1)] hover:[background-color:var(--colorNeutralBackground2)]',

    // ── Divider ──
    'divider':
      'border-t border-[var(--colorNeutralStroke2)]',

    // ── Spinner (Fluent ProgressRing: thick neutral stroke + brand top edge) ──
    'spinner':
      'border-[var(--strokeWidthThicker)] border-[var(--colorNeutralStroke2)] border-t-[var(--colorBrandStroke1)] rounded-[var(--borderRadiusCircular)] animate-spin',
  },
});
