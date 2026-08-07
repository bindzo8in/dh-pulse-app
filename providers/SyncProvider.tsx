import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as Network from 'expo-network';
import { useAttendanceOfflineStore, OfflineAction } from '@/stores/attendance-offline-store';
import { authClient } from '@/lib/auth-client';
import { File } from 'expo-file-system';

const API_BASE_URL = `${process.env.EXPO_PUBLIC_BETTER_AUTH_SERVER_URL}/api/attendance`;

interface SyncContextType {
  isSyncing: boolean;
  retrySync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
  retrySync: async () => {},
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const syncQueue = useAttendanceOfflineStore((s) => s.syncQueue);
  const [isSyncing, setIsSyncing] = useState(false);

  const isProcessingRef = useRef(false);
  const retryCountRef = useRef<Record<string, number>>({});
  const lastAttemptRef = useRef<Record<string, number>>({});

  const processQueue = useCallback(async (forceRetry = false) => {
    if (isProcessingRef.current) return;

    const store = useAttendanceOfflineStore.getState();
    const currentQueue = store.syncQueue;

    // Filter candidate actions to process
    const candidates = currentQueue.filter((action) => {
      if (action.status === 'PENDING') return true;
      if (action.status === 'SYNCING') return true;
      if (forceRetry) return true;
      if (action.status === 'FAILED') {
        const retries = retryCountRef.current[action.id] || 0;
        const lastAttempt = lastAttemptRef.current[action.id] || 0;
        // Retry failed items after 30s backoff if retries < 3
        return retries < 3 && Date.now() - lastAttempt > 30000;
      }
      return false;
    });

    if (candidates.length === 0) return;

    // Check Network State
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected === false) {
        return;
      }
    } catch (netErr) {
      console.warn("Failed to check network state", netErr);
    }

    isProcessingRef.current = true;
    setIsSyncing(true);

    try {
      for (const action of candidates) {
        const now = Date.now();
        const lastAttempt = lastAttemptRef.current[action.id] || 0;

        if (!forceRetry && now - lastAttempt < 3000) {
          continue;
        }

        lastAttemptRef.current[action.id] = now;

        try {
          useAttendanceOfflineStore.getState().updateActionStatus(action.id, 'SYNCING');
          await syncAction(action);
          useAttendanceOfflineStore.getState().removeAction(action.id);
          delete retryCountRef.current[action.id];
          delete lastAttemptRef.current[action.id];
        } catch (error: any) {
          const errorMsg = error?.message || 'Sync failed';
          console.error(`Sync failed for action ${action.id}:`, errorMsg);
          retryCountRef.current[action.id] = (retryCountRef.current[action.id] || 0) + 1;
          useAttendanceOfflineStore.getState().updateActionStatus(action.id, 'FAILED', errorMsg);
          break; // Stop processing further actions to preserve chronological order
        }
      }
    } finally {
      isProcessingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Trigger processing when syncQueue changes (only if there are PENDING/SYNCING actions and not processing)
  useEffect(() => {
    const hasPendingOrStuck = syncQueue.some(
      (a) => a.status === 'PENDING' || a.status === 'SYNCING'
    );

    if (hasPendingOrStuck && !isProcessingRef.current) {
      processQueue();
    }
  }, [syncQueue, processQueue]);

  const retrySync = useCallback(async () => {
    const store = useAttendanceOfflineStore.getState();
    for (const action of store.syncQueue) {
      store.updateActionStatus(action.id, 'PENDING');
      delete retryCountRef.current[action.id];
      delete lastAttemptRef.current[action.id];
    }
    await processQueue(true);
  }, [processQueue]);

  const syncAction = async (action: OfflineAction) => {
    let payload = { ...action.payload };

    if (action.type === 'CLOCK_IN' && payload.localSelfieUri) {
      let fileExists = true;
      try {
        const fileObj = new File(payload.localSelfieUri);
        fileExists = fileObj.exists;
      } catch (e) {
        console.warn("Could not verify selfie file existence", e);
      }

      if (fileExists) {
        try {
          const selfieData = await uploadSelfie(payload.localSelfieUri);
          payload.selfieUrl = selfieData.url;
          payload.selfiePublicId = selfieData.publicId;
          delete payload.localSelfieUri;

          try {
            const fileToDelete = new File(action.payload.localSelfieUri);
            fileToDelete.delete();
          } catch (e) {
            console.warn("Failed to delete local selfie after upload", e);
          }
        } catch (uploadErr: any) {
          console.warn("Cloudinary upload failed, proceeding with clock-in", uploadErr);
          delete payload.localSelfieUri;
        }
      } else {
        delete payload.localSelfieUri;
      }
    }

    const endpoint = getEndpoint(action.type);
    const { data, error } = await authClient.$fetch(endpoint, {
      method: 'POST',
      body: payload,
    });

    if (error) {
      throw error;
    }

    if (data && (data as any).success) {
      if ((data as any).record) {
        useAttendanceOfflineStore.getState().setRecord((data as any).record);
      }
    } else {
      throw new Error((data as any)?.error || (data as any)?.message || 'API Error during sync');
    }
  };

  const uploadSelfie = async (uri: string) => {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary credentials missing in env");
    }

    const formData = new FormData();
    formData.append("file", {
      uri,
      type: "image/jpeg",
      name: "selfie.jpg",
    } as any);

    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || "Upload failed");
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  };

  const getEndpoint = (type: OfflineAction['type']) => {
    switch (type) {
      case 'CLOCK_IN': return `${API_BASE_URL}/clock-in`;
      case 'CLOCK_OUT': return `${API_BASE_URL}/clock-out`;
      case 'START_BREAK': return `${API_BASE_URL}/start-break`;
      case 'END_BREAK': return `${API_BASE_URL}/end-break`;
    }
  };

  return (
    <SyncContext.Provider value={{ isSyncing, retrySync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
