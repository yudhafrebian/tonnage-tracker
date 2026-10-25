export const locales = ["id", "en", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "id";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// Untuk Intl.NumberFormat / DateTimeFormat
export const intlTag: Record<Locale, string> = { id: "id-ID", en: "en-US", zh: "zh-CN" };
