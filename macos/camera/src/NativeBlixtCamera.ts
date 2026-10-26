import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export type CameraDevice = { id: string; name: string };
export interface Spec extends TurboModule {
  requestPermission(): Promise<boolean>;
  getDevices(): Promise<CameraDevice[]>;
}
export default TurboModuleRegistry.getEnforcing<Spec>("NativeBlixtCamera");
