import DefaultTheme from "vitepress/theme";
import "./style.css";
import FluentGlow from "./components/FluentGlow.vue";
import FluentRipple from "./components/FluentRipple.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("FluentGlow", FluentGlow);
    app.component("FluentRipple", FluentRipple);
  },
};
