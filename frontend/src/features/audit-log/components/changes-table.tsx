"use client";

import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { diffSnapshots } from "../lib/diff";
import type { AuditLogItem } from "../types/types";

// Rincian perubahan satu baris log: Kolom | Sebelum | Sesudah.
const ChangesTable = ({ item }: { item: AuditLogItem }) => {
  const { dict } = useI18n();
  const t = dict.auditLog;
  const fmt = useFormatter();
  const changes = diffSnapshots(item.before, item.after);
  const showBefore = item.before !== null;
  const showAfter = item.after !== null;
  // Nilai kode (EXPORT, OUT, DAMAGE, ...) ditampilkan dengan label bahasa aktif.
  const codes: Record<string, Record<string, string>> = {
    market: dict.journal.markets,
    section: dict.journal.tabs,
    cause: dict.discrepancy.causes,
    status: dict.discrepancy.statuses,
  };

  const label = (path: string) => (t.fields as Record<string, string>)[path] ?? path;
  const value = (path: string, v: unknown) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "string" && codes[path]?.[v]) return codes[path][v];
    if (typeof v === "number") {
      return path === "amount" || path === "pricePerKg" ? fmt.rupiah(v) : fmt.kg(v);
    }
    if (["date", "effectiveFrom", "from", "to"].includes(path) && typeof v === "string") return fmt.date(v);
    return String(v);
  };

  if (changes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.noChanges}</p>;
  }

  return (
    <table className="w-full max-w-2xl text-sm">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="py-1 pr-4 font-normal">{t.field}</th>
          {showBefore && <th className="py-1 pr-4 text-right font-normal">{t.before}</th>}
          {showAfter && <th className="py-1 text-right font-normal">{t.after}</th>}
        </tr>
      </thead>
      <tbody>
        {changes.map((c) => (
          <tr key={c.path} className="border-t border-border/60">
            <td className="py-1 pr-4">{label(c.path)}</td>
            {showBefore && (
              <td className="py-1 pr-4 text-right tabular-nums text-muted-foreground">
                {/* Nilai lama dicoret hanya untuk Ubah, supaya jelas mana yang diganti. */}
                <span className={showAfter ? "line-through" : undefined}>
                  {value(c.path, c.before)}
                </span>
              </td>
            )}
            {showAfter && (
              <td className="py-1 text-right font-medium tabular-nums">{value(c.path, c.after)}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ChangesTable;
