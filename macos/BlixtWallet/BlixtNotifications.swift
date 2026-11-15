import AppKit
import React
import UserNotifications

// Retained independently of the React bridge so notification clicks also work
// while the wallet window is hidden or the JavaScript runtime is starting.
final class BlixtNotificationCenter: NSObject, UNUserNotificationCenterDelegate {
  static let shared = BlixtNotificationCenter()
  let center = UNUserNotificationCenter.current()
  private var openWallet: (() -> Void)?

  func start(openWallet: @escaping () -> Void) {
    self.openWallet = openWallet
    center.delegate = self
  }

  static func settings(_ settings: UNNotificationSettings) -> [String: Any] {
    let status: Int
    switch settings.authorizationStatus {
    case .notDetermined: status = -1
    case .denied: status = 0
    case .authorized: status = 1
    case .provisional: status = 2
    @unknown default: status = 0
    }
    return ["authorizationStatus": status]
  }

  func userNotificationCenter(_ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([.banner, .list, .sound])
  }

  func userNotificationCenter(_ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void) {
    DispatchQueue.main.async {
      if response.actionIdentifier == UNNotificationDefaultActionIdentifier {
        self.openWallet?()
      }
      completionHandler()
    }
  }
}

// A small subset of Notifee, implemented through RN's legacy-module interop.
@objc(BlixtNotifications)
final class BlixtNotifications: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(getNotificationSettings:rejecter:)
  func getNotificationSettings(_ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock) {
    BlixtNotificationCenter.shared.center.getNotificationSettings {
      resolve(BlixtNotificationCenter.settings($0))
    }
  }

  @objc(requestPermission:resolver:rejecter:)
  func requestPermission(_ options: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock) {
    var authorization: UNAuthorizationOptions = []
    if options["alert"] as? Bool ?? true { authorization.insert(.alert) }
    if options["badge"] as? Bool ?? true { authorization.insert(.badge) }
    if options["sound"] as? Bool ?? true { authorization.insert(.sound) }
    let center = BlixtNotificationCenter.shared.center
    center.requestAuthorization(options: authorization) { _, error in
      if let error {
        reject("notification_permission_failed", error.localizedDescription, error)
        return
      }
      center.getNotificationSettings { resolve(BlixtNotificationCenter.settings($0)) }
    }
  }

  @objc(displayNotification:resolver:rejecter:)
  func displayNotification(_ notification: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock) {
    let center = BlixtNotificationCenter.shared.center
    center.getNotificationSettings { settings in
      guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else {
        reject("notification_permission_denied", "Notifications are not allowed in macOS System Settings.", nil)
        return
      }
      let content = UNMutableNotificationContent()
      content.title = notification["title"] as? String ?? "Blixt Wallet"
      content.body = notification["body"] as? String ?? ""
      if notification["sound"] as? Bool ?? true { content.sound = .default }
      let id = notification["id"] as? String ?? UUID().uuidString
      center.add(UNNotificationRequest(identifier: id, content: content, trigger: nil)) { error in
        if let error {
          reject("notification_delivery_failed", error.localizedDescription, error)
        } else {
          resolve(id)
        }
      }
    }
  }
}
