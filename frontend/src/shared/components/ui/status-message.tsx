import { cn } from "cn";
import type { ReactNode } from "react";

interface StatusMessageProps {
  icon: ReactNode;
  // Angka besar di atas judul, mis. "404". Opsional.
  code?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  footnote?: ReactNode;
  className?: string;
}

// Tampilan bersama untuk halaman error, 404, dan keadaan kosong satu layar penuh.
export const StatusMessage = ({
  icon,
  code,
  title,
  description,
  actions,
  footnote,
  className,
}: StatusMessageProps) => (
  <div
    className={cn(
      "mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center",
      className,
    )}
  >
    <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-7">
      {icon}
    </span>
    {code && <p className="text-5xl font-bold tracking-tight tabular-nums">{code}</p>}
    <div className="flex flex-col gap-1.5">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    {actions && <div className="flex flex-wrap justify-center gap-2">{actions}</div>}
    {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
  </div>
);
