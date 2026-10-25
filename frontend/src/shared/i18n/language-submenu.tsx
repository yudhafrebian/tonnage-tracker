"use client";

import { Check, Languages } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_COOKIE, locales, type Locale } from "./config";
import { useI18n } from "./i18n-provider";

// Di luar komponen: React Compiler melarang komponen mengubah global seperti document.cookie.
export function switchLocale(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  // Reload penuh: proxy membaca cookie baru dan semua halaman dirender ulang dengan bahasa baru.
  window.location.reload();
}

export function LanguageSubmenu() {
  const { lang, dict } = useI18n();

  const change = (next: Locale) => {
    if (next !== lang) switchLocale(next);
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Languages />
        {dict.profile.language}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {locales.map((l) => (
          <DropdownMenuItem key={l} onClick={() => change(l)}>
            {dict.language[l]}
            {l === lang && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
