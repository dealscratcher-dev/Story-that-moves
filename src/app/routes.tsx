import { createBrowserRouter } from "react-router-dom";
import AppShell from "./AppShell";
import Home from "../pages/Home";
import Explore from "../pages/Explore";
import ArtifactPage from "../pages/ArtifactPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: "explore", element: <Explore /> },
      { path: "a/:slug", element: <ArtifactPage /> }
    ],
  },
]);
