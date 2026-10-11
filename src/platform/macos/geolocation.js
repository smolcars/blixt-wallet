export default {
  getCurrentPosition(success, failure) {
    failure?.({ code: 2, message: "Location is unavailable in the initial macOS build." });
  },
};
