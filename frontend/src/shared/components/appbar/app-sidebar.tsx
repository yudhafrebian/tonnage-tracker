"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { WeightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useHydrated } from "@/shared/hooks/use-hydrated";
import { footerNavigation, isNavActive, navigation, type NavItem } from "./navigation";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useMeQuery } from "@/features/auth";
import { can } from "@/shared/lib/permissions";

// pathname undefined = belum diketahui (prerender): menu tampil tanpa penanda aktif.
const NavItems = ({ items, pathname }: { items: NavItem[]; pathname?: string }) => {
  const { data: me } = useMeQuery();
  // Isi Suspense di-hydrate belakangan, saat /auth/me mungkin sudah selesai di browser.
  // Selama hydration pakai role kosong seperti di server, supaya jumlah menu sama (tanpa mismatch).
  const role = useHydrated() ? me?.role : undefined;
  const { dict } = useI18n();
  const { state, isMobile } = useSidebar();
  // Tooltip hanya saat sidebar diciutkan jadi ikon. Saat load pertama sidebar selalu terbuka,
  // jadi tidak ada useId tooltip di HTML server: mencegah hydration mismatch ID di dalam Suspense.
  const collapsed = state === "collapsed" && !isMobile;

  return items
    .filter((item) => !item.permission || can(role, item.permission))
    .map((item) => (
      <SidebarMenuItem key={item.key}>
        <SidebarMenuButton
          render={<Link href={item.href} />}
          isActive={pathname !== undefined && isNavActive(item.href, pathname)}
          tooltip={collapsed ? dict.nav[item.key] : undefined}
        >
          {item.icon}
          <span>{dict.nav[item.key]}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));
};

const ActiveNavItems = ({ items }: { items: NavItem[] }) => (
  <NavItems items={items} pathname={usePathname()} />
);

// usePathname() hanya diketahui saat request: dibungkus Suspense supaya halaman
// dengan path dinamis (mis. 404 catch-all) tetap bisa di-prerender.
const Menu = ({ items }: { items: NavItem[] }) => (
  <SidebarMenu>
    <Suspense fallback={<NavItems items={items} />}>
      <ActiveNavItems items={items} />
    </Suspense>
  </SidebarMenu>
);

const AppSidebar = () => {
  const { dict } = useI18n();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <WeightIcon className="size-4" />
              </span>
              <span className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">{dict.shell.appName}</span>
                <span className="text-xs text-muted-foreground">{dict.shell.appTagline}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <Menu items={navigation} />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Menu items={footerNavigation} />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
