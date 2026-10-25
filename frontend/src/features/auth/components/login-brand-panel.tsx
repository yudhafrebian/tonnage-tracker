"use client";

import { useI18n } from "@/shared/i18n/i18n-provider";
import { CheckIcon, WeightIcon } from "lucide-react";

// Logo + nama aplikasi; dipakai di panel brand dan di atas form (HP).
export const AppLogo = ({ inverted }: { inverted?: boolean }) => {
  const { dict } = useI18n();
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={
          inverted
            ? "flex size-9 items-center justify-center rounded-lg bg-primary-foreground text-primary"
            : "flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        }
      >
        <WeightIcon className="size-5" />
      </span>
      <span className="text-lg font-semibold">{dict.shell.appName}</span>
    </div>
  );
};

const LoginBrandPanel = () => {
  const { dict } = useI18n();
  const t = dict.loginBrand;

  return (
    <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
      <AppLogo inverted />
      <div className="flex max-w-md flex-col gap-4">
        <h2 className="text-3xl font-semibold tracking-tight">{t.title}</h2>
        <p className="text-primary-foreground/80">{t.description}</p>
        <ul className="flex flex-col gap-2 pt-2">
          {t.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary-foreground/15">
                <CheckIcon className="size-3" />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>
      {/* Bukan "© tahun": new Date() di sini memicu error prerender (cacheComponents). */}
      <p className="text-xs text-primary-foreground/60">{dict.shell.appTagline}</p>
    </aside>
  );
};

export default LoginBrandPanel;
