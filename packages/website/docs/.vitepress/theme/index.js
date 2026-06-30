import DefaultTheme from "vitepress/theme";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/effects.css";
import "./styles/dark.css";
import FluentGlow from "./components/FluentGlow.vue";
import FluentRipple from "./components/FluentRipple.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("FluentGlow", FluentGlow);
    app.component("FluentRipple", FluentRipple);
  },
};
