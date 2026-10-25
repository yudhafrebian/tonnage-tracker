"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COLOR_THEMES, MODES } from "@/features/auth";
import { useColorTheme } from "@/shared/components/ui/color-theme-provider";
import { locales } from "@/shared/i18n/config";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { switchLocale } from "@/shared/i18n/language-submenu";
import { cn } from "cn";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { useHydrated } from "@/shared/hooks/use-hydrated";

const MODE_ICONS: Record<string, ReactNode> = {
  light: <SunIcon className="size-5" />,
  dark: <MoonIcon className="size-5" />,
  system: <MonitorIcon className="size-5" />,
};

// Kartu pilihan: border primary + centang saat terpilih.
const OptionCard = ({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={cn(
      "relative flex flex-col gap-2 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
      selected && "border-primary ring-1 ring-primary",
      className,
    )}
  >
    {selected && (
      <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <CheckIcon className="size-3" />
      </span>
    )}
    {children}
  </button>
);

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <Card>
    <CardHeader className="border-b">
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const AppearanceSection = () => {
  const { lang, dict } = useI18n();
  const t = dict.settings.appearance;
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  // next-themes baru tahu tema setelah membaca localStorage: pilihan mode ditandai setelah hydrate.
  const mounted = useHydrated();

  return (
    <div className="flex flex-col gap-4">
      <Section title={t.mode} description={t.modeDescription}>
        <div className="grid grid-cols-3 gap-3">
          {MODES.map((m) => (
            <OptionCard
              key={m.value}
              selected={mounted && theme === m.value}
              onClick={() => setTheme(m.value)}
            >
              {MODE_ICONS[m.value]}
              <span className="font-medium">{dict.profile[m.labelKey]}</span>
            </OptionCard>
          ))}
        </div>
      </Section>

      <Section title={t.theme} description={t.themeDescription}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {COLOR_THEMES.map((c) => (
            <OptionCard
              key={c.value}
              selected={colorTheme === c.value}
              onClick={() => setColorTheme(c.value)}
            >
              {/* Pratinjau: variabel CSS tema berlaku di elemen mana pun yang punya data-theme. */}
              <div
                data-theme={c.value}
                className={cn(
                  "flex h-20 flex-col gap-1.5 rounded-md border bg-background p-2 font-sans text-foreground",
                  mounted && resolvedTheme === "dark" && "dark",
                )}
              >
                <span className="text-sm font-semibold">Aa</span>
                <div className="flex gap-1">
                  <span className="h-3 w-8 rounded-sm bg-primary" />
                  <span className="h-3 w-5 rounded-sm bg-secondary" />
                  <span className="h-3 w-4 rounded-sm bg-accent" />
                </div>
                <span className="h-1.5 w-full rounded-full bg-muted" />
              </div>
              <span className="font-medium">{dict.profile[c.labelKey]}</span>
            </OptionCard>
          ))}
        </div>
      </Section>

      <Section title={t.language} description={t.languageDescription}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {locales.map((l) => (
            <OptionCard
              key={l}
              selected={l === lang}
              onClick={() => l !== lang && switchLocale(l)}
              className="flex-row items-center"
            >
              <span className="w-8 text-xs font-semibold text-muted-foreground uppercase">{l}</span>
              <span className="font-medium">{dict.language[l]}</span>
            </OptionCard>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default AppearanceSection;
