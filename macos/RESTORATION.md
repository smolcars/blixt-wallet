# macOS target restoration

Upstream fixes and contribution follow-ups are tracked in [UPSTREAM_FIXES.md](../UPSTREAM_FIXES.md).

The target uses the React Native macOS 0.83.0 template and now runs a minimal wallet with temporary desktop adapters. A development-signed, sandboxed Regtest build reached Overview, created a real wallet, and unlocked it after restart. Dependency installation, autolinking, code generation, and JavaScript bundling pass. The original debug mainnet wallet has also been backed up, reopened, and unlocked; the user confirmed it works. This is an initial runnable target, not validation of every feature or migration path. Later issue-log entries supersede the historical initial-build results below.

## Current status — 2026-10-16

The user confirmed the title-bar color, scrolling in Settings and Power User Tools, picker cancellation, and backup/recovery functions work. The user also confirms their old mainnet Debug and Release wallets work correctly. No legacy-settings migration failure is reported; migration is not tracked as an outstanding revival blocker.

Deferred by request: Touch ID/biometrics, iCloud backup, interactive verification of camera scanning outside Send, location/maps, and investigation of the underlying FlatList virtualization/clipping failure. Settings and Power User Tools keep the macOS ScrollView workaround. Touch ID requires a macOS-capable native integration, either an extension to the existing library or a LocalAuthentication bridge, with cancellation/error handling and the existing authentication policy preserved.

Compatibility code is consolidated in `src/shims/`. Browser-specific implementations remain in `src/shims/web/`. Electrobun's native SQLite, storage, BlixtTools, and Speedloader bridges remain in `electrobun/src/shims/` because they implement a different runtime rather than duplicate unavailable-feature shims. There is no separate macOS adapter directory. Desktop Metro still substitutes Keyboard Controller, Fingerprint Scanner, iCloud Store, Permissions, Notifee, geolocation, document picker, and maps. Native backup dialogs bypass the unavailable generic document-picker shim. Hashing uses the real react-native-hash JSHash implementation, with a temporary Podfile fix for macOS platform declaration. The Notifee shim now forwards macOS permission checks/requests and local notification delivery to a native module; its web implementation remains unavailable. Other replacements provide limited or unavailable behavior. NitroTor and Screens use real libraries (Screens uses its upstream JS fallback).

macOS now uses the shared background-gradient header instead of the SVG component. The extra gradient scaling wrapper has been removed; the user confirmed scrolling works with the simplified layout. Earlier gradient workarounds below are historical.

## Generated desktop package (current setup)

Mobile uses the root `package.json`, `bun.lock`, and `node_modules` with RN 0.85.2. macOS has its own `macos/package.json`, `macos/bun.lock`, and `macos/node_modules`. Shared application source remains in `src/`; there is no copy of the app.

Do not edit `macos/package.json` by hand. `scripts/sync-macos-package.cjs` generates it from the root dependencies/devDependencies and `macos/dependency-overrides.json`. Shared dependency additions, changes, and removals propagate automatically. The override file contains only desktop differences: RN 0.83.10, react-native-macos 0.83.0, Screens 4.25.0, matching RN tooling, the two-import Screens patch, and the bridgeless Animated module selection patch. React currently stays at the shared 19.2.3 version. The macOS fork's exact RN peer is now satisfied.

The generator also derives the application version, engine requirement, codegen configuration (adjusting the shared-source path), and inherited patches. Desktop scripts are explicit rather than inheriting mobile build/postinstall commands. Generated dependency declarations remain synchronized; the two lockfiles resolve and freeze their own dependency graphs. A shared version range can resolve differently between lockfiles, and each platform still needs compatibility testing.

Update workflow from the repository root:

```sh
# Edit shared versions in package.json; intentional desktop differences go in
# macos/dependency-overrides.json.
bun run macos:install  # regenerate manifest, install/update desktop lock, fetch LND
bun run macos:check    # read-only check; fails on stale generated content
bun run macos:pods    # after native dependency changes
```

Commit the root dependency changes, overrides when applicable, generated `macos/package.json`, and `macos/bun.lock` together. For CI/reproducible installation, first run `bun run macos:check`, then run `bun install --frozen-lockfile` inside `macos/` (use `--ignore-scripts` when binary downloads are unnecessary). The dedicated `macOS dependency sync` workflow checks generation, generator behavior, and frozen desktop installation. CLI launches, Metro configuration, direct desktop installation, and Pod installation also reject stale generated manifests.

Metro resolves shared-source imports into `macos/node_modules`, forces React and the renderer to that tree, and blocks the mobile install tree from the desktop bundle. It preserves nested dependency resolution within the desktop tree. Babel selects all presets/plugins from the desktop tree for macOS, including the compiler and Worklets plugin. Desktop setup does not require installing the mobile dependency tree. `macos/cli.cjs` runs the CLI from the desktop package. Pod paths, LND headers, and Xcode bundle scripts use the desktop install. The small Node resolver hook remains necessary for native tools that look up `react-native`: those lookups must select the macOS fork rather than its upstream RN peer.

Screens is installed under its real package name in the desktop tree; the former `@blixt/macos-*` root aliases are gone. Its upstream plain-view fallback and desktop-only patch remain in use; native Screens autolinking remains disabled. Deployment stays macOS 14 with New Architecture and Hermes.

The previous single-root solution is preserved by Git snapshot `3c364219` (`Restore runnable macOS wallet with isolated root dependency resolution`). Later historical log entries describing root aliases refer to that snapshot, not the current layout.

Sources: [0.83.0 release](https://github.com/microsoft/react-native-macos/releases/tag/react-native-macos%400.83.0), [published macOS package](https://unpkg.com/react-native-macos@0.83.0/package.json), [template](https://github.com/microsoft/react-native-macos/tree/19f618c/packages/react-native/local-cli/generator-macos/templates/macos).

## Setup and checks

From the repository root:

```sh
bun run macos:install
bun run macos:pods
bun run macos:bundle
```

`macos:lnd` downloads the macOS XCFramework for the installed `react-native-turbo-lnd` version and checks its published SHA-256 digest. The old `macos/liblnd.a` is no longer linked; the LND pod owns the framework. The root postinstall fetcher prepares mobile artifacts. The generated desktop postinstall fetches its own macOS artifact; `macos:lnd` can repeat that step if needed.

CocoaPods 1.16.2 and Xcode 27 were used for this attempt. `macos:pods` uses the installed `pod` executable. The repository's existing Ruby bundle was missing `bigdecimal`, `nkf`, `json`, and `ffi` in this environment, so `bundle exec pod install` was not used. The pod hook raises older resource-bundle deployment targets to the application's macOS 14 floor for Xcode 27.

To reproduce native compilation without signing or launching a wallet:

```sh
xcodebuild \
  -workspace macos/BlixtWallet.xcworkspace \
  -scheme 'BlixtWallet Mainnet' \
  -configuration Debug \
  -destination 'platform=macOS,arch=arm64' \
  -derivedDataPath /tmp/blixt-macos-derived \
  CODE_SIGNING_ALLOWED=NO build
```

Use `bun run macos:start` and `bun run macos:regtest-debug`. A valid development signing identity/profile is required for native keychain access; open the workspace in Xcode to configure signing for your team. An unsigned build only checks compilation. Mainnet and Regtest each have Debug and Release scripts. The old Testnet/Fakelnd scripts referred to schemes that do not exist and have been removed.

The SwiftUI application preserves the `BlixtWallet` JS module name, URL event forwarding, app icons, fonts, entitlements, and existing bundle identifiers. The project now includes the shared LND tools and Speedloader module/provider. Original debug-wallet startup and the initial Regtest flows have been validated as recorded below; broader migration and runtime coverage remains outstanding.

## NitroTor 1.0 adoption (current)

Blixt now pins published `react-native-nitro-tor@1.0.0` in the root manifest and generated macOS package. The desktop Metro alias and native autolinking exclusion are removed; web and Electrobun keep the unavailable Tor shim. The release includes a macOS 14+ universal arm64/x86_64 framework, and the existing app entitlements already permit network clients and servers.

Version 1.0 removes `RnTor`. Shared wallet initialization now calls `Tor.daemon.start` through `startTorForLnd`, passes the returned SOCKS/control endpoints to LND, and propagates failures to the existing explicit “Continue without Tor” prompt. LND manages its persistent onion service through SAFECOOKIE control authentication; The old NitroTor startTorIfNotRunning API also created an extra onion service whose address Blixt did not use. Tor.daemon.start starts only the daemon; LND still creates and manages the wallet’s onion service. The app’s configured Tor data directory and 30-second bootstrap timeout remain unchanged. The web shim uses the new API and rejects startup explicitly. Mobile consumes the same API migration and requires a native rebuild.

Validation of the published release: frozen root/desktop installs, macOS and iOS pod installation, focused startup/shim/toolchain/manifest tests, the startup helper’s TypeScript check, and full macOS/web JavaScript bundles pass. The arm64 native Debug test host built successfully. With App Sandbox confirmed active, a separate test identity (`org.smolcars.NitroTorSmoke`) and fresh container data ran Blixt’s actual startup helper: bootstrap completed in 9,973 ms under the app’s 30-second timeout; the helper used the running daemon’s control endpoint; onion-service creation and removal succeeded; HTTPS returned HTTP 200 with `IsTor: true`; and the daemon returned to `stopped`. Temporary test processes were stopped and the original Xcode project identity restored. No existing wallet or stored Tor preference was changed.

The root dependency upgrade also required regenerating the iOS Pod lockfile, which reconciled pre-existing drift with the current mobile dependency tree. RN remains 0.85.2 on mobile. No iOS/Android application build, Intel runtime test, or funded LND/channel operation was performed during this adoption. The module smoke test verifies Tor and Blixt’s argument construction, not a full wallet session over Tor.

The normal `com.blixtwallet.debug` app was then rebuilt with development signing; the build and strict deep code-signature verification passed. It was not launched against the existing wallet. Installed Release apps still need a native rebuild to receive NitroTor 1.0.

The older source audit and disabled-Tor entries below describe the pre-1.0 restoration stages.

## Native library audit

This initial audit used the published versions declared by the root manifest and the refreshed root install. Desktop now inherits those declarations with explicit overrides and uses `macos/bun.lock`. The originally installed root packages were older than the manifest. A declared platform is not proof that a library compiles or works with this renderer.

The following packages declare macOS in their published podspecs and were selected by autolinking:

- Async Storage 3.1.1; Clipboard 1.16.3; RNFS 2.20.0; Keychain 10.0.0.
- Gesture Handler 3.2.1; Reanimated 4.5.3; Worklets 0.11.4; Safe Area Context 5.9.1.
- SVG 15.15.5; WebView 14.0.1; Nitro Modules 0.37.0.
- Turbo LND 0.0.22 and Turbo SQLite 0.7.0. LND publishes a macOS XCFramework. SQLite is configured without SQLCipher, as in the existing project.

Reanimated's 4.5.x compatibility metadata includes RN 0.83 and Worklets 0.11.x. Gesture Handler 3 documents RN 0.82 as its minimum. These RN version declarations still require macOS build/runtime validation. Sources: [Reanimated metadata](https://unpkg.com/react-native-reanimated@4.5.3/compatibility.json), [Worklets metadata](https://unpkg.com/react-native-worklets@0.11.4/compatibility.json), [Gesture Handler README](https://unpkg.com/react-native-gesture-handler@3.2.1/README.md), [LND podspec](https://unpkg.com/react-native-turbo-lnd@0.0.22/react-native-turbo-lnd.podspec).

These packages have no macOS platform in their shipped podspecs and are excluded in the desktop CLI config:

- Notifee, Push Notification iOS, geolocation, document picker, Google Sign-In.
- Fingerprint Scanner, haptic feedback, RN Hash, iCloud Store, Permissions.
- Keyboard Controller, Linear Gradient, Maps, Nitro Image, Screens, Vector Icons 9.2.
- Nitro Tor, Vision Camera, and its barcode scanner.

Representative sources: [Nitro Tor podspec](https://unpkg.com/react-native-nitro-tor@0.6.0/ReactNativeNitroTor.podspec), [Nitro Image podspec](https://unpkg.com/react-native-nitro-image@0.15.2/NitroImage.podspec), [Screens podspec](https://unpkg.com/react-native-screens@4.29.0/RNScreens.podspec), [document picker podspec](https://unpkg.com/@react-native-documents/picker@12.0.2/react-native-document-picker.podspec).

Nitro Tor needs a more precise distinction: its [upstream README](https://github.com/niteshbalusu11/react-native-nitro-tor#platform-support) advertises macOS support. However, our installed 0.6.0 package declares only iOS in its podspec, and its `ios/framework/libreactnativenitrotor.xcframework/Info.plist` lists only iOS device and simulator libraries, with no macOS slice. The missing pieces are macOS packaging and validation, rather than a new Tor implementation. Adding a podspec platform alone will not supply the missing binary. Tor remains disabled in this Blixt build until it consumes the corrected package described below.

Further Nitro Tor investigation (2026-10-11): npm's stable tag is 0.6.1 and its next tag is 1.0.0-rc.2. Both release source trees still have an iOS-only podspec and XCFramework; updating Blixt's dependency alone will not fix this. The current [Craby configuration](https://github.com/smolcars/react-native-nitro-tor/blob/021470cc83e9afa01df69021d649d9ab1cb2a60a/craby.toml) configures Android and iOS, and the [release workflow](https://github.com/smolcars/react-native-nitro-tor/blob/021470cc83e9afa01df69021d649d9ab1cb2a60a/.github/workflows/release.yml) validates only Android and iOS example builds. The [prerelease podspec](https://github.com/smolcars/react-native-nitro-tor/blob/v1.0.0-rc.2/ReactNativeNitroTor.podspec) and [XCFramework manifest](https://github.com/smolcars/react-native-nitro-tor/blob/v1.0.0-rc.2/ios/framework/libreactnativenitrotor.xcframework/Info.plist) show the concrete blockers.

The checked pre-Craby release v0.2.8 also had an iOS-only podspec and Tor XCFramework. Therefore, this investigation does not establish a Craby regression or a previously working published macOS integration; the README's support claim is ahead of the inspected packaging. Fix this in smolcars/react-native-nitro-tor: build/package Darwin arm64 and x86_64 libraries, declare macOS in the podspec, validate native module registration with react-native-macos, and add a macOS build check. Blixt can then consume the corrected package and remove its Tor exclusion/adapter. No Tor build or runtime validation was performed during this source/package audit.

**Upstream fix and runtime validation:** [Nitro Tor PR #16](https://github.com/smolcars/react-native-nitro-tor/pull/16) adds the macOS pod configuration, a universal arm64/x86_64 framework, and build/smoke-test scripts. The existing Rust, C++, and Apple module provider required no implementation changes. Both architectures passed linking for macOS 14 with linker warnings treated as errors. Live tests passed on arm64 and x86_64 under Rosetta: Tor bootstrap, onion-service creation, HTTPS confirmed as using Tor, and shutdown. A separate unsigned React Native macOS 0.83.0 test host also passed those operations through the real JavaScript module and promises, using temporary test data. The test-only Blixt configuration changes were restored; adopting a published Nitro Tor release and removing Blixt's adapter/exclusion remain follow-up work.

Two build details matter: keep the Rust archive's `-prebuilt` suffix to avoid colliding with CocoaPods' `libReactNativeNitroTor.a` on case-insensitive filesystems, and clean cached native C objects if changing the deployment target. The upstream script pins macOS 14 and its smoke test rejects deployment-target linker warnings. The CI/release-gate commit (`5e73a3f`) is now included in PR #16: it builds both Darwin architectures, validates the rebuilt and committed frameworks, and requires the macOS check before publishing. The initial push was blocked by missing GitHub `workflow` scope; granting that scope resolved it.

Both `ios` and `macos` entries must be disabled in the desktop CLI config: the macOS autolinker falls back to `ios`, and the published pod integration invokes Apple codegen with `-t ios`. No such exclusions are applied to mobile. Excluding pods does not make imports or feature calls safe.

## What Screens support means for this app

`react-native-screens` does not currently advertise native macOS support: its [supported-platform list](https://github.com/software-mansion/react-native-screens#supported-platforms) omits macOS, its Apple podspec has no macOS target, and the installed `src/core.ts` enables native screens only for iOS, Android, and Windows.

Blixt uses `@react-navigation/stack` (the JavaScript stack), drawer, and JavaScript bottom tabs. It does not use `@react-navigation/native-stack`. Upstream documents [plain-view rendering with Screens disabled](https://github.com/software-mansion/react-native-screens#disabling-react-native-screens), so losing native screen containers does not by itself require replacing React Navigation. However, `enableScreens(false)` alone did not solve our package-loading problems: Metro still encountered incompatible codegen and missing platform exports. The initial handwritten adapter has now been removed. Metro selects the real Screens 4.25.0 package from `macos/node_modules`. Its own Screen/ScreenContainer components choose their ordinary-view fallback on macOS. Two patched experimental-tab imports avoid missing platform entry files. This is still a patched fallback configuration, not an upstream-supported native macOS port.

The sidebar glitch was observed while this alias was active and the native Screens pod was excluded. Navigation state advanced, but stack slide progress stayed at zero. Disabling those transitions fixed the visible symptom, as confirmed by the user. The animation-driver failure was subsequently isolated to an iOS-only bridgeless module selection check in RN macOS 0.83.0. A desktop-only patch now selects its existing Turbo Animated module and restores native-driven transitions (see the investigation below). The adapter's discarded activity state was a separate bug, also corrected.

Navigation reliability remains a priority. A full AppKit/Fabric Screens port would be a substantially larger project than maintaining the ordinary-view path needed by this app, and is not an established prerequisite for restoration.

## Follow-up work beyond the minimal launch

1. Validate the restored upstream Screens fallback for the existing JavaScript navigators. Native Screens support is absent, but a full native port is not required for Blixt's JS stack/drawer/tabs. The real Screens 4.25.0 desktop dependency now replaces the temporary adapter; its built-in fallback handles inactive-screen visibility. Stack transitions have now been restored after isolating and patching the animation-module selection bug. Debugger checks cover sidebar navigation, Back, nested screens, and Help; broader pointer/pixel, focus, and layout validation remains. The initial attempt used Screens 4.29.0; the current root lockfile/install is 4.27.0. Both are in the 4.26+ line requiring RN 0.84+. The initial isolated 4.25.0 trial failed resolving `./TabsHost` on macOS; the two-import patch described below now resolves that failure. These are version/import problems in addition to the missing native platform.
2. Replace the temporary disabled-feature adapters as desktop support becomes available. `src/state/index.ts` imports Nitro Tor, whose native spec uses `getEnforcing`; `src/App.tsx` imports Keyboard Controller. Notifications, geolocation, permissions, and iCloud also enter the shared import graph. The macOS-specific aliases below now prevent those native imports and mark unavailable operations explicitly. Do not silently fall back from requested Tor to a direct connection.
3. Validate data preservation and runtime behavior of the macOS branch added for the changed `RNCAsyncStorage` native API in shared `BlixtTools.swift`. Version 3 retains a legacy storage class, but its `multiGet` API now returns a dictionary with an NSError argument instead of the callback used by Blixt. The desktop branch reads the existing legacy store and resolves a Boolean. The branch compiles successfully; data-preservation behavior still needs verification, including whether legacy settings remain authoritative after Async Storage migration. The mobile branch is unchanged.
4. Audit user-facing features after startup: keychain/biometrics, backup import/export, images, gradients, fonts, WebLN, deep links, filesystem access, Tor configuration, and QR scanning. The macOS camera component displays an unavailable message; QR scanning remains disabled.
5. Extend the successful Regtest creation/unlock, persistence, LND RPC/state-stream, and signed/sandboxed startup checks to funded transactions, chain sync, Speedloader, and Release builds. Neither a successful pod install nor a successful bundle establishes wallet correctness.

## Issue and fix log

### Obsolete project entry point and build scripts

**Found:** The project used an Objective-C delegate, `main.m`, and a storyboard. Its Podfile required the removed CLI `native_modules` script and passed outdated Fabric options. Xcode referenced mobile RN paths, an obsolete macOS 13.3 SDK path for `libresolv`, and an old packager launcher. Several npm scripts named schemes/configurations that did not exist.

**Changed:** Migrated to the 0.83 SwiftUI `Window`/`RCTReactNativeFactory` template; retained URL forwarding and Blixt resources. Modernized autolinking and the post-install call, selected the fork's build scripts, used SDK-relative `libresolv`, and retained the real Mainnet/Regtest schemes. Added the missing LND tools and Speedloader sources/provider; removed direct linkage of the obsolete local `liblnd.a`.

**Checked:** Xcode project/plist syntax and all source file paths pass. Four build configurations are present. App launch and deep-link delivery remain untested.

### Dependency layout and version selection

**Found:** The macOS dependency was missing entirely. Mobile is RN 0.85.2; the fork is based on 0.83.10. Installed root packages were older than `package.json`.

**Changed:** Initially tested a standalone macOS package, then removed it at the user's request. Final layout uses the root manifest/lockfile, explicit desktop tooling aliases, Metro mapping, and the desktop-only Node resolver described above. Refreshed root dependencies to the already declared versions. Mobile dependency version declarations are unchanged.

**Checked:** Ordinary Node resolves mobile RN 0.85.2. With the desktop preload it resolves `react-native-macos` 0.83.0; that fork resolves codegen and CLI plugin 0.83.10. The root configuration identifies the existing macOS workspace. Bun's peer warning remains as described above.

### Unsupported packages entering native codegen

**Found:** The first `pod install` stopped in Screens with `The first argument of method showColumn must be of type React.ElementRef<>`. The Apple codegen pass was also examining iOS-only libraries.

**Changed:** Excluded the unsupported packages listed above from both macOS and iOS entries in the desktop CLI configuration. This affects desktop commands only. Both keys are needed because the fork's Apple autolinker falls back to iOS and its codegen subprocess uses `-t ios`.

**Checked:** Codegen and pod installation succeed in the final root-based layout: 95 Podfile dependencies and 94 installed pods. JS imports still require adapters; exclusions are not runtime implementations.

### Xcode 27 resource-bundle deployment target

**Found:** Native build failed before compilation because `RNSVG-RNSVGFilters` retained macOS 10.14; Xcode 27 supports deployment targets starting at 12.0.

**Changed:** The macOS pod hook raises pod targets below 14.0 to the application's deployment floor, including resource bundles.

**Checked:** A subsequent native build passed this stage and compiled the RN core and third-party targets.

### SVG missing assertion header

**Found:** SVG 15.15.5 failed in `apple/RNSVGUIKit.macos.mm:105` with `use of undeclared identifier 'RCTAssert'`.

**Changed:** Added `#import <React/RCTAssert.h>` in the macOS-only source. The fix is saved as `patches/react-native-svg@15.15.5.patch` and registered in root `patchedDependencies`, so Bun reinstalls reproduce it.

**Checked:** The next native build compiled the patched file successfully, then exposed the separate SVG version-discovery issue below.

**Upstream (2026-10-12):** Submitted the standalone one-line import as [react-native-svg PR #3069](https://github.com/software-mansion/react-native-svg/pull/3069). Recompiled current upstream source against the existing React Native macOS 0.83.0 host’s Debug arm64/new-architecture headers: the unpatched translation unit fails with undeclared `RCTAssert`; adding the import produces an object file successfully. This validation did not require the separate package-version-resolution change. Keep the local patch until a release includes the fix.

### SVG reconstructing the mobile package path

**Found:** SVG's Ruby helper called Node to resolve React Native, then discarded the resolved package name and opened `react-native/package.json` relative to its parent. In the shared root layout, this selected mobile 0.85 despite the desktop resolver. Compilation failed in `RNSVGImage.mm` because RN 0.85 uses shared-pointer image observers while the macOS fork expects references.

**Changed:** Extended the reproducible SVG patch to read the exact package JSON path returned by Node. The ordinary mobile lookup retains its original package and version.

**Checked:** Pod installation now generates `REACT_NATIVE_MINOR_VERSION=83` for SVG and the app target. The next build compiled SVG successfully and reached Swift dependencies. The root toolchain tests and frozen lockfile installation still pass.

**Upstream (2026-10-12):** Submitted the package-resolution fix independently as [react-native-svg PR #3070](https://github.com/software-mansion/react-native-svg/pull/3070). A regression test reproduces the wrong version with ordinary Node resolution through a filesystem symlink to a differently named package, without Blixt’s custom resolver. The test fails on upstream and passes with the fix; all four tests (normal resolution, symlinked fork, explicit fallback, nightly handling) pass with nine assertions. The PR adds CI execution for these Ruby tests. Keep the local patch until a release includes the fix.

### glog headers imported inside a C++ namespace

**Found:** Compiling Nitro Modules' Swift/C++ interface failed in glog 0.3.5: `import of module 'glog.glog.log_severity' appears within namespace 'google'`. `logging.h` includes `log_severity.h` and `vlog_is_on.h` inside that namespace, conflicting with CocoaPods' inferred header submodules. Disabling `SWIFT_ENABLE_EXPLICIT_MODULES` did not fix it; that build-setting experiment is not retained.

**Changed:** The macOS Podfile marks those two headers as textual in glog's generated module map, preserving their inclusion context. The post-install hook reproduces the fix after installation. No global Swift module setting has been changed.

**Checked:** The unsigned Debug arm64 build passed with this module-map change, including Nitro Modules and the application Swift code. A fresh `pod install` reproduced the textual-header declarations, and the subsequent native build also passed.

### Screens JavaScript and platform compatibility

**Found:** Screens 4.29.0 failed Metro's RN 0.83 codegen transform for `SearchBarNativeComponent.ts` (`blur` uses `React.ComponentRef` instead of the accepted `React.ElementRef`). Its README requires RN 0.84+ for 4.26+. An isolated 4.25.0 trial then failed to resolve `./TabsHost` on macOS.

**Initial-launch fix:** A macOS-only ordinary-view adapter avoids the unsupported exports; bundle, Overview, Settings, Receive, and Send smoke checks pass. The root mobile dependency is preserved. A maintained adapter/fork and broader layout/transition validation are still needed. [Screens compatibility](https://unpkg.com/react-native-screens@4.29.0/README.md).

### Automatically started Metro using mobile configuration

**Found:** `run-macos` can start Metro itself, without the explicit `--config` used by `macos:start`. With a shared root package, it must still select the desktop renderer/toolchain.

**Changed:** The root Metro config honors `BLIXT_PLATFORM=macos`, set by the desktop launcher. Xcode's bundle phase also sets this flag and explicitly supplies the desktop Metro config.

**Checked:** The toolchain tests verify desktop and mobile Metro platform configuration along with runtime/codegen/Babel selection. The minimal Regtest wallet subsequently launched with the desktop adapters below.

### Native Async Storage API change

**Found:** Source inspection showed Blixt calling the pre-v3 callback API on `RNCAsyncStorage`. Version 3.1.1's legacy class exposes synchronous `multiGet:error:` on its storage queue.

**Changed:** Added a macOS-only branch using the singleton, storage queue, throwing dictionary-returning API, and Boolean result. It reads the legacy settings rather than creating a new store. The mobile branch remains unchanged.

**Checked:** The macOS branch compiles in the successful native build. Runtime behavior and data preservation remain unverified.

### Startup services without macOS implementations

**Found:** The current app statically imports unsupported services, including Nitro Tor's enforcing native module and Keyboard Controller's provider. There are also existing camera stubs and UI/platform assumptions.

**Initial-launch fix:** The desktop aliases below disable unsupported services. Wallet, storage, and security operations use real native implementations; unavailable authentication, backup, and Tor operations cannot report success.

## Initial native-migration validation record

These were the results before the minimal-launch follow-up below.

Validation environment: Apple Silicon, Xcode 27.0 (27A266a), Node 23.5.0, Bun 1.3.10, CocoaPods 1.16.2.

- `bun install --frozen-lockfile --ignore-scripts`: passes for the final root manifest and lockfile. The SVG patch is registered and installed. The normal postinstall also completed the version-matched mobile LND artifact fetch; the additional macOS artifact was downloaded and checksum-verified separately.
- `node --test tests/macos-toolchain.test.cjs`: two tests pass. They cover runtime/codegen selection in separate desktop/mobile processes and Babel platform selection, including switching back to mobile after a desktop lookup.
- Mobile CLI config: selects root `node_modules/react-native`; the macOS fork is not listed as a native dependency for mobile autolinking.
- Desktop CLI config: selects `node_modules/react-native-macos`, the existing `macos/BlixtWallet.xcworkspace`, and root native library paths.
- `pod install` from `macos/`: passes in the final layout. Gesture Handler's generated compilation flags contain `REACT_NATIVE_MINOR_VERSION=83`; Nitro Modules also discovers the fork as 0.83.
- Ruby/JavaScript config syntax, plist/project syntax, source-file references, and `git diff --check`: pass.
- `bun run macos:bundle`: fails at Screens 4.29.0's `SearchBarNativeComponent.ts` codegen type. Further bundle/runtime errors can remain behind this first failure.
- Native Debug arm64 build: **passes**, unsigned, with the SVG fixes and glog module-map correction. This compiles the SwiftUI entry point and shared BlixtTools/LND/Speedloader sources and links the app. Debug skips JS bundling; this does not supersede the independent Metro failure above.
- No wallet was launched, created, unlocked, or migrated. Regtest, Release, Intel, signed/sandboxed builds, and mobile native builds have not been validated in this attempt.

## Minimal launch follow-up

At the user's request, the initial macOS build now substitutes small platform adapters instead of waiting for full library ports. These aliases apply only in `macos/metro.config.js`; mobile keeps its existing packages.

- Screens: initially a handwritten ordinary-view adapter; now the real 4.25.0 package's ordinary-view fallback (see below). Native screen detachment/freezing remains disabled.
- Keyboard Controller: pass-through provider and React Native's basic keyboard-avoiding view.
- Tor: reports failure; the existing explicit user decision is required before continuing without Tor.
- Biometrics, iCloud backup, and document picking: reject with an unavailable-feature error. No fake authentication or backup success.
- Permissions/location: report unavailable; maps and camera show unavailable-feature text.
- Notifications and background scheduled sync: disabled. Unsupported notification and legacy-gradient toggles are hidden from macOS Settings.
- SHA-256: uses the existing `fast-sha256` dependency with UTF-8 encoding; tested against Node's SHA-256 for empty, ASCII, and Unicode inputs.
- New macOS installs default notifications, clipboard polling, screen transitions, and scheduled gossip sync to off. Existing preferences are preserved.
- macOS Debug starts normal initialization instead of the developer-command screen.

### Regtest first-launch prompt

The first launch was awaiting the old native Regtest peer prompt. The minimal macOS flow now initializes the peer to `127.0.0.1:18444`; it can be changed in Settings. A local compatible Regtest node is needed for chain sync. No public-network peer is substituted.

### Test launch arguments reaching LND

Passing `-RCT_jsLocation localhost:8088` to the app selected the alternate Metro port, but LND also parsed those process arguments and rejected the `R` flag. The first test used React Native's Settings API to persist `RCT_jsLocation`. Debug builds now also accept `BLIXT_METRO_HOST=localhost:8088` through the environment, so alternate-port launches need no process arguments. Port 8088 is used because 8081 is occupied by another project; that server was left running.

### Keychain isolation and signing

Credential names are preserved for the four original application identifiers (`com.blixtwallet`, `.debug`, `.regtest`, and `.regtest.debug`). New isolated test identifiers prefix credential names with their application identifier. The initial blanket prefix was corrected after the user asked to find the older wallet; tests cover all four legacy identifiers. No credentials were migrated or overwritten in the original installations.

A locally signed test copy without the app/keychain entitlements reached Welcome and started native LND, but its keychain write returned a missing-entitlement error. Merely adding restricted entitlements without provisioning caused macOS to reject launch. Xcode automatic development signing subsequently supplied a valid wildcard Mac profile and the isolated app/keychain entitlements. The signed app passed keychain write/read/delete and wallet creation/restart tests. No signing identities or profiles were committed.

### Follow-up validation

- Full macOS JavaScript bundle: passes.
- `node --test tests/macos-shims.test.cjs tests/macos-toolchain.test.cjs`: five tests pass, covering desktop/mobile toolchain selection, SHA-256, unavailable-service behavior, and macOS credential names with unchanged mobile names.
- Isolated sandboxed Regtest app (`com.blixtwallet.macosrevival.regtest.debug`): reached Welcome with Create Wallet and Restore Wallet; SQLite setup and native LND startup completed, with LND waiting for wallet creation.
- Development-signed native build: passes. Used the existing Debug build configuration with `CHAIN=regtest`, `PRODUCT_BUNDLE_IDENTIFIER=com.blixtwallet.macosrevival.regtest.debug`, `CODE_SIGN_STYLE=Automatic`, and `-allowProvisioningUpdates`; no production app container was used.
- Pressed the rendered Create Wallet action through the React Native debugger: real seed generation, native keychain storage, wallet creation, LND RPC activation, and Overview rendering passed. Seed/password contents were not returned in diagnostic output.
- Native LND `getInfo` reported Bitcoin Regtest; chain sync was false without a local peer. No payments or channel operations were attempted.
- After an orderly LND stop and app restart: keychain-backed automatic unlock succeeded; `appReady`, `walletCreated`, `lightning.ready`, and `security.seedAvailable` were true, and navigation returned to Overview.
- A dedicated SQLite test row survived restart; the test table was then dropped. SHA-256 was also exercised inside Hermes.
- Settings, Receive, and Send navigation were checked through the rendered React tree. Receive displayed the expected no-channel state; Send displayed the camera-unavailable message and a Back control.
- Tests use real native LND, SQLite, Async Storage, and keychain modules. Host screenshot/accessibility permissions were unavailable, so these are debugger-driven interaction checks rather than pointer/pixel verification.
- Host screenshot/accessibility inspection was unavailable; React Native debugger inspection confirmed the rendered Welcome controls and initialized store.

### Empty Regtest fee URL

Regtest does not configure a fee server by default, but the shared config writer emitted `fee.url=null`, causing LND fee-estimator requests to the literal URL `null`. The writer now omits that option when no URL is configured. The restart test no longer reports that fee URL error.

### Mainnet launch check

At the user's request, a separately signed mainnet copy was launched at `/tmp/Blixt-macOS-mainnet.app`, using identifier `com.blixtwallet.macosrevival.mainnet.debug` and Metro on port 8088. Native LND reported `network=mainnet`; the initialized app displayed Welcome, Create Wallet, and Restore Wallet. No mainnet wallet was created or imported, and no funds or transactions were involved. The existing mainnet and Regtest containers were left intact.

### Existing wallet discovery

The fresh mainnet test copy showed onboarding because it used a new app identifier. Read-only file metadata checks found mainnet `wallet.db` and `channel.db` under both `~/Library/Containers/com.blixtwallet/Data/Library/Application Support/lnd/` and the equivalent `com.blixtwallet.debug` container. These files were not opened with the new LND or migrated; their presence does not establish wallet integrity. The original credential names are now preserved as noted above. The user confirmed both installations contain existing wallets; the original debug identity is the selected restoration target.

### Existing-container backup before startup

Terminal metadata checks can see the original database files, but macOS privacy controls prevent reading/copying their contents from the terminal. An opt-in `BLIXT_BACKUP_BEFORE_START=1` hook (initially Debug-only, now also available in Release) lets the correctly signed owner app copy its own Application Support, Documents, Library/LocalDatabase, and Library/Preferences before creating React Native or starting LND. Copies are stored in `Library/BlixtRestorationBackups/<UUID>` inside that app's container, with a `COMPLETE.txt` marker written only after all copies succeed. A copy error aborts startup. This is a file backup; system keychain items remain in place.

The original debug launch uses `BLIXT_METRO_HOST=localhost:8088`, `CHAIN=mainnet`, and `com.blixtwallet.debug`, with Xcode development signing and provisioning. The signed Debug build and original-container launch passed.

### Original debug mainnet wallet reopened

- The owner app completed its pre-start file backup at `~/Library/Containers/com.blixtwallet.debug/Data/Library/BlixtRestorationBackups/5A07E42A-7B3F-4796-9B88-786B4F8FB416` before initializing React Native/LND.
- Existing app state was recognized (`walletCreated=true`), and the original keychain credentials unlocked the existing mainnet wallet. LND emitted `LOCKED`, `UNLOCKED`, then `RPC_ACTIVE`. App readiness, Lightning readiness, login, and seed availability were all true; navigation reached Overview. No wallet was created or imported.
- `getInfo` confirmed Bitcoin mainnet and block height 954000, with chain/graph sync still false. Startup logs showed the chain backend catching up from height 952248 toward peer height 970874. The app was left running to synchronize.
- Existing scheduled gossip preferences attempted Speedloader, which failed with `only gossip v1 is supported for kvdb graph store`. The existing error handler allowed normal LND startup to continue; defaults disable scheduled gossip for new macOS installations only. Follow-up source inspection found that Turbo LND 0.0.22 [pins LND `ae185f27`](https://github.com/hsjoberg/react-native-turbo-lnd/blob/v0.0.22/lnd-source.properties). That revision already uses `NewVersionedGraph(..., GossipVersion1)`, but still constructs plain `models.Node` values for neighboring nodes. The cgo branch's [Create V1 shell nodes in speedloader](https://github.com/hsjoberg/lnd/commit/3a70753a4d5f80ef08a58e77922a8d08a884bf42) replaces those with `models.NewV1ShellNode`. Turbo LND 0.0.23 has since been published and [pins that fix](https://github.com/hsjoberg/react-native-turbo-lnd/blob/v0.0.23/lnd-source.properties). Blixt adopted 0.0.23 on 2026-10-16 (see the current upgrade record below). The user subsequently supplied a successful macOS Speedloader run (see upgrade record below); the earlier failure was an LND dependency issue, not established as macOS-specific.
- Biometrics availability reported the expected unsupported-feature error; this wallet nevertheless completed normal login. A stored payment-tracking subscription returned `payment isn't initiated`; the app still reached Overview and RPC readiness. These are recorded as remaining issues, not successful feature validation.
- LND reported applying two optional database migrations after the backup. The release wallet container was not opened.

### Sidebar navigation stayed visually on Overview

The user reported that sidebar clicks did not visibly change the screen until Help was opened. The navigation state did change: debugger inspection found OnChain and Contacts mounted while their root stack cards remained at progress 0 and horizontal offset 1280 (the window width). Help used an explicit no-animation interpolator. Earlier route-state checks had not established that the destinations were visually onscreen.

The original wallet retained its screen-transition preference, and the root navigator overrode the shared options with native-driven iOS slide transitions. Disabling transitions only in new-install defaults did not cover this wallet. The shared stack options and root navigator now force `animation: "none"` on macOS, with no-animation interpolation for the root sidebar destinations and the shared fallback. Saved preferences and mobile behavior remain unchanged. This bypasses the observed stalled animation; native-driven macOS stack animation support still needs investigation before re-enabling transitions.

The temporary Screens adapter also discarded `activityState` and rendered a plain View. It now follows Screens' non-native fallback by using Animated.View and hiding inactive (`activityState === 0`) routes without unmounting their state. This is a separate compatibility correction; the measured offscreen slide was the immediate sidebar failure.

Validation: after Fast Refresh, the same stack cards reported progress 1 and horizontal offset 0. The user confirmed sidebar destinations now display immediately without opening Help. Regression tests cover enabled legacy preferences on macOS, unchanged iOS/Android option selection, and inactive-screen visibility with animated styles. Metro was restarted on port 8088 after the T3 restart; no native rebuild was needed.

### Replacing the handwritten Screens adapter with upstream components

At the user's request, `src/platform/macos/screens.js` was removed. The root manifest now includes `@blixt/macos-screens: npm:react-native-screens@4.25.0`; macOS Metro redirects `react-native-screens` and its subpath imports to that package. Mobile continues resolving its original root Screens package (4.27.0 in the current lockfile), with RN 0.85.2 unchanged. No separate package or install tree was added.

The desktop alias uses the full upstream entry point and unmodified upstream Screen/ScreenContainer implementations. Their native-platform check excludes macOS, so they render their built-in ordinary-view fallback. `enableScreens(false)` is not needed to change that default. The alias is explicitly excluded from iOS, Android, and macOS native autolinking, preventing a duplicate mobile pod/module or unsupported desktop pod.

`patches/react-native-screens@4.25.0.patch` changes exactly two exports: experimental TabsHost and TabsScreen point to their existing upstream `.web` implementations, which are plain React Native Views with no DOM code. The generic package entry eagerly imports these components even though Blixt uses JS tabs. The patch applies only to the 4.25.0 desktop alias; it does not add native tabs or native-stack support. A full native Screens port is still absent.

Bun's initially generated patch adding two `.macos.tsx` files failed to apply with `EACCES: Permission denied (mkdir())`, including with a fresh cache. Modifying the two existing export files instead produced a reproducibly installable patch.

Validation: the full production macOS bundle passes; frozen-lockfile installation passes; seven focused navigation/adapter/toolchain checks pass. Runtime inspection confirmed the loaded entry is `node_modules/@blixt/macos-screens/src/index.tsx`, actual upstream Screen and ScreenContainer components are mounted, native screens are disabled, and the deleted adapter is not loaded. The existing mainnet wallet unlocked and reached Overview. Pressing the rendered Contacts sidebar action opened ContactList with stack progress 1 and horizontal offset 0. Back returned to Overview; pressing Overview's actual Help icon opened Help with the same completed card position, then Back returned to Overview. These checks use the React debugger, not pixel inspection; visual confirmation of this package replacement is still pending. Desktop CLI config also confirms both Screens packages are excluded from Apple desktop autolinking. Stack animations remain disabled pending separate investigation.

### Independent check of the real Screens fallback

At the user's request, exercised the running app without requiring the user at the computer. Host permission checks still returned false for both screen capture and accessibility. No pixel-level or OS mouse-click verification was possible.

Instead, invoked the actual rendered sidebar/button/icon callbacks and measured Fabric host views through their public native `measureInWindow` API:

- Contacts and On-chain sidebar actions opened ContactList and OnChainInfo. Both destination card content views measured 1280 × 688 at window coordinates (0, 32), with stack progress 1 and horizontal gesture offset 0. The sampled wrappers had no zero opacity or hidden display. This rules out the previously measured offscreen slide for these flows, but is not a compositor screenshot.
- Each actual header Back control returned to Overview.
- Overview's actual Help icon opened Help. Its modal content measured 800 × 255 at (242, 248.5), within the 1280 × 720 window. The actual cross/close control returned to Overview.
- Reconfirmed the real upstream Screen/ScreenContainer components were mounted and the deleted adapter was absent. The wallet stayed ready, and the app was left on Overview.

No new navigation issue was found in these checks. Pixel appearance, pointer hit testing, and broader route coverage remain unverified.

### Migrating from root aliases to the generated desktop package

Before changing dependency layout, committed the working root-alias solution as `3c364219`. The snapshot includes the restoration, adapters, upstream Screens fallback patch, and navigation workaround; unrelated local files were left outside the commit.

The new generated package satisfies the fork's exact RN 0.83.10 peer without changing mobile RN 0.85.2. Root macOS aliases and the root macOS runtime dependency were removed. Desktop has its own lockfile and native/JavaScript dependency tree; shared-source imports and all Babel plugins resolve into that tree. No wallet/application identifier changed.

Integration fixes found during the move:

- Requiring the fork's `cli.js` does not execute it as a command; the desktop launcher explicitly invokes its exported `run` method after changing to the package directory and checking synchronization.
- CLI project configuration rejects null `project.ios`/`project.android` entries. The desktop config specifies its macOS project, with `sourceDir: "."` relative to the desktop package.
- Metro retains the repository as its source root, so bundle entry remains `index.js`; `../index.js` incorrectly selected the repository's parent. Xcode invokes its bundle tooling with the desktop package as working directory and the explicit Metro configuration pointing at shared source.
- Pod/codegen app paths, native header paths, and Xcode React Native script paths all moved to the desktop install. Screens remains excluded from native linking.

Validation so far: generator drift/propagation checks and nine focused tests pass; root and desktop frozen installs pass; desktop CLI config selects the local dependency tree; CocoaPods installs 94 pods; the production bundle succeeds. A production source map contained 3,482 sources, with zero mobile-tree sources and a single React entry from `macos/node_modules`. Final validation:

- Fresh development-signed macOS Debug mainnet build passed from `/tmp/blixt-macos-generated-derived`; the final Xcode script-path update also passed an incremental build. The native build log contained no references into the mobile install tree.
- Xcode's Release bundling script produced Hermes bytecode successfully using the desktop CLI/configuration. This tests release bundling, not a full Release native build.
- iOS production JavaScript bundling passed on the unchanged RN 0.85.2 dependency declarations. Its source map had 3,809 sources and zero desktop-tree sources; React came from the root tree. Both Metro configurations exclude the other platform's installed modules. Mobile native builds were not rerun.
- Restarted desktop Metro on port 8088 and launched the rebuilt app under the existing `com.blixtwallet.debug` mainnet identity. The existing wallet reached LOCKED, UNLOCKED, and RPC_ACTIVE; app/Lightning readiness, login, wallet-created state, and seed availability were true.
- Runtime inspection confirmed real Screens components loaded from `macos/node_modules/react-native-screens/src/index.tsx`. Contacts opened through the sidebar with native content frame 1280 × 688 at (0, 32), transition progress 1, and horizontal offset 0. Actual Back, Help, and close controls worked; the app was left on Overview. These remain debugger/native-geometry checks, not pixel inspection.
- The original snapshot stays committed at `3c364219`; migration changes are separate working-tree changes for review.

### Permanent drawer separator

The user reported a thin white vertical line between the sidebar and Overview. React Navigation's permanent drawer supplies `borderRightWidth: StyleSheet.hairlineWidth`; the existing color overrides in `DrawerComponent` left that border enabled. Runtime inspection confirmed a 0.5-point border. Set both physical side border widths to zero on macOS in `src/windows/Overview.tsx`, covering either drawer position without changing mobile styling. Fast Refresh compiled the change and runtime inspection confirmed both widths were zero. Visual disappearance still needs user confirmation; screen capture access remains unavailable. No navigation dependency patch was needed.

### First production-identity Release launch

Built the Mainnet scheme with configuration Release in `/tmp/blixt-macos-generated-derived`. The full native build and strict code-signature verification passed; the bundle identifies as `com.blixtwallet` with `CHAIN=mainnet` and uses embedded JavaScript, without Metro.

Extended the existing opt-in `BLIXT_BACKUP_BEFORE_START=1` hook to Release, preserving its fail-before-runtime behavior. Used it for the first launch of the existing production wallet. The app confirmed a completed backup in its own container at `Library/BlixtRestorationBackups/615400D1-4372-43B4-935B-626F3FD228FB` before starting React/LND. Keychain remains in the system keychain. Startup opened the existing LND database, began migrations, and progressed into Bitcoin header/filter synchronization. Full chain synchronization was not a prerequisite for handing the running app back to the user.

The Release configuration built both arm64 and x86_64 even with an arm64 destination, making this first build slow. The installed turbo-lnd macOS XCFramework and `lipo -info` both confirm those two architectures. The user subsequently confirmed that Blixt should retain both architectures after verifying turbo-lnd supports them. Keep the universal Release configuration; no arm64-only restriction was applied.


### Restoring native-driven navigation transitions

Re-enabled transitions experimentally and reproduced the original failure with real Screens: Contacts stayed at stack progress 0 and horizontal gesture offset 1280. An independent 350ms Animated timing probe also remained at value 0 with no native listener updates or completion, while the JavaScript-driven control completed.

RN macOS 0.83.0's `Libraries/Animated/shouldUseTurboAnimatedModule.js` only selected the bridgeless Turbo Animated module for `Platform.OS === "ios"`. The running macOS app was bridgeless/Fabric and exposed `NativeAnimatedTurboModule`, but this check selected the older Animated module instead. The older path can leave queued operations waiting for mounting work; the Turbo implementation explicitly flushes animation starts. Including macOS in that platform check made the standalone native probe advance and finish and resolved the navigation stall.

Persisted the fix as `patches/react-native-macos@0.83.0.patch`, registered only in `macos/dependency-overrides.json` and the generated desktop package/lockfile. This changes JavaScript module selection, not native implementation, and retains the existing C++-driver and bridgeless guards. No React Navigation patch, custom adapter, or JS-driver override is needed. Mobile's RN package is untouched.

Removed the forced macOS no-animation options from the shared stack hook and root horizontal transitions. The existing screen-transitions preference now works on macOS. Desktop nested fades use upstream `forFadeFromCenter` with its normalized progress range instead of the old custom index-dependent fade. Desktop swipe-back gestures remain disabled; intentionally unanimated routes such as Help and Overview retain their existing behavior.

Validation: desktop frozen installation passed with the patch installed; ten focused tests passed, including platform/bridgeless/C++ animation-module selection and transition preference behavior. After a clean Debug app restart, native timing animations completed, Contacts and On-chain transitions reached progress 1 / offset 0, and Contacts measured at (0, 32), size 1280 × 688. Back and Help controls worked. Disabling the preference in memory produced unanimated cards; restoring it produced animated cards that completed normally. The stored preference was not changed. These are debugger/native-geometry checks; visual smoothness and pointer interactions still need user confirmation. The already-running Release app uses its previous embedded bundle and does not receive these edits via Metro.

Upstream submission details are tracked in [UPSTREAM_FIXES.md](../UPSTREAM_FIXES.md#react-native-macos-animated).

### Consolidated compatibility shims

Web and macOS dependency replacements now live in `src/shims/`, named after the libraries they replace. Both Vite and desktop Metro select the same implementations for Keyboard Controller, NitroTor, document picking, iCloud, permissions, notifications, and maps. SHA-256, biometrics, geolocation, and the unavailable-operation helper also live at the shared root. There is no macOS-specific shim directory; web-only React Native internals and browser implementations remain under `web/`. Electrobun’s native bridge shims remain with its implementation.

Consolidation intentionally removes simulated web success: permissions report unavailable, notification authorization reports denied, file picking/copying rejects, and iCloud reads/writes/deletes reject instead of using an in-memory Map. Notification delivery remains a no-op with an unavailable message. Both platforms use a map-unavailable placeholder instead of the web decorative map. Shared files preserve the export sets used by both platforms, including the document-picker cancellation helpers and default exports. Tor continues to report failure.

The web native-tools implementation reports iCloud disabled and backup settings default to off. Automatic backup and restore callers handle errors; no startup dependency on the old simulated storage was found during source inspection. Existing tests now cover unavailable bulk permissions, notification authorization, file copying, and all iCloud operations as well as the original desktop checks. Actual native support remains follow-up work; this cleanup does not enable these features.

Validation: five focused shim/toolchain tests pass with the expanded unavailable-operation assertions. Production bundles pass for web, web demo, Electrobun, and macOS. No native app was rebuilt or launched for this consolidation.

### Reuse the existing native backup file dialogs

The older `BlixtTools.macosOpenFileDialog` implementation remains available through the native bridge. It uses `NSOpenPanel` and reads the selected file as base64 inside native code; cancellation resolves `null`. Welcome recovery already used this path, but Settings → Verify backup and Power User Tools → Restore channel backup still called the unavailable document-picker shim.

Both remaining flows now use the existing native method on macOS. Verification/restore receives the decoded binary bytes directly, without treating the native base64 result as a file URI or reading it again. Welcome, verification, and Power User Tools all return on cancellation, preserving prior selection and avoiding RPC calls or error messages. Welcome no longer logs the selected backup contents. Mobile picker and encoding paths are preserved.

Thirteen callback tests pass, covering cancellation, binary payload delivery, read errors, and the existing iOS/Android paths. These tests mock the native and LND boundaries; no restore request was sent to a real wallet. The native implementation and existing `NSSavePanel` export paths were not changed. Interactive sandboxed open/save verification remains manual: this environment reports Accessibility automation unavailable.

The full macOS and web production JavaScript bundles also pass after the backup-flow changes. The installed Release application needs rebuilding to receive these JavaScript changes; native dialog/export code is unchanged.

### Match the native title bar to the dark wallet theme

The native title bar appeared white above Blixt's dark interface, with macOS dark mode enabled (confirmed in System Settings and by the global AppleInterfaceStyle preference). The window had no explicit appearance preference; the reason it did not follow the system appearance has not been established. The window content now declares `.preferredColorScheme(.dark)`, letting SwiftUI apply the dark appearance to the containing window and its native title bar. This matches the app's existing fixed dark theme while retaining standard macOS window controls. This native change requires rebuilding and restarting the app; Metro reload alone cannot apply it.

Validation: the signed arm64 Mainnet Debug native build passed, including compilation of `AppDelegate.swift`. The app was not relaunched for this check, so the resulting title-bar appearance still needs visual confirmation.

The user still saw the white bar after rebuilding with the dark preference. Investigation found `RCTSurfaceHostingView` initializes its background to solid white, while `RCTRootViewFactory` only replaces it with a system background on non-macOS platforms. `ReactNativeView.makeNSView` now sets the returned `RCTUIView` background to `NSColor.windowBackgroundColor`, alongside the dark window preference. This removes a fixed white native background that can remain visible around the JavaScript content. Visual confirmation of the title bar remains necessary.

### Keep all Settings rows mounted on macOS

Settings could show a blank area after “Automatically open channels” even though more settings exist in its data. The screen used a `FlatList` with `initialNumToRender={21}` and native clipping enabled. The exact failure within virtualization/clipping has not yet been isolated.

For the bounded Settings menu, macOS now uses a flex-sized `ScrollView` and renders every filtered row with the existing row renderer. Search, section headers, the wallet header, and row actions are preserved. Other platforms retain the existing `FlatList`. This is a screen-level workaround; it does not change transaction-list virtualization or establish an upstream React Native fix.

Validation: the macOS production bundle completes and all 13 backup callback tests pass. The compiler reports an optimization bailout for the existing Settings memoization dependencies; bundling succeeds. Interactive scrolling/search confirmation in the running app remains pending.

Power User Tools exhibited the same cutoff and used the same clipped `FlatList` configuration. It now uses the same macOS-only `ScrollView` approach, mounting all filtered tools through the existing row renderer. Search, section headings, checkbox state, and action handlers are preserved; other platforms keep their existing list. No tool actions were invoked during validation.

Validation: the macOS production bundle passes after the Power User Tools change. Visual scrolling confirmation remains pending; a Debug Metro reload is sufficient to receive this JavaScript-only change.

### Handle both native picker cancellation values

Cancelling the macOS picker could raise `Cannot read property 'length' of undefined`: Swift resolves cancellation with `nil`, which can reach JavaScript as `undefined`, while the three backup callers only guarded against `null`. Welcome recovery, Settings verification, and Power User Tools restore now use a nullish check before decoding or updating state. This works with the existing native binary; no native rebuild is required for Debug users.

Regression tests now cover both `null` and `undefined` cancellation in all three callbacks. The added undefined cases failed before the fix. All 16 callback tests pass afterward, including successful binary selection, read failures, and the existing mobile paths. Tests use mocked RPCs and do not restore a real wallet.

### Adopt Turbo LND 0.0.23

Updated the root manifest and generated desktop package from 0.0.22 to 0.0.23, along with both Bun lockfiles. The published [source pin](https://github.com/smolcars/react-native-turbo-lnd/blob/v0.0.23/lnd-source.properties) is `hsjoberg/lnd@3a70753a4d5f80ef08a58e77922a8d08a884bf42`, the V1 shell-node Speedloader fix. Downloaded the release's iOS, Android, and macOS native artifacts using the package fetcher, including its SHA-256 checks. The macOS XCFramework advertises arm64 and x86_64.

The macOS production bundle and 23 focused manifest/toolchain/shim/backup tests pass. A simultaneous iOS pod update initially failed when its repository-wide codegen scan encountered headers being regenerated by macOS CocoaPods; rerunning the pod updates sequentially avoids that race. The user subsequently supplied macOS runtime logs showing successful graph download, checksum verification, database opening, merge, and commit: total GossipSync time 2.268562917s. This confirms the previously failing operation now completes with 0.0.23; it was not reported as a disposable-database test.

Both macOS and iOS CocoaPods updates completed successfully, with their lockfiles recording Turbo LND 0.0.23. The iOS privacy-manifest regeneration changed ordering only and was restored after semantic comparison.

The signed arm64 Mainnet Debug native build with Turbo LND 0.0.23 also passed. No wallet was launched or migrated as part of this dependency update. x86_64 artifact presence was checked, but this update did not repeat an Intel native build or runtime test.

### Avoid resizing Overview's gradient during scroll

The user confirmed removing the half-point top margin did not fix the brief black flashes; the gradient is correct while stationary. Overview animates the header height on every scroll event, and its percentage-height gradient previously resized along with it. The Fabric view implementation clears and recreates background-image layers when updating the layer decoration. This is a plausible redraw trigger, not a reproduced upstream root cause.

On macOS the gradient now keeps `HEADER_MAX_HEIGHT`, anchored to the top-left, while the animated parent clips it as it collapses. The gradient itself no longer resizes on every scroll frame. Balance/control animation remains unchanged. The collapsed header shows the upper portion of the gradient rather than compressing the entire gradient into the shorter header; other platforms retain the percentage-height gradient. Runtime confirmation of the transient flashing fix remains pending.

### Share the transformed gradient across platforms

The user confirmed fixed-size clipping removed the flashes, but it cropped away most of the gradient in the collapsed header. Setting the height prop to undefined (which fell back to `100%`) then left the gradient missing on macOS. The exact reason for that percentage-height behavior has not been isolated.

Overview now uses the same gradient layout on every platform: a fixed `HEADER_MAX_HEIGHT` wrapper whose vertical scale follows the animated header height. A vertical translation of `(headerHeight - HEADER_MAX_HEIGHT) / 2` compensates for center-origin scaling, keeping the upper edge fixed. This compresses the complete gradient into the visible header instead of cropping it. The gradient view fills its wrapper using top/right/bottom/left anchors, with no percentage height or height prop. The macOS-only clipping branch is removed. Only the gradient is transformed; text/buttons retain their existing animations. Visual validation of this shared implementation remains pending on macOS and mobile.

The user subsequently confirmed the shared transformed-gradient implementation fixes both gradient appearance and scrolling flicker.

### Optional persistent menu-bar presence

Persistent Mode controls the macOS menu bar through `persistentServicesEnabled`. Main applies the loaded value and subsequent changes through `BlixtTools.setPersistentModeEnabled`; native code holds only runtime state, with no separate UserDefaults preference. The menu icon appears after the JS settings load.

When enabled, a lightning-bolt status item offers Open Blixt and Quit Blixt. Window close hides the same native window, preserving the React surface and embedded LND process; Open or Dock reopen brings it back. Disabling the feature brings a hidden window forward before removing the status item. The existing SwiftUI window delegate receives other delegate methods, including the close decision when the feature is disabled. Quit invokes the normal NSApplication termination path, as does Command-Q; this does not introduce a separate daemon, login item, or new graceful-LND-shutdown mechanism. Menu balance, sync status, and send/receive actions are deferred.

An isolated AppKit smoke test exercises the actual controller with no wallet data: default off, native setting notification, hiding/reopening, disabling while hidden, and delegation of the original close decision. It creates no React runtime and touches no wallet. Run with `node --test tests/macos-menu-bar.test.cjs` on macOS in a graphical session. Interactive integration validation in the wallet remains pending.

The settings thunk persists `StorageItem.persistentServicesEnabled` before committing state, and storage errors leave state unchanged. The native controller does not read or write UserDefaults.

The corrected implementation's signed arm64 Mainnet Debug native build passed. The wallet itself was not relaunched during verification; interactive menu selection and full wallet close/reopen remain user checks. A native rebuild/restart is required to add the new method and menu controller; subsequent setting changes apply immediately.

Menu-bar implementation is now in `macos/BlixtWallet/BlixtMenuBarController.swift`, including its window-host helper, and is registered in the Xcode Sources build phase. AppDelegate retains only the lifecycle integration. The native smoke test compiles the new source file directly alongside its test entry point instead of extracting code from AppDelegate. This is a file-organization change with no behavior changes.


### Platform-neutral tray API and SwiftUI background lifetime

The shared native API is `setPersistentModeEnabled`. The macOS implementation owns the native menu-bar UI; Windows and Electrobun tray implementations remain future work. There are no legacy preference keys or fallback reads.

The user reported the process exited on window close despite the menu-bar option. A standalone SwiftUI reproducer confirmed that the original `Window` scene exits even when its window delegate hides the window and cancels closing. The original AppKit-only smoke test did not exercise this scene behavior. Using `WindowGroup` instead keeps the process alive and lets the same window reopen. Blixt now uses that scene, removes the New Window command, and terminates after the last actual window closes only when tray mode is disabled. Explicit Quit remains an exit action regardless of the setting. A SwiftUI smoke test now covers hiding/reopening followed by disabled-mode close and explicit Quit.

The SwiftUI lifecycle regression test covers disabled-mode window close and explicit Quit after a successful hide/reopen. The AppKit controller and settings tests cover native menu behavior and persistence. No existing wallet is launched during these isolated tests.

The signed arm64 Mainnet Debug native build also passed with the renamed API and WindowGroup lifecycle fix. The full wallet was not relaunched as part of this validation; the new SwiftUI regression test establishes process survival and reopening independently of React/LND. Windows/Linux tray support is not implemented by this change.

### Restore the developer startup screen

Removed the initial-revival macOS exception from App's developer-screen gate (`__DEV__ && PLATFORM !== "macos"`). All platforms now use `__DEV__`: development bundles show DEV_Commands first, and Continue enters Main. Release bundles still go straight to Main. This gate is based on Metro's development flag, not the native build's Debug value. TSX parsing and inspection of the startup initializer pass. Reload the development app to reset this startup state; a native rebuild is unnecessary.

## Native macOS local notifications — 2026-10-17

The shared Notifee shim now routes macOS `getNotificationSettings`, `requestPermission`, and `displayNotification` to the macOS-only `BlixtNotifications` module. Swift uses UserNotifications directly; no remote-push registration or APNs server is involved. The module implements the subset used by Blixt: authorization status, alert/badge/sound permission options, notification title/body/ID, and default or disabled sound. It is not a complete Notifee implementation. Web keeps its unavailable fallback; mobile continues using real Notifee.

Settings exposes the existing notification toggle. Enabling it requests permission and only persists enabled after authorized/provisional status; denial directs the user to macOS System Settings. Startup checks authorization without prompting. The existing app-storage preference remains authoritative and new macOS installations still default off. An older enabled preference with OS permission denied will need permission enabled in System Settings (or toggling off/on to request if not yet determined).

Existing payment/channel notification events now deliver native notifications when the preference is enabled, including while the window is hidden in menu-bar mode. Delivery errors are caught and logged. Notifications can display while the app is foregrounded; clicking opens the wallet and restores its Dock presence. Fully quitting still stops LND/event monitoring. OS notification settings and Focus may suppress banners/sounds.

Blixt handles notification permissions in its native module. The deferred RNPermissions port is tracked in [UPSTREAM_FIXES.md](../UPSTREAM_FIXES.md#react-native-permissions).

Validation: focused JavaScript tests cover permission states, explicit permission requests, delivery payloads and errors, missing native modules, unchanged web behavior, and event routing respecting the stored preference. All 14 focused notification/shim/menu-bar tests pass, the macOS production JavaScript bundle passes, and the signed arm64 Mainnet Debug native build passes. The user subsequently confirmed macOS notifications work. No running wallet was restarted during the automated validation.

## react-native-hash macOS podspec workaround

The macOS Podfile temporarily adds `:osx => "14.0"` to react-native-hash 3.0.3's iOS-only podspec before autolinking. The workaround is idempotent and reapplied after dependency installs. The native exclusion and Metro SHA-256 shim are removed; Blixt now uses the package's real JavaScript JSHash implementation. The Apple native module itself remains placeholder code, not a native hashing backend.

The upstream podspec task is tracked in [UPSTREAM_FIXES.md](../UPSTREAM_FIXES.md#react-native-hash). JSHash SHA-256 passes empty, ASCII, Unicode, and multi-block vectors in Hermes against Node crypto; the full macOS bundle and signed arm64 Mainnet Debug build also pass.

## Persistent Mode

Persistent Mode now controls macOS menu-bar behavior through the existing `persistentServicesEnabled` setting. The separate Power User Tools tray toggle has been removed. On macOS, enabling Persistent Mode keeps the node running when the window closes, and Quit Blixt exits the app. Changes apply immediately. Android retains its existing foreground service and restart prompt.

Persistent Mode uses only `persistentServicesEnabled`, defaulting to false when absent. The unreleased tray preferences have no migration, fallback, or reset compatibility code.

Validation: macOS/Tor regression tests cover preference loading, persistence failures, and platform-specific restart behavior.


## Embedded Send camera

The Send screen uses a focused macOS camera package in `macos/camera`, autolinked only by the desktop dependency install. Its `NativeBlixtCamera` TurboModule provides camera permission and device discovery. A Fabric component embeds an AppKit/AVFoundation preview beneath the React scanning frame and controls. The shared Speedloader TurboModule and mobile camera implementations are unchanged.

The native preview processes QR codes with Apple Vision, limits decoding to five frames per second, and emits one decoded value per active scan. Frames stay native. The Send screen passes decoded text through the existing invoice/LNURL evaluation and confirmation flow; scanning itself never sends a payment. Paste and Lightning-address entry remain available without camera access. Invalid results pause scanning until Scan again is selected, avoiding repeated error dialogs for the same QR code.

Capture runs on a serial background queue and stops when the view is inactive, detached, hidden, the window is minimized/occluded, or the app resigns active. Generation checks discard stale queued starts/results. Permission denial, missing/disconnected cameras, and capture failures provide a retry path. Camera selection supports the devices AVFoundation discovers, including external and Continuity cameras. Physical-device behavior still needs hardware testing.

The macOS target now includes the camera sandbox entitlement, a camera usage description, and the Continuity Camera opt-in. The native package implements only the preview and QR capabilities needed by Send. No VisionCamera or Nitro view port is included.

Validation: all 56 macOS/Tor regression tests pass, including native Vision decoding of generated invoice/LNURL/address QR frames, duplicate suppression, stale-result cancellation, and Send permission/navigation/retry tests. Codegen, the production macOS bundle, and the signed arm64 Mainnet Debug build pass. An isolated React runtime mounted the Fabric preview at 640×480 and discovered the FaceTime HD Camera through the TurboModule, with capture disabled and no wallet code loaded. Live camera capture, permission prompts, physical QR codes, and external/Continuity cameras still require interactive hardware validation. The repository-wide TypeScript check retains existing errors; no errors were reported in the new camera files.


## Shared camera screen

The user confirmed live macOS Send scanning works. The duplicated `SendCamera.macos.tsx` and `SendCamera.web.tsx` screens have now been removed. A single `SendCamera.tsx` owns the overlay, invoice/LNURL routing, paste/address entry, duplicate-scan protection, focus handling, and Scan again behavior across mobile, macOS, and web. Platform-specific `Camera` components implement a shared props/ref contract for preview, permissions, and camera switching. The existing fullscreen scanner also uses these adapters; its macOS hardware flow has not been separately verified.

The macOS camera keeps its native capture implementation. Mobile keeps VisionCamera and awaits the permission result correctly. Web keeps ZXing, uses current callbacks without restarting capture on every screen render, and stops camera streams whose initialization finishes after cleanup. Each web capture uses its own video element so stale cleanup cannot detach a newer preview. Camera errors leave the shared Send controls available.

Validation: shared Send and camera-adapter regressions pass, including duplicate scans, all LNURL routes, permission cancellation, camera switching, and late browser-stream cleanup. Production JavaScript bundles pass for macOS, web, iOS, and Android; mobile bundles do not include the macOS camera module. No native source or generated interface changed in this refactor. The whole-repository TypeScript check still reports existing errors, including missing browser DOM types in its mobile configuration.
