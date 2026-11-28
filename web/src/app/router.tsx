import { useRoutes, type RouteObject } from "react-router-dom";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { StudioPage } from "../features/studio/StudioPage";
import { Layout, NotFoundPage } from "./Layout";

const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "studio", element: <StudioPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export function AppRoutes() {
  return useRoutes(routes);
}
