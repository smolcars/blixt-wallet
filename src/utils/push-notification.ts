import notifee from "@notifee/react-native";

import { ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID } from "./constants";

export const localNotification = (message: string): Promise<string> => {
  return notifee.displayNotification({
    body: message,
    android: {
      channelId: ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID,
    },
  });
};
