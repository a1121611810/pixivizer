import { type Component, For } from "solid-js";
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
              <span
                class="w-8 h-8 rounded-[var(--borderRadiusCircular)] border border-[var(--colorNeutralStroke2)]"
                style={{ "background-color": option.swatchVar }}
              />
              <span class="[font-size:var(--fontSizeBase200)] font-medium text-[var(--colorNeutralForeground1)]">
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
