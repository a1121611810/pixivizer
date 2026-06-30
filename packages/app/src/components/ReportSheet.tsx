import { type Component, Show, createSignal } from "solid-js";
import {
  reportIllust,
  hasReported,
  type ReportReason,
  REPORT_REASON_LABELS,
} from "../stores/reportStore";

interface ReportSheetProps {
  illustId: number;
  isOpen: boolean;
  onClose: () => void;
}

const REASONS: ReportReason[] = ["pornography", "violence", "infringement", "spam", "other"];

const REPORT_EMAIL = "a1121611810@outlook.com";

function openReportEmail(illustId: number, reason: ReportReason) {
  const subject = encodeURIComponent(`[Pictelio 举报] 作品 ID: ${illustId}`);
  const body = encodeURIComponent(
    `举报作品 ID: ${illustId}\n举报原因: ${REPORT_REASON_LABELS[reason]}\n\n补充说明：\n`,
  );
  window.location.href = `mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`;
}

const ReportSheet: Component<ReportSheetProps> = (props) => {
  const [selectedReason, setSelectedReason] = createSignal<ReportReason | null>(null);
  const [submitting, setSubmitting] = createSignal(false);
  const alreadyReported = () => hasReported(props.illustId);

  function close() {
    props.onClose();
  }

  async function handleSubmit() {
    const reason = selectedReason();
    if (!reason || alreadyReported()) return;
    setSubmitting(true);
    await reportIllust(props.illustId, reason);
    openReportEmail(props.illustId, reason);
    setSubmitting(false);
    close();
  }

  return (
    <fluent-drawer position="bottom" open={props.isOpen} on:close={close}>
      {/* Drag handle */}
      <div class="flex justify-center pt-2 pb-1">
        <div class="w-10 h-1 rounded-[var(--borderRadiusCircular)] bg-[var(--colorNeutralStroke1)]" />
      </div>

      {/* Header */}
      <div class="flex items-center justify-between px-5 pt-1 pb-2">
        <h2 class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
          举报作品
        </h2>
        <fluent-button
          appearance="subtle"
          aria-label="关闭"
          on:click={close}
          style="min-width:32px;width:32px;height:32px;padding:0"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M15.14 4.86a.67.67 0 0 0-.95 0L10 9.05 5.81 4.86a.67.67 0 0 0-.95.95L9.05 10l-4.19 4.19a.67.67 0 0 0 .95.95L10 10.95l4.19 4.19a.67.67 0 0 0 .95-.95L10.95 10l4.19-4.19a.67.67 0 0 0 0-.95z"
              fill="currentColor"
            />
          </svg>
        </fluent-button>
      </div>

      {/* Divider */}
      <fluent-divider style="margin-inline:20px"></fluent-divider>

      {/* Reason list */}
      <div class="px-5 py-3 flex flex-col gap-2">
        <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)]">
          请选择举报原因：
        </p>
        {REASONS.map((reason) => (
          <button
            class="flex items-center gap-3 px-3 py-3 rounded-[var(--borderRadiusMedium)] transition-all active:scale-[0.98] appearance-none border-none outline-none cursor-pointer text-left focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[var(--colorStrokeFocus2)]"
            classList={{
              "bg-[var(--colorBrandBackgroundSelected)] text-[var(--colorNeutralForeground1)]":
                selectedReason() === reason,
              "bg-[var(--colorNeutralBackground2)] text-[var(--colorNeutralForeground2)] hover:bg-[var(--colorNeutralBackground1Hover)] hover:text-[var(--colorNeutralForeground1)]":
                selectedReason() !== reason,
            }}
            onClick={() => setSelectedReason(reason)}
            aria-pressed={selectedReason() === reason}
            disabled={alreadyReported()}
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
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  class="text-[var(--colorNeutralForegroundOnBrand)]"
                >
                  <path
                    d="M8.22 16.72a.75.75 0 0 1-1.06 0l-3.25-3.25a.75.75 0 1 1 1.06-1.06l2.72 2.72 7.72-7.72a.75.75 0 1 1 1.06 1.06l-8.25 8.25z"
                    fill="currentColor"
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
        <fluent-button
          appearance="primary"
          style="width:100%"
          disabled={!selectedReason() || submitting() || alreadyReported()}
          on:click={handleSubmit}
        >
          {alreadyReported() ? "已举报" : submitting() ? "提交中…" : "提交举报"}
        </fluent-button>
        <p class="mt-3 text-center [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)]">
          提交后将打开邮件客户端发送举报详情
        </p>
      </div>
    </fluent-drawer>
  );
};

export default ReportSheet;
