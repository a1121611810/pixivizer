import { createSignal, Show, type Component } from "solid-js";
import { useNavigate, useLocation } from "@tanstack/solid-router";
import FluentIcon from "@/components/ui/FluentIcon";

const SearchFAB: Component = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Hide on /search ──
  const isSearchPage = () => location().pathname === "/search";

  // ── Draggable position ──
  const [pos, setPos] = createSignal<{ x: number; y: number } | null>(null);
  const [dragged, setDragged] = createSignal(false);

  let startX = 0;
  let startY = 0;
  let btnStartX = 0;
  let btnStartY = 0;

  function handlePointerStart(clientX: number, clientY: number) {
    startX = clientX;
    startY = clientY;
    const current = pos();
    btnStartX = current?.x ?? window.innerWidth - 72;
    btnStartY = current?.y ?? window.innerHeight - 88;
    setDragged(false);
  }

  function handlePointerMove(clientX: number, clientY: number) {
    const dx = clientX - startX;
    const dy = clientY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      setDragged(true);
    }
    const newX = Math.max(0, Math.min(window.innerWidth - 56, btnStartX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, btnStartY + dy));
    setPos({ x: newX, y: newY });
  }

  function handlePointerEnd() {
    // navigate handled by onClick; this only marks drag state
  }

  function onTouchStart(e: TouchEvent) {
    handlePointerStart(e.touches[0].clientX, e.touches[0].clientY);
  }

  function onTouchMove(e: TouchEvent) {
    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }

  function onTouchEnd() {
    handlePointerEnd();
  }

  function onMouseDown(e: MouseEvent) {
    handlePointerStart(e.clientX, e.clientY);
    const onMove = (ev: MouseEvent) => handlePointerMove(ev.clientX, ev.clientY);
    const onUp = () => {
      handlePointerEnd();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const style = (): Record<string, string> => {
    const p = pos();
    if (!p) return {};
    return {
      position: "fixed",
      left: `${p.x}px`,
      top: `${p.y}px`,
      transform: "none",
    } as Record<string, string>;
  };

  return (
    <Show when={!isSearchPage()}>
      <button
        class="fixed z-40 bottom-6 right-4 w-14 h-14 flex items-center justify-center rounded-[var(--borderRadiusCircular)] bg-[var(--colorBrandBackground)] text-[var(--colorNeutralForegroundOnBrand)] shadow-[var(--elevation8)] cursor-pointer select-none touch-none transition-[transform,background-color,box-shadow] duration-[var(--durationFast)] ease-[var(--curveEasyEase)] hover:bg-[var(--colorBrandBackgroundHover)] hover:shadow-[var(--elevation16)] active:scale-[0.95] focus-visible:outline-[var(--colorStrokeFocus2)] focus-visible:outline-2 focus-visible:outline-offset-2"
        style={style()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onClick={() => {
          if (!dragged()) {
            void navigate({ to: "/search" });
          }
        }}
        aria-label="搜索"
      >
        <FluentIcon name="search" size={24} />
      </button>
    </Show>
  );
};

export default SearchFAB;
