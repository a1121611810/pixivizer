import { type Component, type JSX, Show } from "solid-js";
import "./PredictiveBackContainer.css";
import {
  isPredictiveBackActive,
  predictiveBackProgress,
  predictiveBackTarget,
  predictiveBackEdge,
  getPreviousRoute,
} from "../services/predictiveBack";
import RoutePreview from "./RoutePreview";

interface PredictiveBackContainerProps {
  children: JSX.Element;
}

const PredictiveBackContainer: Component<PredictiveBackContainerProps> = (props) => {
  const progress = predictiveBackProgress;
  const target = predictiveBackTarget;
  const edge = predictiveBackEdge;

  const showPreview = () => isPredictiveBackActive() && target()?.type === "navigateBack";
  const sign = () => (edge() === "left" ? 1 : -1);
  const originX = () => (edge() === "left" ? "right" : "left");
  const isTransformed = () =>
    (isPredictiveBackActive() || progress() > 0) && target()?.type !== "finishActivity";

  return (
    <div
      class="relative w-full h-full overflow-clip predictive-back-stage"
      style={{
        "--pb-progress": String(progress()),
        "--pb-sign": String(sign()),
        "--pb-origin-x": originX(),
      }}
    >
      <Show when={showPreview()}>
        <div class="absolute inset-0 predictive-back-preview">
          <RoutePreview path={getPreviousRoute() ?? "/recommended"} />
        </div>
      </Show>

      <div
        class="relative w-full h-full predictive-back-current"
        classList={{ "predictive-back-current-active": isTransformed() }}
      >
        {props.children}
      </div>
    </div>
  );
};

export default PredictiveBackContainer;
