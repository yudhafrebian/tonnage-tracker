// Sesuai respons GET /audit-logs (backend audit-log.service.ts).

export const AUDIT_ENTITIES = ["DailyRecap", "Expense", "PriceRate"] as const;
export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

export const AUDIT_ACTIONS = ["create", "update", "delete", "import"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// Snapshot bermakna bisnis yang disimpan backend, mis. { date, process: { total, ... }, note }.
export type AuditSnapshot = Record<string, unknown>;

export type AuditLogItem = {
  id: string;
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string | null;
  before: AuditSnapshot | null;
  after: AuditSnapshot | null;
  createdAt: string; // ISO
  user: { id: string; username: string; name: string };
};

export type AuditLogPage = {
  items: AuditLogItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AuditLogFilters = {
  entity?: AuditEntity;
  action?: AuditAction;
  from?: string; // "2026-10-01", inklusif
  to?: string; // inklusif
  page: number;
};
