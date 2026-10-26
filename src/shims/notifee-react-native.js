import { NativeModules, Platform } from "react-native";

export const AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

export const AndroidImportance = {
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
};

export const AndroidVisibility = {
  PRIVATE: 0,
  PUBLIC: 1,
};

function nativeNotifications() {
  const module = NativeModules.BlixtNotifications;
  if (!module) throw new Error("Native macOS notifications are missing. Rebuild Blixt.");
  return module;
}

const notifee = {
  async getNotificationSettings() {
    if (Platform.OS === "macos") return nativeNotifications().getNotificationSettings();
    return { authorizationStatus: AuthorizationStatus.DENIED };
  },

  async requestPermission(options = {}) {
    if (Platform.OS === "macos") return nativeNotifications().requestPermission(options);
    return {
      authorizationStatus: AuthorizationStatus.DENIED,
    };
  },

  async createChannel({ id }) {
    return id ?? "default";
  },

  async displayNotification(notification) {
    if (Platform.OS === "macos") {
      if (notification.android?.asForegroundService) {
        throw new Error("Foreground services are unavailable on macOS.");
      }
      return nativeNotifications().displayNotification({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        sound: notification.ios?.sound !== "",
      });
    }
    console.info("Notifications are unavailable on this platform.");
    return;
  },

  registerForegroundService() {},

  async stopForegroundService() {
    return;
  },
};

export default notifee;
