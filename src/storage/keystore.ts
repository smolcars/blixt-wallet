import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';
import NativeBlixtTools from '../turbomodules/NativeBlixtTools';

const USER = 'blixt';
// Preserve credential names used by existing installations. Only new, isolated
// desktop app identifiers (such as restoration test copies) get a namespace.
const legacyApplicationIds = new Set([
  'com.blixtwallet',
  'com.blixtwallet.debug',
  'com.blixtwallet.regtest',
  'com.blixtwallet.regtest.debug',
]);
const credentialKey = (key: string) => {
  if (Platform.OS !== 'macos') return key;
  const applicationId = NativeBlixtTools.getApplicationId();
  return legacyApplicationIds.has(applicationId) ? key : `${applicationId}:${key}`;
};

export const setItem = async (key: string, value: string, accessible: Keychain.ACCESSIBLE = Keychain.ACCESSIBLE.ALWAYS) => {
  const options = {
    accessible,
  };
  // accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY, // Possible error by Lightning-app here... omitting ACCESSIBLE
  // // https://github.com/lightninglabs/lightning-app/blob/master/src/action/keychain-mobile.js#L21
  // // TODO tell them
  await Keychain.setInternetCredentials(credentialKey(key), USER, value, options);
};

export const getItem = async (key: string): Promise<string | null> => {
  const credentials = await Keychain.getInternetCredentials(credentialKey(key));
  if (credentials) {
    return credentials.password;
  }
  else {
    return null;
  }
};

export const setItemObject = async <T>(key: string, value: T) => await setItem(key, JSON.stringify(value));
export const getItemObject = async (key: string) => JSON.parse(await getItem(key) || "null");

export const removeItem = async (key: string) => {
  await Keychain.resetInternetCredentials(credentialKey(key));
}

export const setSeed = async (seed: string[]) => setItemObject("seed", seed);
export const getSeed = async (): Promise<string[] | null> => getItemObject("seed");
export const removeSeed = async () => removeItem("seed");

export const setPin = async (seed: string) => setItem("pin", seed);
export const getPin = async () => getItem("pin");
export const removePin = async () => removeItem("pin");

export const setWalletPassword = async (password: string) => setItem("password", password, Keychain.ACCESSIBLE.ALWAYS);
export const getWalletPassword = async (): Promise<string | null> => getItem("password");
