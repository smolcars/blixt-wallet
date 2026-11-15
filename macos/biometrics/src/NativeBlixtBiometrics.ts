import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  isSensorAvailable(): Promise<string>;
  authenticate(reason: string, fallbackEnabled: boolean): Promise<boolean>;
  cancel(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>("NativeBlixtBiometrics");
