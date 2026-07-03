import { type Component } from "solid-js";
import type { PixivNovel } from "../api/types";
import { resolveImageUrl } from "../utils/imageLoader";

interface Props {
  novel: PixivNovel;
  onClick: (id: number) => void;
}

const SeriesSheetItem: Component<Props> = (props) => {
  return (
    <div
      class="flex items-center gap-3 px-5 py-2.5 cursor-pointer active:scale-[0.98] transition-transform duration-[var(--durationFast)] ease-[var(--curveEasyEase)]"
      onClick={() => props.onClick(props.novel.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && props.onClick(props.novel.id)}
    >
      {/* Cover — 64x64 */}
      <div class="w-16 h-16 flex-shrink-0 rounded-[var(--borderRadiusSmall)] overflow-hidden bg-[var(--colorNeutralBackground2)]">
        <img
          src={resolveImageUrl(props.novel.image_urls.square_medium)}
          alt={props.novel.title}
          class="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div class="flex-1 min-w-0 flex flex-col gap-0.5">
        <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground1)] line-clamp-2 leading-tight">
          {props.novel.title}
        </p>
        <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] flex items-center gap-1">
          <span>📖 {props.novel.text_length.toLocaleString()}字</span>
        </p>
      </div>
    </div>
  );
};

export default SeriesSheetItem;
