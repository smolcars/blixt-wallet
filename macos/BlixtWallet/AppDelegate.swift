import SwiftUI
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
struct BlixtWalletApp: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

  var body: some Scene {
    Window("Blixt Wallet", id: "main") {
      ReactNativeView(factory: appDelegate.reactNativeFactory)
    }
    .defaultSize(width: 1280, height: 720)
  }
}

class AppDelegate: NSObject, NSApplicationDelegate {
  private let reactNativeDelegate: ReactNativeDelegate
  let reactNativeFactory: RCTReactNativeFactory

  override init() {
#if DEBUG
    if ProcessInfo.processInfo.environment["BLIXT_BACKUP_BEFORE_START"] == "1" {
      do {
        try backupExistingApplicationData()
      } catch {
        fatalError("Restoration backup failed; refusing to start the wallet: \(error)")
      }
    }
#endif
    let delegate = ReactNativeDelegate()
    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeDelegate = delegate
    reactNativeFactory = RCTReactNativeFactory(delegate: delegate)
    super.init()
  }

  func applicationWillFinishLaunching(_ notification: Notification) {
    NSAppleEventManager.shared().setEventHandler(
      self,
      andSelector: #selector(getURL(_:withReplyEvent:)),
      forEventClass: AEEventClass(kInternetEventClass),
      andEventID: AEEventID(kAEGetURL)
    )
  }

  @objc private func getURL(_ event: NSAppleEventDescriptor, withReplyEvent reply: NSAppleEventDescriptor) {
    RCTLinkingManager.getUrlEventHandler(event, withReplyEvent: reply)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    let provider = RCTBundleURLProvider.sharedSettings()
    if let host = ProcessInfo.processInfo.environment["BLIXT_METRO_HOST"] {
      provider.jsLocation = host
    }
    return provider.jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

#if DEBUG
// Run before creating the React runtime so storage migrations and LND cannot
// modify the originals until the requested backup has completed.
private func backupExistingApplicationData() throws {
  let files = FileManager.default
  let library = files.urls(for: .libraryDirectory, in: .userDomainMask)[0]
  let destination = library.appendingPathComponent("BlixtRestorationBackups", isDirectory: true)
    .appendingPathComponent(UUID().uuidString, isDirectory: true)
  try files.createDirectory(at: destination, withIntermediateDirectories: true,
                            attributes: [.posixPermissions: 0o700])
  let sources = [
    files.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0],
    files.urls(for: .documentDirectory, in: .userDomainMask)[0],
    library.appendingPathComponent("LocalDatabase", isDirectory: true),
    library.appendingPathComponent("Preferences", isDirectory: true),
  ]
  for source in sources where files.fileExists(atPath: source.path) {
    try files.copyItem(at: source, to: destination.appendingPathComponent(source.lastPathComponent))
  }
  try Data("File backup complete. Keychain items remain in the system keychain.\n".utf8)
    .write(to: destination.appendingPathComponent("COMPLETE.txt"), options: .atomic)
  NSLog("Restoration backup complete: %@", destination.path)
}
#endif

struct ReactNativeView: NSViewRepresentable {
  let factory: RCTReactNativeFactory

  func makeNSView(context: Context) -> NSView {
    factory.rootViewFactory.view(withModuleName: "BlixtWallet")
  }

  func updateNSView(_ nsView: NSView, context: Context) {}
}
