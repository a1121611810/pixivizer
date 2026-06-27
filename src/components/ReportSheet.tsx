import { type Component, Show, createSignal, createEffect } from "solid-js";
import { reportIllust, type ReportReason, REPORT_REASON_LABELS } from "../stores/reportStore";

interface ReportSheetProps {
  illustId: number;
  isOpen: boolean;
  onClose: () => void;
}

const REASONS: ReportReason[] = ["pornography", "violence", "infringement", "spam", "other"];

const REPORT_EMAIL = "YOUR_REPORT_EMAIL@example.com";

function openReportEmail(illustId: number, reason: ReportReason) {
  const subject = encodeURIComponent(`[Pictelio 举报] 作品 ID: ${illustId}`);
  const body = encodeURIComponent(
    `举报作品 ID: ${illustId}\n举报原因: ${REPORT_REASON_LABELS[reason]}\n\n补充说明：\n`,
  );
  window.location.href = `mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`;
}

// Prevent body scroll when touching the scrim while sheet is open
function handleScrimTouchMove(e: TouchEvent) {
  if (e.target === e.currentTarget) {
    e.preventDefault();
  }
}

const ReportSheet: Component<ReportSheetProps> = (props) => {
  const [closing, setClosing] = createSignal(false);
  const [mounted, setMounted] = createSignal(false);
  const [selectedReason, setSelectedReason] = createSignal<ReportReason | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  // Reset animation state each time opened
  createEffect(() => {
    if (props.isOpen) {
      setMounted(false);
      setClosing(false);
      setSelectedReason(null);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true));
      });
    }
  });

  function close() {
    setClosing(true);
    setTimeout(() => {
      props.onClose();
    }, 250); // match --durationGentle
  }

  async function handleSubmit() {
    const reason = selectedReason();
    if (!reason) return;
    setSubmitting(true);
    await reportIllust(props.illustId, reason);
    openReportEmail(props.illustId, reason);
    setSubmitting(false);
    close();
  }

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50">
        {/* Scrim — click to close */}
        <div
          class="absolute inset-0 transition-opacity cursor-pointer"
          onClick={close}
          onTouchMove={handleScrimTouchMove}
          style={{
            "background-color": "var(--colorScrim)",
            opacity: mounted() && !closing() ? 1 : 0,
            transition: `opacity var(--durationGentle) ${closing() ? "var(--curveAccelerateMid)" : "var(--curveDecelerateMid)"}`,
          }}
        />

        {/* Sheet — slides up from bottom */}
        <div
          class="absolute bottom-0 left-0 right-0 surface-appbar rounded-t-[var(--borderRadius4XLarge)] shadow-[var(--elevation28)]"
          style={{
            "max-height": "70vh",
            "overflow-y": "auto",
            transform: mounted() && !closing() ? "translateY(0)" : "translateY(100%)",
            opacity: mounted() && !closing() ? 1 : 0,
            transition: `transform var(--durationGentle) ${closing() ? "var(--curveAccelerateMid)" : "var(--curveDecelerateMid)"}, opacity var(--durationNormal) ${closing() ? "var(--curveAccelerateMid)" : "var(--curveDecelerateMid)"}`,
          }}
        >
          {/* Drag handle */}
          <div class="flex justify-center pt-2 pb-1">
            <div class="w-10 h-1 rounded-[var(--borderRadiusCircular)] bg-[var(--colorNeutralStroke1)]" />
          </div>

          {/* Header */}
          <div class="flex items-center justify-between px-5 pt-1 pb-2">
            <h2 class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
              举报作品
            </h2>
            <button class="btn-icon" onClick={close} aria-label="关闭">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M15.14 4.86a.67.67 0 0 0-.95 0L10 9.05 5.81 4.86a.67.67 0 0 0-.95.95L9.05 10l-4.19 4.19a.67.67 0 0 0 .95.95L10 10.95l4.19 4.19a.67.67 0 0 0 .95-.95L10.95 10l4.19-4.19a.67.67 0 0 0 0-.95z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div class="divider mx-5" />

          {/* Reason list */}
          <div class="px-5 py-3 flex flex-col gap-2">
            <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)]">
              请选择举报原因：
            </p>
            {REASONS.map((reason) => (
              <button
                class="flex items-center gap-3 px-3 py-3 rounded-[var(--borderRadiusMedium)] transition-all active:scale-[0.98] appearance-none border-none outline-none cursor-pointer text-left focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[var(--colorStrokeFocus2)]"
                classList={{
                  "bg-[var(--colorBrandStroke2)] text-[var(--colorNeutralForeground1)]":
                    selectedReason() === reason,
                  "bg-[var(--colorNeutralBackground2)] text-[var(--colorNeutralForeground2)] hover:bg-[var(--colorNeutralBackground1Hover)] hover:text-[var(--colorNeutralForeground1)]":
                    selectedReason() !== reason,
                }}
                onClick={() => setSelectedReason(reason)}
                aria-pressed={selectedReason() === reason}
              >
                <span
                  class="w-5 h-5 rounded-[var(--borderRadiusCircular)] border flex items-center justify-center flex-shrink-0 transition-colors"
                  classList={{
                    "border-[var(--colorBrandBackground)] bg-[var(--colorBrandBackground)]":
                      selectedReason() === reason,
                    "border-[var(--colorNeutralStrokeAccessible)] bg-transparent":
                      selectedReason() !== reason,
                  }}
                >
                  <Show when={selectedReason() === reason}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M8.22 16.72a.75.75 0 0 1-1.06 0l-3.25-3.25a.75.75 0 1 1 1.06-1.06l2.72 2.72 7.72-7.72a.75.75 0 1 1 1.06 1.06l-8.25 8.25z"
                        fill="white"
                      />
                    </svg>
                  </Show>
                </span>
                <span class="[font-size:var(--fontSizeBase300)] font-semibold">
                  {REPORT_REASON_LABELS[reason]}
                </span>
              </button>
            ))}
          </div>

          {/* Submit button */}
          <div class="px-5 pb-6 pt-2">
            <button
              class="btn-primary w-full justify-center py-3"
              disabled={!selectedReason() || submitting()}
              onClick={handleSubmit}
            >
              {submitting() ? "提交中…" : "提交举报"}
            </button>
            <p class="mt-3 text-center [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)]">
              提交后将打开邮件客户端发送举报详情
            </p>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default ReportSheet;
