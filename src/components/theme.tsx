"use client";

import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";

import { useI18n } from "@/i18n/client";

import { Menu, MenuItem } from "./menu";

type Theme = "light" | "dark" | "system";
const KEY = "theme";
const EVENT = "tally:theme";

function read(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
  apply(theme);
  window.dispatchEvent(new Event(EVENT));
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);

  // The inline script in layout.tsx sets data-theme before paint. React's
  // dev remount clears it, so re-apply before paint here too.
  useLayoutEffect(() => apply(theme), [theme]);

  // Follow the OS while on "system"
  useEffect(() => {
    if (theme !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return theme;
}

const OPTIONS: { value: Theme; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Desktop },
];

export function ThemeMenu() {
  const theme = useTheme();
  const { t } = useI18n();
  const Current = theme === "dark" ? Moon : theme === "light" ? Sun : Desktop;
  return (
    <Menu
      label={t.theme.label(t.theme[theme])}
      trigger={() => (
        <span className="inline-flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
          <Current size={20} />
        </span>
      )}
    >
      {(close) =>
        OPTIONS.map(({ value, icon: Icon }) => (
          <MenuItem
            key={value}
            active={theme === value}
            icon={<Icon size={18} />}
            onClick={() => {
              setTheme(value);
              close();
            }}
          >
            {t.theme[value]}
          </MenuItem>
        ))
      }
    </Menu>
  );
}
