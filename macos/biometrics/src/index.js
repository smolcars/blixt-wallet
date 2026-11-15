import NativeBiometrics from "./NativeBlixtBiometrics";

function scannerError(error) {
  const result = new Error(error.message || "Touch ID authentication failed.");
  result.name = error.code || "AuthenticationFailed";
  return result;
}

let generation = 0;
export default {
  async isSensorAvailable() {
    try {
      return await NativeBiometrics.isSensorAvailable();
    } catch (error) {
      throw scannerError(error);
    }
  },
  async authenticate({ description = "Unlock Blixt Wallet", fallbackEnabled = true } = {}) {
    const attempt = ++generation;
    try {
      const success = await NativeBiometrics.authenticate(description, fallbackEnabled);
      if (attempt !== generation) throw { code: "UserCancel", message: "Authentication cancelled." };
      if (success !== true) throw { code: "AuthenticationFailed", message: "Touch ID authentication failed." };
      return true;
    } catch (error) {
      throw scannerError(error);
    }
  },
  release() {
    generation++;
    NativeBiometrics.cancel();
  },
};
