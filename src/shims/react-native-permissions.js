import { rejectUnavailable } from "./unavailable";

export const RESULTS = Object.freeze({ UNAVAILABLE: "unavailable", DENIED: "denied", BLOCKED: "blocked", GRANTED: "granted", LIMITED: "limited" });
export const PERMISSIONS = Object.freeze({ IOS: { LOCATION_WHEN_IN_USE: "location" }, ANDROID: {}, WINDOWS: {} });
export const check = async () => RESULTS.UNAVAILABLE;
export const request = check;
export const checkMultiple = async (permissions) =>
  Object.fromEntries(permissions.map((permission) => [permission, RESULTS.UNAVAILABLE]));
export const requestMultiple = checkMultiple;
export const checkNotifications = async () => ({ status: RESULTS.UNAVAILABLE, settings: {} });
export const requestNotifications = checkNotifications;
export const checkLocationAccuracy = rejectUnavailable("Location accuracy");
export const requestLocationAccuracy = checkLocationAccuracy;
export const openSettings = rejectUnavailable("Permission settings");
export const openLimitedPhotoLibraryPicker = rejectUnavailable("Photo library access");

export default { RESULTS, PERMISSIONS, check, request, checkMultiple, requestMultiple, checkNotifications, requestNotifications, checkLocationAccuracy, requestLocationAccuracy, openSettings, openLimitedPhotoLibraryPicker };
