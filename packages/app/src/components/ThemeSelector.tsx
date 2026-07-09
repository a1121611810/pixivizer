import { type Component, For, Show } from "solid-js";
import { colorTheme, setColorTheme, type ColorThemeId } from "@/stores/themeStore";

interface ThemeOption {
  id: ColorThemeId;
  label: string;
  swatchVar: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: "fluent", label: "Fluent 默认", swatchVar: "var(--colorBrandBackground)" },
  { id: "coast", label: "海岸", swatchVar: "var(--theme-coast-swatch)" },
  { id: "rose", label: "玫瑰", swatchVar: "var(--theme-rose-swatch)" },
  { id: "sage", label: "鼠尾草", swatchVar: "var(--theme-sage-swatch)" },
  { id: "lavender", label: "薰衣草", swatchVar: "var(--theme-lavender-swatch)" },
  { id: "caramel", label: "焦糖", swatchVar: "var(--theme-caramel-swatch)" },
];

const ThemeSelector: Component = () => {
  return (
    <div class="grid grid-cols-3 gap-3" role="group" aria-label="颜色主题选择">
      <For each={THEME_OPTIONS}>
        {(option) => {
          const selected = () => colorTheme() === option.id;
          return (
            <button
              type="button"
              role="button"
              aria-pressed={selected()}
              aria-label={option.label}
              onClick={() => setColorTheme(option.id)}
              class="flex flex-col items-center gap-2 p-3 rounded-[var(--borderRadiusMedium)] border transition-all duration-[var(--durationFast)] appearance-none bg-transparent cursor-pointer"
              classList={{
                "border-[var(--colorCompoundBrandStroke)]": selected(),
                "bg-[var(--colorNeutralBackground2)]": selected(),
                "border-[var(--colorNeutralStroke2)]": !selected(),
                "hover:border-[var(--colorNeutralStroke1)]": !selected(),
                "hover:bg-[var(--colorNeutralBackground2)]": !selected(),
                "active:scale-[0.97]": true,
              }}
            >
              <span class="relative">
                <span
                  class="w-8 h-8 rounded-[var(--borderRadiusCircular)] border border-[var(--colorNeutralStroke2)] block"
                  style={{ "background-color": option.swatchVar }}
                />
                <Show when={selected()}>
                  <span
                    data-testid="selected-indicator"
                    class="absolute -top-1 -right-1 w-4 h-4 rounded-[var(--borderRadiusCircular)] bg-[var(--colorCompoundBrandBackground)] text-[var(--colorNeutralForegroundOnBrand)] flex items-center justify-center"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M4.53 12.97a.75.75 0 0 0-1.06 1.06l5.5 5.5a.75.75 0 0 0 1.06 0l12-12a.75.75 0 0 0-1.06-1.06L9.5 18.44 4.53 12.97z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                </Show>
              </span>
              <span
                class="[font-size:var(--fontSizeBase200)] font-medium"
                classList={{
                  "text-[var(--colorCompoundBrandForeground1)]": selected(),
                  "text-[var(--colorNeutralForeground1)]": !selected(),
                }}
              >
                {option.label}
              </span>
            </button>
          );
        }}
      </For>
    </div>
  );
};

export default ThemeSelector;
