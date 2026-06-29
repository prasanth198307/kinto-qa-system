import { useState, useEffect, useCallback } from "react";
import { getPendingCount, syncToServer } from "@/utils/offline-db";
import { useToast } from "@/hooks/use-toast";

export function useOffline() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const syncPending = useCallback(async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      const result = await syncToServer();
      await refreshPendingCount();
      if (result.synced > 0) {
        toast({
          title: `✅ ${result.synced} offline order${result.synced > 1 ? 's' : ''} synced`,
          description: "All orders sent to kitchen",
        });
      }
    } finally {
      setSyncing(false);
    }
  }, [isOnline, syncing, refreshPendingCount, toast]);

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(() => syncPending(), 1000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_REQUESTED') syncPending();
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    const interval = setInterval(refreshPendingCount, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, []); // eslint-disable-line

  return { isOnline, pendingCount, syncPending, syncing, refreshPendingCount };
}
