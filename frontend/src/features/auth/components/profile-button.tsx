"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Settings, User } from "lucide-react";
import { useMeQuery } from "../api/auth.query";
import LogoutAlertDialog from "./logout-dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLogout } from "../hooks/useAuth";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { LanguageSubmenu } from "@/shared/i18n/language-submenu";
import ThemeDropdownMenu from "./theme-dropdown-menu";

const TextSkeleton = () => {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
};

const ProfileButton = () => {
  const [open, setOpen] = useState<boolean>(false);
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.profile;

  const { data, isPending } = useMeQuery();
  const {
    handleLogout,
    isPending: isLoadingLogout,
    error,
    reset,
  } = useLogout();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  if (isPending) {
    return (
      <div className="flex items-center gap-2">
        <TextSkeleton />
        <Avatar size="lg">
          <AvatarFallback>
            <User />
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <p className="text-sm">{data?.name}</p>
              <p className="text-xs text-muted-foreground">
                {data && dict.roles[data.role]}
              </p>
            </div>
            <Avatar size="lg">
              <AvatarFallback>
                <User />
              </AvatarFallback>
            </Avatar>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => router.push("/dashboard/settings?tab=profile")}>
            <User />
            {t.profile}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/dashboard/settings?tab=appearance")}>
            <Settings />
            {t.settings}
          </DropdownMenuItem>
          <LanguageSubmenu />
          <ThemeDropdownMenu labelMode={t.themeMode} labelTheme={t.theme}/>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setOpen(true)}
            className={"text-destructive"}
          >
            <LogOut />
            {t.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoutAlertDialog
        open={open}
        onOpenChange={onOpenChange}
        onSubmit={handleLogout}
        isLoading={isLoadingLogout}
        error={error}
      />
    </>
  );
};

export default ProfileButton;
