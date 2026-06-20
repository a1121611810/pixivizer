import { type Component, createSignal, onMount, onCleanup } from "solid-js";
import FeedShell from "../routes/FeedShell";
import IllustDetail from "../routes/IllustDetail";
import SettingsSheet from "../components/SettingsSheet";
import { setShowSettingsSheet } from "../stores/uiStore";

type View = "feed" | "detail";

const MainShell: Component = () => {
  const [currentView, setCurrentView] = createSignal<View>("feed");
  const [detailIllustId, setDetailIllustId] = createSignal<number | null>(null);

  // ── 导航函数 ──

  function navigateToDetail(illustId: number) {
    setDetailIllustId(illustId);
    setCurrentView("detail");
    window.history.pushState({ view: "detail", id: illustId }, "", `/illust/${illustId}`);
  }

  function navigateToFeed() {
    setCurrentView("feed");
    // 替换当前历史条目，避免 push 新条目
    window.history.replaceState({ view: "feed" }, "", "/feed");
  }

  function goBack() {
    window.history.back();
  }

  // ── popstate 监听（系统侧滑返回 / 浏览器后退） ──

  function handlePopState(event: PopStateEvent) {
    if (event.state?.view === "feed") {
      setCurrentView("feed");
    } else if (event.state?.view === "detail" && event.state.id != null) {
      setDetailIllustId(event.state.id);
      setCurrentView("detail");
    } else {
      // 无状态记录时回退到 feed
      navigateToFeed();
    }
  }

  onMount(() => {
    // 初始化历史条目
    const path = window.location.pathname;
    const match = path.match(/^\/illust\/(\d+)$/);
    if (match) {
      const id = Number(match[1]);
      setDetailIllustId(id);
      setCurrentView("detail");
      window.history.replaceState({ view: "detail", id }, "", path);
    } else {
      navigateToFeed();
    }

    window.addEventListener("popstate", handlePopState);
  });

  onCleanup(() => {
    window.removeEventListener("popstate", handlePopState);
  });

  // ── 渲染 ──

  return (
    <>
      {/* Feed — 始终存活，仅 CSS 切换 */}
      <div style={{ display: currentView() === "feed" ? "block" : "none" }}>
        <FeedShell
          onIllustClick={(id) => navigateToDetail(id)}
          onSettingsOpen={() => setShowSettingsSheet(true)}
        />
      </div>

      {/* Detail — 始终存活，仅 CSS 切换 */}
      <div style={{ display: currentView() === "detail" ? "block" : "none" }}>
        <IllustDetail illustId={detailIllustId()} onBack={() => goBack()} />
      </div>

      <SettingsSheet />
    </>
  );
};

export default MainShell;
