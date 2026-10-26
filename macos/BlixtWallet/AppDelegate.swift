import SwiftUI
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
struct BlixtWalletApp: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

  var body: some Scene {
    // A single-window Scene exits when its window is hidden. WindowGroup lets
    // the menu-bar controller keep the same React/LND instance alive instead.
    WindowGroup("Blixt Wallet", id: "main") {
      ReactNativeView(factory: appDelegate.reactNativeFactory, menuBar: appDelegate.menuBar)
        .preferredColorScheme(.dark)
    }
    .defaultSize(width: 1280, height: 720)
    .commands {
      CommandGroup(replacing: .newItem) {}
    }
  }
}

class AppDelegate: NSObject, NSApplicationDelegate {
  let menuBar = BlixtMenuBarController()
  private let reactNativeDelegate: ReactNativeDelegate
  let reactNativeFactory: RCTReactNativeFactory

  override init() {
    if ProcessInfo.processInfo.environment["BLIXT_BACKUP_BEFORE_START"] == "1" {
      do {
        try backupExistingApplicationData()
      } catch {
        fatalError("Restoration backup failed; refusing to start the wallet: \(error)")
      }
    }
    let delegate = ReactNativeDelegate()
    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeDelegate = delegate
    reactNativeFactory = RCTReactNativeFactory(delegate: delegate)
    super.init()
  }

  func applicationWillFinishLaunching(_ notification: Notification) {
    menuBar.start()
    BlixtNotificationCenter.shared.start { [weak self] in self?.menuBar.openWallet() }
    NSAppleEventManager.shared().setEventHandler(
      self,
      andSelector: #selector(getURL(_:withReplyEvent:)),
      forEventClass: AEEventClass(kInternetEventClass),
      andEventID: AEEventID(kAEGetURL)
    )
  }

  func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
    if menuBar.enabled {
      menuBar.openWallet()
      return false
    }
    return true
  }

  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    !menuBar.enabled
  }

  @objc private func getURL(_ event: NSAppleEventDescriptor, withReplyEvent reply: NSAppleEventDescriptor) {
    menuBar.openWallet()
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

struct ReactNativeView: NSViewRepresentable {
  let factory: RCTReactNativeFactory
  let menuBar: BlixtMenuBarController

  func makeNSView(context: Context) -> NSView {
    let view = factory.rootViewFactory.view(withModuleName: "BlixtWallet")
    // RN's macOS surface defaults to solid white, independent of appearance.
    // The native window chrome can expose this background above the JS content.
    (view as? RCTUIView)?.backgroundColor = .windowBackgroundColor
    let host = BlixtWindowHost(frame: .zero)
    host.onWindow = { [weak menuBar] window in menuBar?.attach(window) }
    view.autoresizingMask = [.width, .height]
    view.frame = host.bounds
    host.addSubview(view)
    return host
  }

  func updateNSView(_ nsView: NSView, context: Context) {}
}
