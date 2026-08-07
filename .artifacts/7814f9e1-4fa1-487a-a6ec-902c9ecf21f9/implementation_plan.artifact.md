# Offline Attendance Support with Background Sync

Implement offline support for attendance actions (Clock In, Clock Out, Breaks) by queueing them locally when the internet is unavailable and syncing them once connection is restored.

## User Review Required

> [!IMPORTANT]
> - Selfies taken while offline will be stored locally in the app's document directory until successfully synced to Cloudinary.
> - The sync process will run automatically when the app is in the foreground and a network connection is detected.
> - Manual sync can be triggered by visiting the Attendance screen.

## Proposed Changes

### [Component] Offline Storage

#### [NEW] [attendance-offline-store.ts](file:///C:/dh-pulse/stores/attendance-offline-store.ts)
- Create a `zustand` store with persistence using `expo-secure-store`.
- Manage a queue of `OfflineAction` items (clock-in, clock-out, start-break, end-break).

### [Component] Attendance Logic

#### [MODIFY] [index.tsx](file:///C:/dh-pulse/app/(tabs)/attendance/index.tsx)
- Update `submitAttendance`, `handleClockOut`, `handleStartBreak`, and `handleEndBreak` to check for network connectivity using `expo-network`.
- If offline, save the action to the `OfflineAttendanceStore`.
- For `clock-in`, move the selfie from the temporary cache to a permanent location using `expo-file-system` before queueing.

#### [NEW] [SyncProvider.tsx](file:///C:/dh-pulse/providers/SyncProvider.tsx)
- Create a provider to monitor network status and process the offline queue.
- Use `expo-network` to detect connectivity.
- Process actions in order: upload images to Cloudinary (if needed), then call backend API.

#### [MODIFY] [_layout.tsx](file:///C:/dh-pulse/app/(tabs)/_layout.tsx)
- Wrap the application or the tabs with `SyncProvider`.

## Verification Plan

### Automated Tests
- N/A (Unit tests could be added for the store logic if a test environment exists).

### Manual Verification
1. **Clock In Offline**:
   - Turn off Wi-Fi/Mobile Data.
   - Perform "Clock In" with a selfie.
   - Verify it says "Saved offline" or similar and shows up as pending in the UI.
2. **Restore Connection**:
   - Turn on Wi-Fi.
   - Verify the app automatically uploads the selfie and syncs the record.
3. **Clock Out / Breaks**:
   - Repeat similar steps for Clock Out and Break actions.
4. **App Restart**:
   - Queue an action, close the app, reopen, and verify the action is still in the queue and syncs when online.
