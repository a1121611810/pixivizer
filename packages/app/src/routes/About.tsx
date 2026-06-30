import { type Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import PageTransition from "../components/PageTransition";

// ── Fluent UI System Icons (24px) — SVG path data ──
const iconPaths = {
  info: {
    regular:
      "M12 1.999c5.524 0 10 4.476 10 10s-4.476 10-10 10-10-4.476-10-10 4.476-10 10-10zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm0 12a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0-8.75a1.25 1.25 0 0 1 1.25 1.25v4.75a1.25 1.25 0 0 1-2.5 0V7.999A1.25 1.25 0 0 1 12 6.749z",
    filled:
      "M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12s4.477 10 10 10 10-4.477 10-10zM12 16.499a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0-9.75a1.25 1.25 0 0 1 1.25 1.25v4.75a1.25 1.25 0 0 1-2.5 0V7.999c0-.69.56-1.25 1.25-1.25z",
  },
  wrench: {
    regular:
      "M13.497 2a4.502 4.502 0 0 0-4.305 5.881l-6.34 6.34a2.001 2.001 0 0 0 2.83 2.83l6.335-6.334A4.503 4.503 0 0 0 18 6.502 4.502 4.502 0 0 0 13.497 2zm-3.003 4.5A3.003 3.003 0 0 1 13.499 3.5 3.003 3.003 0 0 1 16.049 8.25l-1.812-1.812a.75.75 0 0 0-1.06 0l-.343.343a.75.75 0 0 0 0 1.06l1.812 1.812A3.003 3.003 0 0 1 10.494 6.5zm-4.06 8.25 1.813-1.812a.75.75 0 0 0 0-1.06l-.343-.343a.75.75 0 0 0-1.06 0L5 13.347l-1.47-1.47a.752.752 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0z",
    filled:
      "M16.75 2a5.25 5.25 0 0 0-5.039 3.63l-5.648 5.648a2.751 2.751 0 0 0 3.89 3.89l5.643-5.644A5.252 5.252 0 0 0 22 7.252 5.251 5.251 0 0 0 16.75 2zM6.05 13.036l-1.99 1.99a1.251 1.251 0 0 0 1.77 1.77l1.99-1.99z",
  },
  chevronRight: {
    regular:
      "M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z",
    filled:
      "M8.22 4.22a.75.75 0 0 1 1.06 0l6.75 6.75c.29.29.29.77 0 1.06l-6.75 6.75a.75.75 0 0 1-1.06-1.06L14.44 12 8.22 5.28a.75.75 0 0 1 0-1.06z",
  },
};

type IconName = keyof typeof iconPaths;

const FluentIcon: Component<{ name: IconName; size?: number }> = (props) => {
  const paths = iconPaths[props.name];
  const size = props.size ?? 24;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={paths.regular} fill="currentColor" />
    </svg>
  );
};

// ── Data model ──
interface AboutRow {
  label: string;
  value: string;
  icon: IconName;
  url?: string;
}

interface AboutSection {
  title: string;
  rows: AboutRow[];
}

const sections: AboutSection[] = [
  {
    title: "免责声明",
    rows: [
      { label: "第三方客户端", value: "与 Pixiv 官方无关", icon: "info" },
      { label: "内容来源", value: "Pixiv 公开 API", icon: "info" },
      { label: "版权", value: "归原作者所有", icon: "info" },
      { label: "年龄限制", value: "未成年请在监护人指导下使用", icon: "info" },
    ],
  },
  {
    title: "应用信息",
    rows: [{ label: "应用版本", value: APP_VERSION, icon: "info" }],
  },
  {
    title: "致谢",
    rows: [
      {
        label: "SolidJS",
        value: "响应式 UI 框架",
        icon: "wrench",
        url: "https://www.solidjs.com/",
      },
      {
        label: "Capacitor",
        value: "跨平台原生运行时",
        icon: "wrench",
        url: "https://capacitorjs.com/",
      },
      {
        label: "TypeScript",
        value: "类型安全 JavaScript",
        icon: "wrench",
        url: "https://www.typescriptlang.org/",
      },
      {
        label: "Vite",
        value: "下一代前端构建工具",
        icon: "wrench",
        url: "https://vitejs.dev/",
      },
      {
        label: "Fluent Design 2",
        value: "Microsoft 设计语言",
        icon: "info",
        url: "https://fluent2.microsoft.design/",
      },
      {
        label: "Fluent UI Icons",
        value: "微软开源图标库",
        icon: "info",
        url: "https://github.com/microsoft/fluentui-system-icons",
      },
      {
        label: "pixivts",
        value: "Pixiv API 封装 (book000)",
        icon: "wrench",
        url: "https://github.com/book000/pixivts",
      },
    ],
  },
  // 后续扩展只需在此数组 push 新 section 或 row
];

// ── Component ──
const About: Component = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div class="min-h-screen pb-16">
        {/* Sticky header — same pattern as PersonalCenter */}
        <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4 gap-3">
          <fluent-button appearance="subtle" aria-label="返回" on:click={() => navigate(-1)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15.53 4.22a.75.75 0 0 1 0 1.06L8.81 12l6.72 6.72a.75.75 0 1 1-1.06 1.06l-7.25-7.25a.75.75 0 0 1 0-1.06l7.25-7.25a.75.75 0 0 1 1.06 0z"
                fill="currentColor"
              />
            </svg>
          </fluent-button>
          <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] flex-1">
            关于
          </h1>
        </header>

        {/* ── Brand area ── */}
        <div class="flex flex-col items-center pt-10 pb-6 gap-3">
          {/* Pictelio logo */}
          <img
            src="/logo-192x192.png"
            alt="Pictelio"
            class="w-16 h-16 rounded-[var(--borderRadiusXLarge)]"
          />

          <div class="text-center">
            <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
              Pictelio
            </p>
            <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug mt-0.5">
              第三方插画浏览器
            </p>
          </div>
        </div>

        {/* ── Info sections ── */}
        {sections.map((section) => (
          <section class="mb-1">
            <p class="px-5 py-2 [font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground2)] uppercase tracking-wide">
              {section.title}
            </p>
            <div class="mx-4 rounded-[var(--borderRadiusLarge)] bg-[var(--colorNeutralBackground1)] overflow-hidden">
              {section.rows.map((row, idx, arr) => {
                const inner = (
                  <div
                    class="flex items-center justify-between px-4 min-h-11 py-3"
                    classList={{
                      "cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)]":
                        !!row.url,
                    }}
                  >
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                      <div class="w-5 h-5 flex-shrink-0 text-[var(--colorNeutralForeground2)] flex items-center justify-center">
                        <FluentIcon name={row.icon} size={20} />
                      </div>
                      <span class="[font-size:var(--fontSizeBase300)] text-[var(--colorNeutralForeground1)] leading-snug">
                        {row.label}
                      </span>
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0 ml-3">
                      <span class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug text-right">
                        {row.value}
                      </span>
                      {row.url && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          class="text-[var(--colorNeutralForegroundDisabled)] flex-shrink-0"
                        >
                          <path
                            d="M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                );

                return (
                  <>
                    {row.url ? (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="block focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)]"
                      >
                        {inner}
                      </a>
                    ) : (
                      inner
                    )}
                    {idx < arr.length - 1 && <div class="mx-4 divider" />}
                  </>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </PageTransition>
  );
};

export default About;
