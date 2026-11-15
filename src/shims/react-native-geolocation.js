export default {
  getCurrentPosition(success, failure) {
    failure?.({ code: 2, message: "Location is unavailable on this platform." });
  },
};
