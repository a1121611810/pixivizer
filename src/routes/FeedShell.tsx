import { type Component } from "solid-js";
import { currentTab } from "../stores/uiStore";
import TabPanel from "../components/TabPanel";
import NavBar from "../components/NavBar";

interface Props {
  onIllustClick: (id: number) => void;
  onSettingsOpen: () => void;
}

const FeedShell: Component<Props> = (props) => {
  return (
    <>
      <div class="pb-16">
        <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4">
          <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] tracking-tight leading-none">
            Pixivizer
          </h1>
        </header>

        <TabPanel
          tab="recommended"
          visible={currentTab() === "recommended"}
          onIllustClick={props.onIllustClick}
          onSettingsOpen={props.onSettingsOpen}
        />
        <TabPanel
          tab="follow"
          visible={currentTab() === "follow"}
          onIllustClick={props.onIllustClick}
          onSettingsOpen={props.onSettingsOpen}
        />
        <TabPanel
          tab="bookmarks"
          visible={currentTab() === "bookmarks"}
          onIllustClick={props.onIllustClick}
          onSettingsOpen={props.onSettingsOpen}
        />
      </div>

      <NavBar />
    </>
  );
};

export default FeedShell;
