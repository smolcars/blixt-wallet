# Upstream fixes

Dependency fixes found during Blixt's platform work. Status reflects the last recorded work in this checkout; PR merge/release status should be checked before removing patches.

## Tracker

| Dependency | Fix | Status | Blixt workaround / next step |
| --- | --- | --- | --- |
| React Native macOS | Select Turbo Animated on bridgeless macOS | Prepared; publishing blocked | Local patch. Resolve fork access and submit. |
| react-native-svg | Missing RCTAssert import | [PR #3069](https://github.com/software-mansion/react-native-svg/pull/3069) submitted | Keep patch until included in an adopted release. |
| react-native-svg | Read the resolved RN package path | [PR #3070](https://github.com/software-mansion/react-native-svg/pull/3070) submitted | Keep patch until included in an adopted release. |
| react-native-screens | Experimental tabs exports break macOS package loading | Local workaround; upstream approach undecided | Two-import patch uses plain-view fallbacks. |
| react-native-hash | Declare macOS in podspec | Deferred | Podfile adds osx support locally. |
| react-native-permissions | macOS notification permissions | Deferred | Custom permission handling in BlixtNotifications. |
| react-native-vector-icons | macOS native helper support | Deferred | Bundled fonts work; native helpers disabled. |
| React Native macOS | glog headers imported inside a C++ namespace | Local workaround; upstream ownership undecided | Podfile marks two headers textual. |
| React Native macOS | FlatList rendering/scrolling failure | Investigation deferred; no upstream fix yet | Settings screens use ScrollView. |

## Prepared and submitted fixes

### React Native macOS: Animated

The bridgeless module-selection helper only selected Turbo Animated on iOS. Include macOS while retaining the existing bridgeless and C++-driver guards.

- Local patch: [react-native-macos@0.83.0.patch](patches/react-native-macos@0.83.0.patch).
- Checkout: `~/Projects/Blixt/react-native-macos-animation-fix`.
- Branch: `fix/macos-bridgeless-native-animated`; commit: `3be54f4`.
- Reproducer: `~/Projects/Blixt/react-native-macos-animation-reproducer`.
- PR draft: `~/Projects/Blixt/react-native-macos-animation-pr.md`.
- Exported commit: `~/Projects/Blixt/react-native-macos-animation-fix.patch`.
- Validation: 228 Animated tests passed; standalone native animation stalled before the fix and completed afterward.
- Blocker: `hsjoberg/react-native` Git transport reports a disabled repository; the user also saw a locked-fork message. Connected-app publishing failed. No PR was created.

### react-native-svg

Both fixes are in [react-native-svg@15.15.5.patch](patches/react-native-svg@15.15.5.patch).

- **RCTAssert:** explicit header import in the macOS source. Unpatched translation unit failed; patched source compiled.
- **RN resolution:** preserve Node's resolved package JSON path instead of reconstructing a `react-native/package.json` path. Four regression tests cover normal resolution, a symlinked fork, fallback, and nightly versions.

## Deferred contributions and investigations

### react-native-hash

Add macOS to the upstream podspec. [macos/Podfile](macos/Podfile) currently adds `:osx => "14.0"` before autolinking.

The real JSHash SHA-256 implementation passes empty, ASCII, Unicode, and multi-block vectors in Hermes; bundle/native build pass. The Apple native module is placeholder code, so this does not establish native hashing support. Remove the Podfile workaround after adopting an upstream release.

### react-native-permissions

Reuse the Apple UserNotifications handler, with:

- Guards for iOS-only ephemeral authorization and CarPlay settings.
- macOS equivalents/guards for UIApplication registration and settings APIs.
- macOS podspec support and JavaScript routing.

A podspec-only change is insufficient. Blixt currently handles notification permission in [BlixtNotifications.swift](macos/BlixtWallet/BlixtNotifications.swift); its general permissions shim remains unavailable.

### react-native-vector-icons

Check the current upstream implementation before preparing a port. Installed 9.2.0 declares only iOS/tvOS and uses UIKit glyph-image APIs.

Add macOS podspec support and AppKit drawing equivalents/guards as needed. Validate `getImageSource()`, `getImageSourceSync()`, applicable font-loading APIs, and new-architecture interop before removing Blixt's native exclusion. Ordinary font-icon rendering already works.

### react-native-screens

[The local patch](patches/react-native-screens@4.25.0.patch) redirects experimental TabsHost/TabsScreen exports to existing plain-view web implementations. Eager package imports otherwise fail on macOS, even when using JS navigators.

Investigate a platform-specific fallback upstream; do not submit the unconditional redirects as a general mobile fix. This is separate from a full native Screens port.

### glog module map

`logging.h` includes `log_severity.h` and `vlog_is_on.h` inside namespace `google`. Inferred Clang submodules conflict with that inclusion during Swift/C++ compilation.

The Podfile marks both headers textual. Establish the appropriate upstream owner/version and prepare a minimal reproduction before proposing a fix.

### React Native macOS virtualized lists

Settings and Power User Tools stopped rendering/scrolling correctly with FlatList. The bounded menus now use ScrollView. Isolate the underlying issue in a reproducer before filing or patching upstream; this is separate from Animated.

## Released fixes

- **NitroTor 1.0.0:** macOS pod configuration, universal arm64/x86_64 framework, build/smoke tests, and CI release gate. Both architectures and an RN macOS host were exercised; Blixt uses the real library.
- **Turbo LND 0.0.23:** includes LND's V1 shell-node fix for Speedloader. Adopted by Blixt; supplied macOS logs show successful download, checksum verification, database opening, merge, and commit.

For app integration history, see [macOS restoration notes](macos/RESTORATION.md). For platform coverage, see [PLATFORM_SUPPORT.md](PLATFORM_SUPPORT.md).
