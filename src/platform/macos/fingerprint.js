import { rejectUnavailable } from "./unavailable";
export default {
  isSensorAvailable: rejectUnavailable("Biometrics"),
  authenticate: rejectUnavailable("Biometrics"),
  release() {},
};
