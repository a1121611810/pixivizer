import { type Component, createEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import {
  illusts,
  nextUrl,
  loading,
  error,
  fetchRecommended,
  fetchFollow,
  fetchMore,
} from '../stores/feedStore';
import { currentTab } from '../stores/uiStore';
import VirtualFeed from '../components/VirtualFeed';
import NavBar from '../components/NavBar';

const Feed: Component = () => {
  const navigate = useNavigate();

  createEffect(() => {
    if (currentTab() === 'recommended') fetchRecommended();
    else fetchFollow();
  });

  return (
    <div class="pb-16">
      <header class="sticky top-0 z-10 bg-dark-950/90 backdrop-blur-md px-4 py-3 border-b border-gray-800">
        <h1 class="text-lg font-bold text-white">Pixivizer</h1>
      </header>

      <VirtualFeed
        illusts={illusts()}
        loading={loading()}
        error={error()}
        hasMore={nextUrl() !== null}
        onIllustClick={(id) => navigate(`/illust/${id}`)}
        onLoadMore={fetchMore}
      />

      <NavBar />
    </div>
  );
};

export default Feed;
