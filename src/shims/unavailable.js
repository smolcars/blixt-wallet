export const unavailable = (feature) => {
  throw new Error(`${feature} is unavailable on this platform.`);
};
export const rejectUnavailable = (feature) => async () => unavailable(feature);
