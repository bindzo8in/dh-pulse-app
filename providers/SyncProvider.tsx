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
  const removeAction = useAttendanceOfflineStore((s) => s.removeAction);
  const updateActionStatus = useAttendanceOfflineStore((s) => s.updateActionStatus);
  const setRecord = useAttendanceOfflineStore((s) => s.setRecord);

  const [isSyncing, setIsSyncing] = useState(false);
  const isProcessingRef = useRef(false);
  const retryCountRef = useRef<Record<string, number>>({});
  const lastAttemptRef = useRef<Record<string, number>>({});

  const processQueue = useCallback(async (forceRetry = false) => {
    if (isProcessingRef.current || syncQueue.length === 0) return;

    // Check Network State
    try {
      const networkState = await Network.getNetworkStateAsync();
      console.log("SyncProvider networkState =>", networkState);
      if (networkState.isConnected === false) {
        console.log("Sync skipped: Device is offline");
        return;
      }
    } catch (netErr) {
      console.warn("Failed to check network state, attempting sync anyway", netErr);
    }

    isProcessingRef.current = true;
    setIsSyncing(true);

    try {
      for (const action of syncQueue) {
        const now = Date.now();
        const lastAttempt = lastAttemptRef.current[action.id] || 0;
        const retries = retryCountRef.current[action.id] || 0;

        // Skip if failed multiple times and not forced
        if (!forceRetry && action.status === 'FAILED' && retries >= 3 && now - lastAttempt < 30000) {
          console.log(`Action ${action.id} has failed ${retries} times. Waiting before next retry.`);
          break;
        }

        // Avoid hammering retries too quickly (wait at least 3s between retries)
        if (!forceRetry && now - lastAttempt < 3000) {
          continue;
        }

        lastAttemptRef.current[action.id] = now;

        try {
          updateActionStatus(action.id, 'SYNCING');
          await syncAction(action);
          removeAction(action.id);
          delete retryCountRef.current[action.id];
          delete lastAttemptRef.current[action.id];
        } catch (error: any) {
          const errorMsg = error?.message || 'Sync failed';
          console.error(`Sync failed for action ${action.id} (${action.type}):`, errorMsg);
          retryCountRef.current[action.id] = (retryCountRef.current[action.id] || 0) + 1;
          updateActionStatus(action.id, 'FAILED', errorMsg);

          // Stop processing subsequent actions to preserve order
          break;
        }
      }
    } finally {
      isProcessingRef.current = false;
      setIsSyncing(false);
    }
  }, [syncQueue, updateActionStatus, removeAction]);

  // Reset any stuck 'SYNCING' actions on mount or queue update
  useEffect(() => {
    let hasStuckActions = false;
    for (const action of syncQueue) {
      if (action.status === 'SYNCING') {
        const lastAttempt = lastAttemptRef.current[action.id] || 0;
        if (Date.now() - lastAttempt > 15000) {
          updateActionStatus(action.id, 'PENDING');
          hasStuckActions = true;
        }
      }
    }
    if (hasStuckActions) return;

    processQueue();
  }, [syncQueue, processQueue, updateActionStatus]);

  const retrySync = useCallback(async () => {
    // Reset all failed / syncing actions to PENDING for manual retry
    for (const action of syncQueue) {
      updateActionStatus(action.id, 'PENDING');
      delete retryCountRef.current[action.id];
      delete lastAttemptRef.current[action.id];
    }
    await processQueue(true);
  }, [syncQueue, updateActionStatus, processQueue]);

  const syncAction = async (action: OfflineAction) => {
    let payload = { ...action.payload };

    // 1. Handle Selfie Upload if present
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

          // Attempt local file cleanup
          try {
            const fileToDelete = new File(action.payload.localSelfieUri);
            fileToDelete.delete();
          } catch (e) {
            console.warn("Failed to delete local selfie file after upload", e);
          }
        } catch (uploadErr: any) {
          console.warn("Cloudinary selfie upload failed, proceeding with clock-in payload", uploadErr);
          delete payload.localSelfieUri;
        }
      } else {
        console.warn("Local selfie file not found at path, proceeding without selfie", payload.localSelfieUri);
        delete payload.localSelfieUri;
      }
    }

    // 2. Call Backend API
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
        setRecord((data as any).record);
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
