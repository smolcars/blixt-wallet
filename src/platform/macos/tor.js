export const RnTor = {
  async startTorIfNotRunning() {
    return { is_success: false, error_message: "Tor is unavailable in the initial macOS build.", control: "" };
  },
};
