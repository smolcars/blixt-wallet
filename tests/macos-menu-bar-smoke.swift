// Compiled alongside the AppKit controller by macos-menu-bar.test.cjs.
let app = NSApplication.shared
app.setActivationPolicy(.regular)
let controller = BlixtMenuBarController()
controller.start()
assert(!controller.enabled)
final class PreviousDelegate: NSObject, NSWindowDelegate {
  var closeRequests = 0
  func windowShouldClose(_ sender: NSWindow) -> Bool { closeRequests += 1; return false }
}
let previous = PreviousDelegate()
let window = NSWindow(contentRect: NSRect(x: 100, y: 100, width: 200, height: 120),
  styleMask: [.titled, .closable], backing: .buffered, defer: false)
window.isReleasedWhenClosed = false
window.delegate = previous
controller.attach(window)
assert(!controller.windowShouldClose(window))
assert(previous.closeRequests == 1)
NotificationCenter.default.post(name: Notification.Name("BlixtPersistentModeEnabledChanged"), object: true)
assert(controller.enabled)
assert(app.activationPolicy() == .regular)
window.makeKeyAndOrderFront(nil)
window.performClose(nil)
assert(!window.isVisible)
assert(app.activationPolicy() == .accessory)
assert(previous.closeRequests == 1)
controller.openWallet()
assert(window.isVisible)
assert(app.activationPolicy() == .regular)
window.performClose(nil)
assert(!window.isVisible)
controller.setEnabled(false)
assert(!controller.enabled)
assert(window.isVisible)
assert(app.activationPolicy() == .regular)
assert(!controller.windowShouldClose(window))
assert(previous.closeRequests == 2)
window.orderOut(nil)
print("PASS: default off, hide/reopen, disable reopens, delegate preservation, native setting notification")
