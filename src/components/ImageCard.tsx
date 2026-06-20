import type { Component } from 'solid-js';
import type { PixivIllust } from '../api/types';
import { listQuality } from '../stores/uiStore';
import PixivImage from './PixivImage';

function resolveUrl(illust: PixivIllust): string {
  const q = listQuality();
  if (q === 'medium') return illust.image_urls.medium;
  if (q === 'large') return illust.image_urls.large;
  // original: use original_image_url if available, otherwise fallback to large
  return illust.meta_single_page?.original_image_url ?? illust.image_urls.large;
}

interface Props {
  illust: PixivIllust;
  onClick: (id: number) => void;
}

const ImageCard: Component<Props> = (props) => {
  const img = () => resolveUrl(props.illust);
  const w = () => props.illust.width;
  const h = () => props.illust.height;
  const isUgoira = () => props.illust.type === 'ugoira';

  return (
    <div
      class="image-card"
      onClick={() => props.onClick(props.illust.id)}
    >
      <div class="relative">
        <PixivImage
          src={img()}
          alt={props.illust.title}
          width={w()}
          height={h()}
          loading="eager"
          class="w-full h-auto block"
        />
        {isUgoira() && (
          <div class="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-[var(--borderRadiusSmall)] px-1.5 py-0.5 text-white [font-size:var(--fontSizeBase100)] font-medium select-none pointer-events-none">
            ▶ 动图
          </div>
        )}
        {props.illust.page_count > 1 && (
          <div class="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-[var(--borderRadiusSmall)] px-1.5 py-0.5 text-white [font-size:var(--fontSizeBase100)] font-medium select-none pointer-events-none">
            📄 {props.illust.page_count}
          </div>
        )}
      </div>
      <div class="p-2.5">
        <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground1)] truncate font-semibold">
          {props.illust.title}
        </p>
        <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground2)] truncate mt-0.5">
          @{props.illust.user.name}
        </p>
      </div>
    </div>
  );
};

export default ImageCard;
