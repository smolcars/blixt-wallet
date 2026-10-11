# macOS target restoration

The target uses the React Native macOS 0.83.0 template and now runs a minimal wallet with temporary desktop adapters. A development-signed, sandboxed Regtest build reached Overview, created a real wallet, and unlocked it after restart. Dependency installation, autolinking, code generation, and JavaScript bundling pass. The original debug mainnet wallet has also been backed up, reopened, and unlocked; the user confirmed it works. This is an initial runnable target, not validation of every feature or migration path. Later issue-log entries supersede the historical initial-build results below.

## One root package

All JavaScript dependencies are declared in the root `package.json` and locked by the root `bun.lock`. There is no separate macOS package or install tree. Mobile keeps React Native 0.85.2; `react-native-macos` 0.83.0 is installed alongside it.

- The macOS fork is based on RN 0.83.10 and brings its own 0.83.10 codegen and CLI plugin.
- The root dev dependencies include npm aliases `@blixt/macos-babel-preset` and `@blixt/macos-metro-config` for the 0.83.10 tooling. Mobile keeps the 0.85.2 tooling.
- `@blixt/macos-screens` aliases `react-native-screens@4.25.0` for desktop JavaScript only. Mobile retains the root Screens version. A two-import patch selects upstream plain-view experimental-tab fallbacks; native Screens remains excluded from desktop autolinking.
- `babel.config.js` chooses the preset using Metro's platform caller. `macos/metro.config.js` aliases `react-native` and its subpaths to the macOS renderer.
- `macos/node-resolver.cjs`, preloaded only for desktop CLI commands and pod subprocesses, redirects Node's `react-native` lookups to the fork. Libraries such as Reanimated, Worklets, Gesture Handler, and Nitro Modules otherwise discover mobile's version/headers and compile against the wrong platform. The hook also selects the desktop exclusions in the root CLI config. It does not change files or symlinks in `node_modules`.
- Deployment target: macOS 14, matching the new template. New Architecture and Hermes are enabled by the 0.83 pod integration.

Bun reports an incorrect peer dependency because macOS declares an exact `react-native@0.83.10` peer while the root mobile package is 0.85.2. Platform-specific resolution is explicit; this arrangement does not satisfy that peer declaration and must be validated separately for each platform. The observed desktop codegen/CLI versions are 0.83.10, and native library discovery reports the 0.83 macOS fork.

Sources: [0.83.0 release](https://github.com/microsoft/react-native-macos/releases/tag/react-native-macos%400.83.0), [published macOS package](https://unpkg.com/react-native-macos@0.83.0/package.json), [template](https://github.com/microsoft/react-native-macos/tree/19f618c/packages/react-native/local-cli/generator-macos/templates/macos).

## Setup and checks

From the repository root:

```sh
bun run macos:install
bun run macos:lnd
bun run macos:pods
bun run macos:bundle
```

`macos:lnd` downloads the macOS XCFramework for the installed `react-native-turbo-lnd` version and checks its published SHA-256 digest. The old `macos/liblnd.a` is no longer linked; the LND pod owns the framework. The root postinstall fetcher defaults to mobile artifacts; `macos:lnd` prepares the additional desktop artifact.

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

## Native library audit

This audit uses the published versions declared by the root manifest and the refreshed root `node_modules`, matching `bun.lock`. The originally installed root packages were older than the manifest. A declared platform is not proof that a library compiles or works with this renderer.

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

Both `ios` and `macos` entries must be disabled in the desktop CLI config: the macOS autolinker falls back to `ios`, and the published pod integration invokes Apple codegen with `-t ios`. No such exclusions are applied to mobile. Excluding pods does not make imports or feature calls safe.

## What Screens support means for this app

`react-native-screens` does not currently advertise native macOS support: its [supported-platform list](https://github.com/software-mansion/react-native-screens#supported-platforms) omits macOS, its Apple podspec has no macOS target, and the installed `src/core.ts` enables native screens only for iOS, Android, and Windows.

Blixt uses `@react-navigation/stack` (the JavaScript stack), drawer, and JavaScript bottom tabs. It does not use `@react-navigation/native-stack`. Upstream documents [plain-view rendering with Screens disabled](https://github.com/software-mansion/react-native-screens#disabling-react-native-screens), so losing native screen containers does not by itself require replacing React Navigation. However, `enableScreens(false)` alone did not solve our package-loading problems: Metro still encountered incompatible codegen and missing platform exports. The initial handwritten adapter has now been removed. Metro selects the real Screens 4.25.0 package through the root `@blixt/macos-screens` alias. Its own Screen/ScreenContainer components choose their ordinary-view fallback on macOS. Two patched experimental-tab imports avoid missing platform entry files. This is still a patched fallback configuration, not an upstream-supported native macOS port.

The sidebar glitch was observed while this alias was active and the native Screens pod was excluded. Navigation state advanced, but stack slide progress stayed at zero. Disabling those transitions fixed the visible symptom, as confirmed by the user. The underlying animation-driver failure is not yet isolated; attributing it to missing native Screens support would be premature. The adapter's discarded activity state was a separate bug, also corrected.

Navigation reliability remains a priority. A full AppKit/Fabric Screens port would be a substantially larger project than maintaining the ordinary-view path needed by this app, and is not an established prerequisite for restoration.

## Follow-up work beyond the minimal launch

1. Validate the restored upstream Screens fallback for the existing JavaScript navigators. Native Screens support is absent, but a full native port is not required for Blixt's JS stack/drawer/tabs. The real Screens 4.25.0 desktop alias now replaces the temporary adapter; its built-in fallback handles inactive-screen visibility. Stack transitions remain disabled after reproducing an offscreen-animation stall. Validate back navigation, nested screens, modals, focus, and layout, then investigate the animation failure separately. The initial attempt used Screens 4.29.0; the current root lockfile/install is 4.27.0. Both are in the 4.26+ line requiring RN 0.84+. The initial isolated 4.25.0 trial failed resolving `./TabsHost` on macOS; the two-import patch described below now resolves that failure. These are version/import problems in addition to the missing native platform.
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

### SVG reconstructing the mobile package path

**Found:** SVG's Ruby helper called Node to resolve React Native, then discarded the resolved package name and opened `react-native/package.json` relative to its parent. In the shared root layout, this selected mobile 0.85 despite the desktop resolver. Compilation failed in `RNSVGImage.mm` because RN 0.85 uses shared-pointer image observers while the macOS fork expects references.

**Changed:** Extended the reproducible SVG patch to read the exact package JSON path returned by Node. The ordinary mobile lookup retains its original package and version.

**Checked:** Pod installation now generates `REACT_NATIVE_MINOR_VERSION=83` for SVG and the app target. The next build compiled SVG successfully and reached Swift dependencies. The root toolchain tests and frozen lockfile installation still pass.

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
- `node --test tests/macos-adapters.test.cjs tests/macos-toolchain.test.cjs`: five tests pass, covering desktop/mobile toolchain selection, SHA-256, unavailable-service behavior, and macOS credential names with unchanged mobile names.
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

Terminal metadata checks can see the original database files, but macOS privacy controls prevent reading/copying their contents from the terminal. A Debug-only `BLIXT_BACKUP_BEFORE_START=1` hook lets the correctly signed owner app copy its own Application Support, Documents, Library/LocalDatabase, and Library/Preferences before creating React Native or starting LND. Copies are stored in `Library/BlixtRestorationBackups/<UUID>` inside that app's container, with a `COMPLETE.txt` marker written only after all copies succeed. A copy error aborts startup. This is a file backup; system keychain items remain in place.

The original debug launch uses `BLIXT_METRO_HOST=localhost:8088`, `CHAIN=mainnet`, and `com.blixtwallet.debug`, with Xcode development signing and provisioning. The signed Debug build and original-container launch passed.

### Original debug mainnet wallet reopened

- The owner app completed its pre-start file backup at `~/Library/Containers/com.blixtwallet.debug/Data/Library/BlixtRestorationBackups/5A07E42A-7B3F-4796-9B88-786B4F8FB416` before initializing React Native/LND.
- Existing app state was recognized (`walletCreated=true`), and the original keychain credentials unlocked the existing mainnet wallet. LND emitted `LOCKED`, `UNLOCKED`, then `RPC_ACTIVE`. App readiness, Lightning readiness, login, and seed availability were all true; navigation reached Overview. No wallet was created or imported.
- `getInfo` confirmed Bitcoin mainnet and block height 954000, with chain/graph sync still false. Startup logs showed the chain backend catching up from height 952248 toward peer height 970874. The app was left running to synchronize.
- Existing scheduled gossip preferences attempted Speedloader, which failed with `only gossip v1 is supported for kvdb graph store`. The existing error handler allowed normal LND startup to continue. This compatibility issue remains unresolved; defaults disable scheduled gossip for new macOS installations only.
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
