import type { Component } from 'solid-js';
import type { PixivIllust } from '../api/types';

interface Props {
  illust: PixivIllust;
  onClick: (id: number) => void;
}

const ImageCard: Component<Props> = (props) => {
  const img = () => props.illust.image_urls.square_medium;
  const devUrl = () => `/pixiv-img/${img().split('/').slice(3).join('/')}`;

  return (
    <div
      class="card cursor-pointer break-inside-avoid mb-3"
      onClick={() => props.onClick(props.illust.id)}
    >
      <img
        src={devUrl()}
        alt={props.illust.title}
        loading="lazy"
        class="w-full object-cover"
        style={{ 'aspect-ratio': `${props.illust.width}/${props.illust.height}` }}
      />
      <div class="p-2">
        <p class="text-xs text-white truncate">{props.illust.title}</p>
        <p class="text-xs text-gray-400 truncate">@{props.illust.user.name}</p>
      </div>
    </div>
  );
};

export default ImageCard;
