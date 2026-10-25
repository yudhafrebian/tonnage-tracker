import type { Dictionary } from "@/shared/i18n/types";

type Key = keyof Dictionary["profile"];

export const MODES: { value: string; labelKey: Key }[] = [
  { value: "light", labelKey: "themeLight" },
  { value: "dark", labelKey: "themeDark" },
  { value: "system", labelKey: "themeSystem" },
];

export const COLOR_THEMES: { value: string; labelKey: Key }[] = [
  { value: "default", labelKey: "themeDefault" },
  { value: "macaron", labelKey: "themeMacaron" },
  { value: "meridian", labelKey: "themeMeridian" },
  { value: "zen", labelKey: "themeZen" },
  { value: "sakura", labelKey: "themeSakura" },
];