import { type Component, createSignal, onMount } from "solid-js";
import { setAgeConfirmation } from "../stores/uiStore";

function confirmAdult() {
  setAgeConfirmation(true, true);
}

function confirmMinor() {
  setAgeConfirmation(true, false);
}

/**
 * 年龄门：首次启动时询问用户是否已满 18 周岁。
 * 选择“已满 18 岁”后才会显示 R-18 / R-18G 相关开关与内容。
 */
const AgeGate: Component = () => {
  const [mounted, setMounted] = createSignal(false);

  onMount(() => {
    // Double rAF ensures a paint frame before the entrance transition starts
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(true));
    });
  });

  return (
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{
        "background-color": "var(--colorScrim)",
        opacity: mounted() ? 1 : 0,
        transition: `opacity var(--durationGentle) var(--curveDecelerateMid)`,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div
        class="w-full max-w-[360px] surface-dialog p-6 flex flex-col gap-6"
        style={{
          transform: mounted() ? "scale(1)" : "scale(0.96)",
          opacity: mounted() ? 1 : 0,
          transition: `transform var(--durationGentle) var(--curveDecelerateMid), opacity var(--durationNormal) var(--curveDecelerateMid)`,
        }}
      >
        <div class="flex flex-col gap-2 text-center">
          <h2
            id="age-gate-title"
            class="[font-size:var(--fontSizeHero700)] font-semibold text-[var(--colorNeutralForeground1)] leading-tight"
          >
            年龄确认
          </h2>
          <p class="[font-size:var(--fontSizeBase400)] text-[var(--colorNeutralForeground2)] leading-snug">
            你是否已满 18 周岁？
          </p>
          <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
            本应用包含 R-18 / R-18G 内容，未成年人请在监护人指导下使用。
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <fluent-button appearance="primary" style="width:100%" on:click={confirmAdult}>
            已满 18 岁
          </fluent-button>
          <fluent-button appearance="secondary" style="width:100%" on:click={confirmMinor}>
            未满 18 岁
          </fluent-button>
        </div>
      </div>
    </div>
  );
};

export default AgeGate;
