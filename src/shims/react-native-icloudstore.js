import { rejectUnavailable } from "./unavailable";
export default {
  getItem: rejectUnavailable("iCloud backup"),
  setItem: rejectUnavailable("iCloud backup"),
  removeItem: rejectUnavailable("iCloud backup"),
};
