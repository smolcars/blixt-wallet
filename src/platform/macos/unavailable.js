export const unavailable = (feature) => {
  throw new Error(`${feature} is unavailable in the initial macOS build.`);
};
export const rejectUnavailable = (feature) => async () => unavailable(feature);
