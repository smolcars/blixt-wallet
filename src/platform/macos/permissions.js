export const RESULTS = { UNAVAILABLE: "unavailable", DENIED: "denied", BLOCKED: "blocked", GRANTED: "granted", LIMITED: "limited" };
export const PERMISSIONS = { IOS: { LOCATION_WHEN_IN_USE: "location" }, ANDROID: {} };
export const check = async () => RESULTS.UNAVAILABLE;
export const request = check;
export const checkNotifications = async () => ({ status: RESULTS.UNAVAILABLE, settings: {} });
export const requestNotifications = checkNotifications;
export default { RESULTS, PERMISSIONS, check, request, checkNotifications, requestNotifications };
