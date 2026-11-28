"use client";

import { useEffect, useSyncExternalStore } from "react";
import { BiMoon, BiSun } from "react-icons/bi";

const settingKey = "geishara-dashboard-theme";
const themeChange = "geishara-theme-change";
const darkQuery = "(prefers-color-scheme: dark)";

function darkMode() {
  const theme = document.documentElement.dataset.theme;
  return theme ? theme === "dark" : matchMedia(darkQuery).matches;
}

function subscribe(callback: () => void) {
  const media = matchMedia(darkQuery);
  media.addEventListener("change", callback);
  window.addEventListener(themeChange, callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener(themeChange, callback);
  };
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, darkMode, () => false);
  useEffect(() => {
    function restoreTheme() {
      const theme = localStorage.getItem(settingKey);
      if (theme === "dark" || theme === "light") document.documentElement.dataset.theme = theme;
      else delete document.documentElement.dataset.theme;
      window.dispatchEvent(new Event(themeChange));
    }
    restoreTheme();
    window.addEventListener("storage", restoreTheme);
    return () => window.removeEventListener("storage", restoreTheme);
  }, []);

  function toggleTheme() {
    const next = darkMode() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(settingKey, next);
    window.dispatchEvent(new Event(themeChange));
  }

  return <button type="button" role="switch" aria-checked={dark} aria-label="Mode gelap" title="Mode gelap"
    className="theme-toggle" onClick={toggleTheme}>
    {dark ? <BiSun size={17} aria-hidden="true"/> : <BiMoon size={17} aria-hidden="true"/>}
  </button>;
}
