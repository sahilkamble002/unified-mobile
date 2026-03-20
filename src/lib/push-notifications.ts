import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerPushToken, unregisterPushToken } from "@/src/api/notifications";
import { getPushToken, setPushToken } from "@/src/lib/auth-storage";

const ANDROID_PLATFORM = "ANDROID" as const;

const ensureAndroidChannel = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.MAX
  });
};

export const registerDevicePushToken = async () => {
  if (Platform.OS !== "android" || !Device.isDevice) {
    return null;
  }

  await ensureAndroidChannel();

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (finalStatus !== "granted") {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const devicePushToken = await Notifications.getDevicePushTokenAsync();
  const token =
    typeof devicePushToken === "string"
      ? devicePushToken
      : devicePushToken?.data || null;

  if (!token) {
    return null;
  }

  await registerPushToken({
    token,
    platform: ANDROID_PLATFORM
  });
  await setPushToken(token);

  return token;
};

export const unregisterDevicePushToken = async () => {
  const token = await getPushToken();

  if (!token) {
    return;
  }

  try {
    await unregisterPushToken(token);
  } catch {
    // best-effort cleanup
  } finally {
    await setPushToken(null);
  }
};
