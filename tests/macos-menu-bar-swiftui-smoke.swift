import SwiftUI
let controller = BlixtMenuBarController()
final class TestDelegate: NSObject, NSApplicationDelegate {
  func applicationWillTerminate(_ notification: Notification) {
    print("PASS: explicit exit after reopen")
  }
  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    !controller.enabled
  }
}
@main struct CloseTest: App {
  @NSApplicationDelegateAdaptor(TestDelegate.self) var delegate
  var body: some Scene {
    WindowGroup("Blixt close test", id: "test") { Probe().frame(width: 200, height: 100) }
      .commands { CommandGroup(replacing: .newItem) {} }
  }
}
struct Probe: NSViewRepresentable {
  func makeNSView(context: Context) -> NSView {
    controller.start()
    controller.setEnabled(true)
    let view = BlixtWindowHost()
    view.onWindow = { window in
      controller.attach(window)
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
        window.performClose(nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
          if window.isVisible { fatalError("window did not hide") }
          if NSApp.activationPolicy() != .accessory { fatalError("Dock icon not hidden") }
          controller.openWallet()
          if !window.isVisible { fatalError("window not restored") }
          if NSApp.activationPolicy() != .regular { fatalError("Dock icon not restored") }
          print("PASS: SwiftUI close and reopen")
          if ProcessInfo.processInfo.environment["TRAY_SMOKE_QUIT"] == "1" {
            NSApp.terminate(nil)
          } else {
            controller.setEnabled(false)
            window.performClose(nil)
          }
        }
      }
    }
    return view
  }
  func updateNSView(_ view: NSView, context: Context) {}
}
