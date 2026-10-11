export const AuthorizationStatus = { DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 };
export const AndroidImportance = { HIGH: 4 };
export const AndroidVisibility = { PUBLIC: 1 };
export default {
  requestPermission: async () => ({ authorizationStatus: AuthorizationStatus.DENIED }),
  displayNotification: async () => { console.info("macOS notifications are disabled"); },
  registerForegroundService() {},
  stopForegroundService: async () => {},
};
