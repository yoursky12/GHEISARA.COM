"use client";

import { useEffect, useState } from "react";
import { BiArrowFromLeft, BiArrowFromRight } from "react-icons/bi";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

export function DashboardControls() {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const interval = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(interval);
  }, [router]);

  useEffect(() => {
    const dashboard = document.querySelector<HTMLElement>(".art-dashboard");
    if (!dashboard) return;
    dashboard.dataset.collapsed = String(collapsed);
  }, [collapsed]);

  return <div className="dashboard-controls">
    <ThemeToggle/>
    <button type="button" className="dashboard-icon-button dashboard-sidebar-toggle" onClick={() => setCollapsed(value => !value)}
      aria-expanded={!collapsed} aria-controls="dashboard-sidebar-links" aria-label={collapsed ? "Lebarkan sidebar" : "Ringkas sidebar"}
      title={collapsed ? "Lebarkan sidebar" : "Ringkas sidebar"}>
      {collapsed ? <BiArrowFromLeft size={17}/> : <BiArrowFromRight size={17}/>}
    </button>
  </div>;
}
