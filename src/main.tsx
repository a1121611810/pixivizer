import { render } from "solid-js/web";
import App from "./App";
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "virtual:uno.css";

const root = document.getElementById("root");
if (root) {
  render(() => <App />, root);
}
