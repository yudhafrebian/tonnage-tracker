import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAuditLogsApi } from "./audit-log.api";
import type { AuditLogFilters } from "../types/types";

export const auditLogKeys = {
  list: (filters: AuditLogFilters) => ["audit-logs", filters] as const,
};

// keepPreviousData: pindah halaman / ganti filter tidak mengosongkan tabel sambil menunggu.
export const useAuditLogsQuery = (filters: AuditLogFilters) =>
  useQuery({
    queryKey: auditLogKeys.list(filters),
    queryFn: () => getAuditLogsApi(filters),
    placeholderData: keepPreviousData,
  });
