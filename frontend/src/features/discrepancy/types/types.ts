// Sesuai respons /discrepancies (backend discrepancy.service.ts).

export const CAUSES = ["MISCOUNT", "DAMAGE", "OUT_UNRECORDED", "OTHER"] as const;
export type Cause = (typeof CAUSES)[number];

export const STATUSES = ["OPEN", "RESOLVED"] as const;
export type DiscrepancyStatus = (typeof STATUSES)[number];

export type Discrepancy = {
  id: string;
  date: string; // "2026-10-24"
  party: string;
  item: string;
  size: string | null;
  mcDiff: number | null; // + lebih banyak dari catatan, - kurang
  kgDiff: number | null;
  cause: Cause;
  note: string | null;
  status: DiscrepancyStatus;
  resolution: string | null;
  resolvedAt: string | null;
  createdBy: { id: string; username: string; name: string };
  createdAt: string;
  updatedAt: string;
};

export type DiscrepancyList = { items: Discrepancy[]; openCount: number };

export type DiscrepancyPayload = {
  date: string;
  party: string;
  item: string;
  size: string | null;
  mcDiff: number | null;
  kgDiff: number | null;
  cause: Cause;
  note: string | null;
};

// Barang yang sudah diketahui (mis. dari baris sisa stok di jurnal) untuk mengisi form.
export type DiscrepancyPrefill = Partial<Pick<DiscrepancyPayload, "date" | "party" | "item" | "size">>;
