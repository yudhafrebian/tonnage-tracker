import "server-only";
import type { Locale } from "./config";
import type { Dictionary } from "./types";

// Kalau id.json / zh.json kurang satu key, TypeScript langsung error di sini.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  id: () => import("./dictionaries/id.json").then((m) => m.default),
  zh: () => import("./dictionaries/zh.json").then((m) => m.default),
};

export const getDictionary = (locale: Locale) => dictionaries[locale]();
