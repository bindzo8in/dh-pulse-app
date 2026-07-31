import React, { createContext, useContext, useEffect, useRef } from 'react';
import * as Network from 'expo-network';
import { useAttendanceOfflineStore, OfflineAction } from '@/stores/attendance-offline-store';
import { authClient } from '@/lib/auth-client';
import { File } from 'expo-file-system';

const API_BASE_URL = `${process.env.EXPO_PUBLIC_BETTER_AUTH_SERVER_URL}/api/attendance`;

const SyncContext = createContext<{ isSyncing: boolean }>({ isSyncing: false });

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const syncQueue = useAttendanceOfflineStore((s) => s.syncQueue);
  const removeAction = useAttendanceOfflineStore((s) => s.removeAction);
  const updateActionStatus = useAttendanceOfflineStore((s) => s.updateActionStatus);
  const setRecord = useAttendanceOfflineStore((s) => s.setRecord);

  const isProcessing = useRef(false);

  useEffect(() => {
    const processQueue = async () => {
      if (isProcessing.current || syncQueue.length === 0) return;

      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) return;

      isProcessing.current = true;

      for (const action of syncQueue) {
        if (action.status === 'SYNCING') continue;

        try {
          updateActionStatus(action.id, 'SYNCING');
          await syncAction(action);
          removeAction(action.id);
        } catch (error: any) {
          console.error(`Sync failed for action ${action.id}:`, error);
          updateActionStatus(action.id, 'FAILED', error.message);
          // Stop processing further actions if one fails (to preserve order)
          break;
        }
      }

      isProcessing.current = false;
    };

    processQueue();
  }, [syncQueue, updateActionStatus, removeAction]);

  const syncAction = async (action: OfflineAction) => {
    let payload = { ...action.payload };

    // 1. Handle Selfie Upload if needed
    if (action.type === 'CLOCK_IN' && payload.localSelfieUri) {
      const selfieData = await uploadSelfie(payload.localSelfieUri);
      payload.selfieUrl = selfieData.url;
      payload.selfiePublicId = selfieData.publicId;
      delete payload.localSelfieUri;

      // Try to delete local file after upload
      try {
          const fileToDelete = new File(action.payload.localSelfieUri);
          fileToDelete.delete();
      } catch (e) {
          console.warn("Failed to delete local selfie", e);
      }
    }

    // 2. Call Backend API
    const endpoint = getEndpoint(action.type);
    const { data, error } = await authClient.$fetch(endpoint, {
      method: 'POST',
      body: payload,
    });

    if (error) throw error;

    if (data && (data as any).success) {
      setRecord((data as any).record);
    } else {
      throw new Error((data as any)?.error || 'API Error');
    }
  };

  const uploadSelfie = async (uri: string) => {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

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
    <SyncContext.Provider value={{ isSyncing: isProcessing.current }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
