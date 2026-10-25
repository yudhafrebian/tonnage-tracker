"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { PaletteIcon, UserIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppearanceSection from "./appearance-section";
import ProfileSection from "./profile-section";

export const SETTINGS_TABS = ["profile", "appearance"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

// lg: menu vertikal, item aktif diberi latar (garis bawah hanya untuk tab horizontal di HP).
const TRIGGER =
  "lg:flex-none lg:justify-start lg:py-2 lg:after:hidden lg:data-active:bg-muted!";

const isTab =(v: string | null): v is SettingsTab =>
  (SETTINGS_TABS as readonly string[]).includes(v ?? "");

// Tab aktif ada di URL (?tab=appearance), jadi menu profil bisa membuka tab tertentu
// dan tombol Back browser kembali ke tab sebelumnya.
const SettingsPage = () => {
  const { dict } = useI18n();
  const t = dict.settings;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("tab");
  const tab: SettingsTab = isTab(raw) ? raw : "profile";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>
      {/* HP: tab horizontal di atas; lg: menu vertikal di kiri. */}
      <Tabs
        value={tab}
        onValueChange={(v) => router.replace(`${pathname}?tab=${v}`, { scroll: false })}
        // lg:data-horizontal:flex-row: harus memakai variant yang sama dengan bawaan Tabs
        // (data-horizontal:flex-col) supaya bisa menimpanya.
        className="gap-6 lg:data-horizontal:flex-row"
      >
        <TabsList
          variant="line"
          className="h-fit! w-full justify-start lg:w-48 lg:shrink-0 lg:flex-col lg:items-stretch"
        >
          <TabsTrigger value="profile" className={TRIGGER}>
            <UserIcon />
            {t.tabs.profile}
          </TabsTrigger>
          <TabsTrigger value="appearance" className={TRIGGER}>
            <PaletteIcon />
            {t.tabs.appearance}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="min-w-0">
          <ProfileSection />
        </TabsContent>
        <TabsContent value="appearance" className="min-w-0">
          <AppearanceSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
