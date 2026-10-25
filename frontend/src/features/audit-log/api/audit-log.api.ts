import api from "@/shared/lib/api";
import type { AuditLogFilters, AuditLogPage } from "../types/types";

export const AUDIT_PAGE_SIZE = 25;

export const getAuditLogsApi = async (filters: AuditLogFilters) => {
  const res = await api.get<{ success: true; data: AuditLogPage }>("/audit-logs", {
    params: { ...filters, limit: AUDIT_PAGE_SIZE },
  });
  return res.data.data;
};
