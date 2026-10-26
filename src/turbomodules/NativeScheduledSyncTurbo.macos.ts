const unavailable = () => {
  throw new Error("Scheduled sync is unavailable on macOS.");
};
export default {
  startSyncWorker: unavailable,
  scheduleSyncWorker: unavailable,
  stopScheduleSyncWorker: unavailable,
  setupScheduledSyncWork: async () => false,
  removeScheduledSyncWork: async () => false,
  checkScheduledSyncWorkStatus: async () => "WORK_NOT_EXIST" as const,
};
