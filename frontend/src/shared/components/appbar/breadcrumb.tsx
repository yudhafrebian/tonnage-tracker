"use client";

import { useI18n } from "@/shared/i18n/i18n-provider";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { footerNavigation, isNavActive, navigation } from "./navigation";

// "Dasbor › Pengeluaran": supaya tetap jelas sedang di halaman mana saat sidebar ditutup.
const Breadcrumb = () => {
  const pathname = usePathname();
  const { dict } = useI18n();
  const current = [...navigation, ...footerNavigation].find((item) =>
    isNavActive(item.href, pathname),
  );
  const isHome = current?.href === "/dashboard";

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {isHome || !current ? (
        <span className="font-medium">{dict.nav.dashboard}</span>
      ) : (
        <>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            {dict.nav.dashboard}
          </Link>
          <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span aria-current="page" className="truncate font-medium">
            {dict.nav[current.key]}
          </span>
        </>
      )}
    </nav>
  );
};

export default Breadcrumb;
