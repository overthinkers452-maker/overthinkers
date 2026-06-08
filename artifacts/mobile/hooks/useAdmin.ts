import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import * as svc from "@/lib/thoughtsService";
import type { ReportGroup } from "@/lib/thoughtsService";

export function useAdmin() {
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin ?? false;

  const [queue, setQueue] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await svc.fetchReportQueue();
      setQueue(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load report queue");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const dismiss = useCallback(async (group: ReportGroup) => {
    if (!isAdmin) return;
    const key = `${group.targetType}:${group.targetId}`;
    setActionLoading(key);
    setError(null);
    try {
      await svc.dismissReports(group.targetType, group.targetId);
      setQueue(q => q.filter(g => !(g.targetId === group.targetId && g.targetType === group.targetType)));
    } catch (e: any) {
      setError(e?.message ?? "Action failed");
    } finally {
      setActionLoading(null);
    }
  }, [isAdmin]);

  const remove = useCallback(async (group: ReportGroup) => {
    if (!isAdmin) return;
    const key = `${group.targetType}:${group.targetId}`;
    setActionLoading(key);
    setError(null);
    try {
      await svc.removeContent(group.targetType, group.targetId);
      setQueue(q => q.filter(g => !(g.targetId === group.targetId && g.targetType === group.targetType)));
    } catch (e: any) {
      setError(e?.message ?? "Action failed");
    } finally {
      setActionLoading(null);
    }
  }, [isAdmin]);

  const warn = useCallback(async (group: ReportGroup, reason: string) => {
    if (!isAdmin || !group.authorId) return;
    const key = `${group.targetType}:${group.targetId}`;
    setActionLoading(key);
    setError(null);
    try {
      await svc.warnUser(group.authorId, reason);
    } catch (e: any) {
      setError(e?.message ?? "Action failed");
    } finally {
      setActionLoading(null);
    }
  }, [isAdmin]);

  return { isAdmin, queue, loading, actionLoading, error, refresh, dismiss, remove, warn };
}
