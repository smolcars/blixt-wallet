import { rejectUnavailable } from "./unavailable";

export const Tor = {
  daemon: {
    start: rejectUnavailable("Tor"),
  },
};

export default { Tor };
