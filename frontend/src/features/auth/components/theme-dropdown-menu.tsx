"use client";

import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Palette, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";
import React from "react";
import { COLOR_THEMES, MODES } from "../lib/theme-list";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useColorTheme } from "@/shared/components/ui/color-theme-provider";

interface ThemeDropdownMenuProps {
  labelMode: string;
  labelTheme: string;
}

const ThemeDropdownMenu: React.FC<ThemeDropdownMenuProps> = ({ labelMode, labelTheme }) => {
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const { dict } = useI18n();

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <SunMoon />
          {labelMode}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {MODES.map((m) => (
            <DropdownMenuItem
              key={m.value}
              closeOnClick={false}
              onClick={() => setTheme(m.value)}
            >
              {dict.profile[m.labelKey]}
              {theme === m.value && <Check className="ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Palette />
          {labelTheme}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {COLOR_THEMES.map((c) => (
            <DropdownMenuItem
              key={c.value}
              closeOnClick={false}
              onClick={() => setColorTheme(c.value)}
            >
              {dict.profile[c.labelKey]}
              {colorTheme === c.value && <Check className="ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
};

export default ThemeDropdownMenu;
