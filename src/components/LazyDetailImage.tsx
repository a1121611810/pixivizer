import { type Component, createSignal, onMount, onCleanup } from "solid-js";
import PixivImage from "./PixivImage";

interface Props {
  src: string;
  pageIndex: number;
  totalPages: number;
  width: number;
  height: number;
  onClick: () => void;
}

/**
 * 详情页多图懒加载组件：仅当容器接近视口（400px 预热距）才渲染 PixivImage，
 * 之前用 aspect-ratio 占位保持布局稳定。一旦渲染则永久常驻。
 */
const LazyDetailImage: Component<Props> = (props) => {
  const [everVisible, setEverVisible] = createSignal(false);
  let el: HTMLDivElement | undefined;

  onMount(() => {
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setEverVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div
      ref={el}
      class="relative cursor-pointer"
      data-page-index={props.pageIndex}
      onClick={props.onClick}
    >
      {everVisible() ? (
        <>
          <PixivImage
            src={props.src}
            alt={`page ${props.pageIndex + 1}`}
            width={props.width}
            height={props.height}
            class="w-full object-contain"
          />
          <span
            class="absolute top-2 left-2 px-2 py-0.5 rounded-[var(--borderRadiusSmall)] text-[var(--colorImageBadgeForeground)]"
            style={{ "background-color": "var(--colorImageBadgeBackground)" }}
          >
            <span style={{ "font-size": "var(--fontSizeBase100)" }}>
              {props.pageIndex + 1} / {props.totalPages}
            </span>
          </span>
        </>
      ) : (
        <div
          style={{
            "aspect-ratio": `${props.width} / ${props.height}`,
            background: "var(--colorNeutralBackground2)",
            "border-radius": "var(--borderRadiusMedium)",
          }}
        />
      )}
    </div>
  );
};

export default LazyDetailImage;
