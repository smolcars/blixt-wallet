import AppKit

// Keep the existing SwiftUI window delegate for all behavior except closing an
// enabled menu-bar window. Hiding preserves the React surface and embedded LND.
final class BlixtMenuBarController: NSObject, NSWindowDelegate {
  private var statusItem: NSStatusItem?
  private weak var window: NSWindow?
  private weak var originalDelegate: NSWindowDelegate?
  private(set) var enabled = false

  func start() {
    NotificationCenter.default.addObserver(self, selector: #selector(settingChanged(_:)),
      name: Notification.Name("BlixtPersistentModeEnabledChanged"), object: nil)
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
    if let statusItem { NSStatusBar.system.removeStatusItem(statusItem) }
  }

  @objc private func settingChanged(_ notification: Notification) {
    guard let value = notification.object as? Bool else { return }
    setEnabled(value)
  }

  func setEnabled(_ next: Bool) {
    guard next != enabled else { return }
    enabled = next
    if enabled {
      let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
      item.button?.image = NSImage(systemSymbolName: "bolt.fill", accessibilityDescription: "Blixt Wallet")
      item.button?.toolTip = "Blixt Wallet"
      let menu = NSMenu()
      let open = menu.addItem(withTitle: "Open Blixt Wallet", action: #selector(openWallet), keyEquivalent: "")
      open.target = self
      menu.addItem(.separator())
      let quit = menu.addItem(withTitle: "Quit Blixt Wallet", action: #selector(quitWallet), keyEquivalent: "")
      quit.target = self
      item.menu = menu
      statusItem = item
    } else {
      // Never remove the user's only way back to a hidden wallet window.
      openWallet()
      if let statusItem { NSStatusBar.system.removeStatusItem(statusItem) }
      statusItem = nil
    }
  }

  func attach(_ window: NSWindow) {
    guard self.window !== window else { return }
    self.window = window
    originalDelegate = window.delegate
    window.delegate = self
  }

  func windowShouldClose(_ sender: NSWindow) -> Bool {
    if enabled {
      sender.orderOut(nil)
      // Keep the node and menu-bar item alive without a running Dock icon.
      NSApp.setActivationPolicy(.accessory)
      return false
    }
    return originalDelegate?.windowShouldClose?(sender) ?? true
  }

  override func responds(to selector: Selector!) -> Bool {
    super.responds(to: selector) || (originalDelegate?.responds(to: selector) ?? false)
  }

  override func forwardingTarget(for selector: Selector!) -> Any? {
    if originalDelegate?.responds(to: selector) == true { return originalDelegate }
    return super.forwardingTarget(for: selector)
  }

  @objc func openWallet() {
    NSApp.setActivationPolicy(.regular)
    window?.deminiaturize(nil)
    window?.makeKeyAndOrderFront(nil)
    NSApp.activate(ignoringOtherApps: true)
  }

  @objc private func quitWallet() {
    NSApp.terminate(nil)
  }
}

final class BlixtWindowHost: NSView {
  var onWindow: ((NSWindow) -> Void)?

  override func viewDidMoveToWindow() {
    super.viewDidMoveToWindow()
    if let window { onWindow?(window) }
  }
}
