import type { Component } from 'solid-js';
import { Switch, Match } from 'solid-js';

export type PullZone = 'idle' | 'pulling' | 'refresh-ready' | 'settings-ready' | 'refreshing';

interface Props {
  zone: PullZone;
  distance: number;
  refreshThreshold: number;
  settingsThreshold: number;
}

const PullIndicator: Component<Props> = (props) => {
  const height = () => props.distance;
  const opacity = () => Math.min(props.distance / props.refreshThreshold, 1);

  return (
    <div
      class="flex justify-center overflow-hidden"
      style={{
        height: `${height()}px`,
        opacity: opacity(),
        transition:
          props.zone === 'idle'
            ? 'height var(--durationFast) var(--curveDecelerateMid)'
            : 'none',
      }}
    >
      <div class="flex items-center gap-2 py-2 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground2)] select-none">
        <Switch>
          <Match when={props.zone === 'refreshing'}>
            <span class="spinner w-4 h-4" />
            刷新中...
          </Match>
          <Match when={props.zone === 'settings-ready'}>
            ⚙️ 松手打开设置
          </Match>
          <Match when={props.zone === 'refresh-ready'}>
            ✨ 松开刷新
          </Match>
          <Match when={props.zone === 'pulling'}>
            {props.distance < props.settingsThreshold
              ? '↓ 下拉刷新'
              : '⏣ 继续下拉打开设置'}
          </Match>
        </Switch>
      </div>
    </div>
  );
};

export default PullIndicator;
