# Native dependency and feature support

## Legend

- **✅** — real library implementation selected.
- **Custom** — Blixt implements the feature or bridges to a different backend.
- **Partial** — limited functionality, fallback, or additional host requirements; see notes.
- **🚫** — unavailable, disabled, or a no-op.
- **Unused** — not used for this platform's feature path.
- **Unverified** — no working integration established by this audit.

## Wallet, storage, and networking

| Library / feature | Android | iOS | macOS | Web | Electrobun | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| `react-native-turbo-lnd` | ✅ | ✅ | ✅ | Mock | ✅ + RPC |  |
| `react-native-nitro-tor` | ✅ | ✅ | ✅ | 🚫 | 🚫 |  |
| `react-native-nitro-modules` | ✅ | ✅ | ✅ | Unused | Unused |  |
| `react-native-turbo-sqlite` | ✅ | ✅ | ✅ | ✅ (browser) | Custom | Web: WASM/OPFS. Electrobun: Bun SQLite over RPC. |
| `@react-native-async-storage/async-storage` | ✅ | ✅ | ✅ | ✅ (browser) | Custom | Electrobun: backend KV store. |
| `react-native-keychain` / keystore | ✅ | ✅ | ✅ | Custom, limited | Custom, host-dependent | Web: localStorage. Electrobun: host-specific backend; see notes. |
| `react-native-fs` | ✅ | ✅ | ✅ | 🚫 | 🚫 via this package | Electrobun file helpers bypass RNFS. |
| `react-native-hash` | ✅ / JSHash | ✅ / JSHash | ✅ / JSHash | JSHash path | JSHash path | macOS: Podfile adds osx support; upstream fix deferred. |
| Blixt `NativeSpeedloader` | Custom | Custom | Custom | 🚫 | Custom | |

## OS features

| Library / feature | Android | iOS | macOS | Web | Electrobun | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| `@notifee/react-native` | ✅ | ✅ | Custom, partial | 🚫 | 🚫 | macOS: custom implementation via shim. |
| `react-native-permissions` | ✅ | ✅ | 🚫 | 🚫 | 🚫 | macOS notification permissions handled by our Notifee shim. Port deferred. |
| `@react-native-documents/picker` | ✅ | ✅ | Custom feature; package unavailable | 🚫 | 🚫 | macOS: custom native picker for backups. |
| Backup export / native file dialogs | Custom + library | Custom + library | Custom | 🚫 for native flow | Partial | Electrobun export/picker integration incomplete. |
| `react-native-fingerprint-scanner` | ✅ (fork) | ✅ (fork) | 🚫 | 🚫 | 🚫 | macOS Touch ID deferred. |
| `react-native-icloudstore` | Unused | ✅ (fork) | 🚫 | 🚫 | 🚫 | macOS integration deferred. |
| `@react-native-google-signin/google-signin` | ✅ | Unused by Blixt | Unused | Unused | Unused | Google Drive sign-in used only on Android. |
| `@react-native-clipboard/clipboard` | ✅ | ✅ | ✅ | ✅ (browser) | ✅ (browser) | Browser permission required. |
| `react-native-vision-camera` + barcode scanner | ✅ | ✅ | 🚫 | Custom via ZXing | Partial via ZXing | Web: ZXing/getUserMedia. |
| `@react-native-community/geolocation` | ✅ | ✅ | 🚫 | Unverified | Unverified | No browser replacement configured. |
| `react-native-maps` | ✅ | ✅ | 🚫 | 🚫 | 🚫 | Desktop/browser placeholder. |
| `react-native-haptic-feedback` | ✅ | ✅ | Unused | Unused | Unused |  |
| Blixt scheduled background sync | Custom | 🚫 | 🚫 | 🚫 | 🚫 | Android only. |

## UI, navigation, and rendering

| Library / feature | Android | iOS | macOS | Web | Electrobun | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| React Navigation (`native`, `stack`, drawer/tabs) | ✅ | ✅ | ✅ | ✅ | ✅ | Uses JS stack. |
| `react-native-screens` | ✅ | ✅ | ✅ JS fallback + patch | ✅ web path | ✅ web path | macOS: 4.25.0 JS fallback; patched tabs exports. |
| `react-native-gesture-handler` | ✅ | ✅ | ✅ | ✅ web path | ✅ web path |  |
| `react-native-reanimated` / `react-native-worklets` | ✅ | ✅ | ✅ | ✅ web path | ✅ web path |  |
| `react-native-safe-area-context` | ✅ | ✅ | ✅ | ✅ web path | ✅ web path |  |
| `react-native-keyboard-controller` | ✅ | ✅ | Partial shim | Partial shim | Partial shim | Basic keyboard-avoiding view only. |
| `react-native-svg` and SVG QR codes | ✅ + patch | ✅ + patch | ✅ + patch | Replacement | Replacement | Patches: RCTAssert and RN resolution. Web: react-native-svg-web. |
| `react-native-vector-icons` | ✅ | ✅ | Partial: fonts/JS | ✅ web build | ✅ web build | macOS: bundled fonts; native helpers disabled. Upstream fix deferred. |
| `react-native-linear-gradient` | ✅ (legacy option) | ✅ (legacy option) | Unused native module | CSS / replacement | CSS / replacement | macOS: shared RN background gradient. Web: CSS/replacement. |
| `react-native-webview` / WebLN browser | ✅ | ✅ | ✅ | Partial replacement | Partial replacement | Web: react-native-web-webview. |
| `react-native-dialogs` / prompts | ✅ (fork) | Custom/RN alternative | Custom/RN alternative | Custom browser UI | Custom helper screens | Blixt alert/prompt helpers on other platforms. |
| RN Animated | ✅ | ✅ | ✅ + patch | RN Web | RN Web | macOS: bridgeless native animation patch. |
| RN virtualized lists | ✅ | ✅ | Partial workaround | RN Web | RN Web | macOS: Settings lists use ScrollView; investigation deferred. |

## Notes

- **Keystore:** web uses localStorage. Electrobun uses a Windows backend, Linux Secret Service with file fallback, or JSON files on other hosts.
- **Deferred on macOS:** RNPermissions port, biometrics, iCloud, camera, location/maps, and FlatList investigation.
- **Upstream fixes:** see [UPSTREAM_FIXES.md](UPSTREAM_FIXES.md).
- **Compatibility code:** [shared shims](src/shims), [web shims](src/shims/web), [Electrobun bridges](electrobun/src/shims), and platform-specific source files.
- **Configuration:** [macOS aliases](macos/metro.config.js), [native exclusions](macos/react-native.config.js), [web/Electrobun aliases](vite.config.ts). Edit [macOS overrides](macos/dependency-overrides.json), then run `bun macos:sync`.
- See [RESTORATION.md](macos/RESTORATION.md) for detailed fixes and validation gaps.
