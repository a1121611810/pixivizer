import { type Component } from "solid-js";
import { RouterProvider } from "@tanstack/solid-router";
import { router } from "./router";

const App: Component = () => <RouterProvider router={router} />;

export default App;
