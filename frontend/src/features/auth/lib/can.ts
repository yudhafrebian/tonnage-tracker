import { Permission } from "../../../shared/lib/permissions";
import { usePermission } from "../hooks/useAuth";

export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { allowed, isPending } = usePermission(permission);
  if (isPending) return null;
  return allowed ? children : fallback;
}
