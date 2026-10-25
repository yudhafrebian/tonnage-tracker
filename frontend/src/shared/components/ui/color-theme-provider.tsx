"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";

import { COLOR_THEME_DEFAULT as DEFAULT, COLOR_THEME_KEY as KEY } from "./color-theme-script";

const EVENT = "color-theme-change";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback); // sinkron antar tab
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(KEY) ?? DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function getServerSnapshot() {
  return DEFAULT;
}

type ColorThemeContextValue = {
  colorTheme: string;
  setColorTheme: (theme: string) => void;
};

const ColorThemeContext = createContext<ColorThemeContextValue>({
  colorTheme: DEFAULT,
  setColorTheme: () => {},
});

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const colorTheme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Pasang atribut setiap kali nilai berubah (load awal, klik menu, atau dari tab lain).
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", colorTheme);
  }, [colorTheme]);

  const setColorTheme = useCallback((theme: string) => {
    try {
      localStorage.setItem(KEY, theme);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export const useColorTheme = () => useContext(ColorThemeContext);