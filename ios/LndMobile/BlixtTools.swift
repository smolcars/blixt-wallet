import Foundation
import React

public struct BlixtToolsError: Error {
  let msg: String
}

extension BlixtToolsError: LocalizedError {
  public var errorDescription: String? {
    return NSLocalizedString(msg, comment: "")
  }
}

@objc(BlixtTools)
class BlixtTools: RCTEventEmitter {
  @objc
  override static func moduleName() -> String! {
    "BlixtTools"
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(getFlavor)
  func getFlavor() -> String {
    return Bundle.main.object(forInfoDictionaryKey: "FLAVOR") as? String ?? ""
  }

  @objc(getDebug)
  func getDebug() -> NSNumber {
    let isDebug: Bool
    if let debugValue = Bundle.main.object(forInfoDictionaryKey: "DEBUG") as? String {
      let normalized = debugValue.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
      if normalized == "true" || normalized == "1" || normalized == "yes" {
        isDebug = true
        return NSNumber(value: isDebug)
      }
      if normalized == "false" || normalized == "0" || normalized == "no" {
        isDebug = false
        return NSNumber(value: isDebug)
      }
    }
#if DEBUG
    isDebug = true
#else
    isDebug = false
#endif
    return NSNumber(value: isDebug)
  }

  @objc(getVersionCode)
  func getVersionCode() -> NSNumber {
    if let versionCode = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String,
       let parsedVersionCode = Int(versionCode) {
      return NSNumber(value: parsedVersionCode)
    }
    return NSNumber(value: 0)
  }

  @objc(getBuildType)
  func getBuildType() -> String {
    return getDebug().boolValue ? "debug" : "release"
  }

  @objc(getApplicationId)
  func getApplicationId() -> String {
    return Bundle.main.bundleIdentifier ?? ""
  }

  @objc(getVersionName)
  func getVersionName() -> String {
    return Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
  }

  @objc(getAppleTeamId)
  func getAppleTeamId() -> String {
    return Bundle.main.object(forInfoDictionaryKey: "TEAM_ID") as? String ?? ""
  }

  @objc(getChain)
  func getChain() -> String {
    return Bundle.main.object(forInfoDictionaryKey: "CHAIN") as? String ?? "mainnet"
  }

  @objc(writeConfig:resolve:reject:)
  func writeConfig(config: String, resolve: @escaping RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    do {
      let paths = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
      let url = paths[0].appendingPathComponent("lnd", isDirectory: true).appendingPathComponent("lnd.conf", isDirectory: false)
      NSLog(url.relativeString)

      try config.write(to: url, atomically: true, encoding: .utf8)
      let input = try String(contentsOf: url)
      NSLog("Read config: " + input)
      resolve("Config written")
    } catch let error {
      NSLog(error.localizedDescription)
      reject("error", error.localizedDescription, error)
    }
  }

  @objc(writeConfigFile:reject:)
  func writeConfigFile(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) -> Void {
    let chain = Bundle.main.object(forInfoDictionaryKey: "CHAIN") as? String
    var str = ""

    if (chain == "mainnet") {
      str =
"""
[Application Options]
debuglevel=info
maxbackoff=2s
norest=1
sync-freelist=1
accept-keysend=1

[Routing]
routing.assumechanvalid=1

[Bitcoin]
bitcoin.active=1
bitcoin.mainnet=1
bitcoin.node=neutrino

[Neutrino]
neutrino.connect=btcd-mainnet.lightning.computer
neutrino.feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json

[autopilot]
autopilot.active=0
autopilot.private=1
autopilot.minconfs=1
autopilot.conftarget=3
autopilot.allocation=1.0
autopilot.heuristic=externalscore:0.95
autopilot.heuristic=preferential:0.05

"""
    } else if (chain == "testnet") {
      str =
"""
[Application Options]
debuglevel=info
maxbackoff=2s
norest=1
sync-freelist=1
accept-keysend=1

[Routing]
routing.assumechanvalid=1

[Bitcoin]
bitcoin.active=1
bitcoin.testnet=1
bitcoin.node=neutrino

[Neutrino]
neutrino.connect=btcd-testnet.lightning.computer
neutrino.feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json

[autopilot]
autopilot.active=0
autopilot.private=1
autopilot.minconfs=1
autopilot.conftarget=3
autopilot.allocation=1.0
autopilot.heuristic=externalscore:0.95
autopilot.heuristic=preferential:0.05

"""
    } else if (chain == "regtest") {
      str =
"""
[Application Options]
debuglevel=info
maxbackoff=2s
norest=1
sync-freelist=1
accept-keysend=1

[Routing]
routing.assumechanvalid=1

[Bitcoin]
bitcoin.active=1
bitcoin.regtest=1
bitcoin.node=bitcoind

[Bitcoind]
bitcoind.rpchost=192.168.1.113:18443
bitcoind.rpcuser=polaruser
bitcoind.rpcpass=polarpass
bitcoind.zmqpubrawblock=192.168.1.113:28334
bitcoind.zmqpubrawtx=192.168.1.113:29335

[autopilot]
autopilot.active=0
autopilot.private=1
autopilot.minconfs=1
autopilot.conftarget=3
autopilot.allocation=1.0
autopilot.heuristic=externalscore:0.95
autopilot.heuristic=preferential:0.05

"""
    }

    do {
      let paths = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
      let url = paths[0].appendingPathComponent("lnd", isDirectory: true).appendingPathComponent("lnd.conf", isDirectory: false)

      try str.write(to: url, atomically: true, encoding: .utf8)
      let input = try String(contentsOf: url)
      NSLog("Read config: " + input)
      resolve("Config written")
    } catch let error {
      NSLog(error.localizedDescription)
      reject("error", error.localizedDescription, error)
    }
  }

  @objc(log:tag:message:)
  func log(level: String, tag: String, message: String) {
    NSLog("[" + tag + "] " + message)
  }

  @objc(DEBUG_getWalletPasswordFromKeychain:reject:)
  func DEBUG_getWalletPasswordFromKeychain(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let server = "password"

    let query: CFDictionary = [
      kSecClass: kSecClassInternetPassword,
      kSecAttrServer: server,
      kSecReturnAttributes: kCFBooleanTrue!,
      kSecReturnData: kCFBooleanTrue!,
      kSecMatchLimit: kSecMatchLimitOne as String
    ] as [CFString: Any] as CFDictionary

    var result: AnyObject?
    let osStatus = SecItemCopyMatching(query, &result)
    if osStatus != noErr && osStatus != errSecItemNotFound {
      let error = NSError(domain: NSOSStatusErrorDomain, code: Int(osStatus), userInfo: nil)
      return reject("error", error.localizedDescription, error)
    } else if (result == nil) {
      return resolve(NSNumber(value: false))
    }

    if let passwordData = result![kSecValueData] as? Data {
      let password = String(data: passwordData, encoding: .utf8)
      return resolve(password)
    }
  }

  @objc(getTorEnabled:reject:)
  func getTorEnabled(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    // Async Storage 3 keeps existing settings in its legacy store, but its
    // native multiGet API now throws and returns a dictionary.
    let asyncStorage = RNCAsyncStorage.sharedInstance()
    asyncStorage.methodQueue().async {
      do {
        let values = try asyncStorage.multiGet(["torEnabled"])
        resolve(values["torEnabled"] == "true")
      } catch {
        reject("error", error.localizedDescription, error)
      }
    }
  }

  @objc(saveChannelsBackup:resolve:reject:)
  func saveChannelsBackup(base64Backups: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
#if os(macOS)
      do {
        let dataWrapped = Data(base64Encoded: base64Backups, options: [])
        if let data = dataWrapped {
          let savePanel = NSSavePanel()
          savePanel.nameFieldStringValue = "blixt-channel-backup.dat"
          if (savePanel.runModal() == NSApplication.ModalResponse.OK) {
            let saveUrl = savePanel.url
            NSLog(saveUrl?.path ?? "")
            NSLog(saveUrl?.absoluteString ?? "")
            NSLog(saveUrl?.relativeString ?? "")

            if let saveUrlUnwrapped = saveUrl {
              try data.write(to: saveUrlUnwrapped)
            }
            resolve(true)
          } else {
            resolve(false)
          }
        } else {
          NSLog("WARNING: Unable to unwrap backup data")
          resolve(false)
        }
      } catch {
        print("Error saving backup")
        reject("error", error.localizedDescription, error)
      }
#elseif os(iOS)
      let activityController = UIActivityViewController(activityItems: [base64Backups], applicationActivities: nil)
      activityController.popoverPresentationController?.sourceView = UIView() // so that iPads won't crash, https://stackoverflow.com/a/35931947
      RCTSharedApplication()?.delegate?.window??.rootViewController?.present(activityController, animated: true, completion: {
        resolve(true)
      })
#endif
    }
  }

  @objc(saveChannelBackupFile:reject:)
  func saveChannelBackupFile(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let chain = Bundle.main.object(forInfoDictionaryKey: "CHAIN") as? String
      let paths = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
      let url = paths[0].appendingPathComponent("lnd", isDirectory: true)
        .appendingPathComponent("data", isDirectory: true)
        .appendingPathComponent("chain", isDirectory: true)
        .appendingPathComponent("bitcoin", isDirectory: true)
        .appendingPathComponent(chain ?? "mainnet", isDirectory: true)
        .appendingPathComponent("channel.backup", isDirectory: false)
#if os(iOS)
      do {
        let data = try Data(contentsOf: url)
        let activityController = UIActivityViewController(activityItems: [data], applicationActivities: nil)
        RCTSharedApplication()?.delegate?.window??.rootViewController?.present(activityController, animated: true, completion: {
          resolve(true)
        })
      } catch {
        reject("error", error.localizedDescription, error)
      }
#else
      do {
        let data = try Data(contentsOf: url)
        let savePanel = NSSavePanel()
        savePanel.nameFieldStringValue = "blixt-channel-backup.dat"
        if (savePanel.runModal() == NSApplication.ModalResponse.OK) {
          let saveUrl = savePanel.url
          NSLog(saveUrl?.path ?? "")
          NSLog(saveUrl?.absoluteString ?? "")
          NSLog(saveUrl?.relativeString ?? "")

          if let saveUrlUnwrapped = saveUrl {
            try data.write(to: saveUrlUnwrapped)
          }
          resolve(true)
        } else {
          resolve(false)
        }
      } catch {
        print("Error saving backup")
        reject("error", error.localizedDescription, error)
      }
#endif
    }
  }

  @objc(checkICloudEnabled:reject:)
  func checkICloudEnabled(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let token = FileManager.default.ubiquityIdentityToken
    resolve(token != nil)
  }

  @objc(DEBUG_listFilesInDocuments:reject:)
  func DEBUG_listFilesInDocuments(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let fileManager = FileManager.default
    let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
    do {
      let fileURLs = try fileManager.contentsOfDirectory(at: documentsURL, includingPropertiesForKeys: nil)
      print(fileURLs)
      resolve(fileURLs.description)
    } catch {
      print("Error while enumerating files \(documentsURL.path): \(error.localizedDescription)")
      reject("error", error.localizedDescription, error)
    }
  }

  @objc(DEBUG_listFilesInApplicationSupport:reject:)
  func DEBUG_listFilesInApplicationSupport(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let fileManager = FileManager.default
    let applicationSupportUrl = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    let lndUrl = applicationSupportUrl.appendingPathComponent("lnd")
    do {
      let fileURLs = try fileManager.contentsOfDirectory(at: lndUrl, includingPropertiesForKeys: nil)
      // process files
      print(fileURLs)
      resolve(fileURLs.description)
    } catch {
      print("Error while enumerating files \(lndUrl.path): \(error.localizedDescription)")
      reject("error", error.localizedDescription, error)
    }
  }

  @objc(DEBUG_deleteSpeedloaderLastrunFile:reject:)
  func DEBUG_deleteSpeedloaderLastrunFile(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let cachePath = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    let lastrunPath = cachePath.appendingPathComponent("lastrun")

    do {
      try FileManager.default.removeItem(at: lastrunPath)
    } catch {
      reject("error", error.localizedDescription, error)
      return
    }

    resolve(true)
  }

  @objc(DEBUG_deleteSpeedloaderDgraphDirectory:reject:)
  func DEBUG_deleteSpeedloaderDgraphDirectory(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let cachePath = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    let dgraphPath = cachePath.appendingPathComponent("dgraph", isDirectory: true)

    do {
      try FileManager.default.removeItem(at: dgraphPath)
    } catch {
      reject("error", error.localizedDescription, error)
      return
    }

    resolve(nil)
  }

  @objc(DEBUG_deleteNeutrinoFiles:reject:)
  func DEBUG_deleteNeutrinoFiles(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let chain = Bundle.main.object(forInfoDictionaryKey: "CHAIN") as? String
    let applicationSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    let chainPath = applicationSupport.appendingPathComponent("lnd", isDirectory: true)
                                      .appendingPathComponent("data", isDirectory: true)
                                      .appendingPathComponent("chain", isDirectory: true)
                                      .appendingPathComponent("bitcoin", isDirectory: true)
                                      .appendingPathComponent(chain ?? "mainnet", isDirectory: true)

    let neutrinoDbPath = chainPath.appendingPathComponent("neutrino.db")
    let blockHeadersBinPath = chainPath.appendingPathComponent("block_headers.bin")
    let regFiltersHeadersBinPath = chainPath.appendingPathComponent("reg_filter_headers.bin")

    do {
      try FileManager.default.removeItem(at: neutrinoDbPath)
      try FileManager.default.removeItem(at: blockHeadersBinPath)
      try FileManager.default.removeItem(at: regFiltersHeadersBinPath)
    } catch {
      reject("error", error.localizedDescription, error)
      return
    }

    resolve(true)
  }

  @objc(checkApplicationSupportExists:reject:)
  func checkApplicationSupportExists(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let applicationSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
    resolve(FileManager.default.fileExists(atPath: applicationSupport.path))
  }

  @objc(createIOSApplicationSupportAndLndDirectories:reject:)
  func createIOSApplicationSupportAndLndDirectories(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    do {
      let applicationSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
      let lndFolder = applicationSupport.appendingPathComponent("lnd", isDirectory: true)
      // This will create the lnd folder as well as "Application Support"
      try FileManager.default.createDirectory(at: lndFolder, withIntermediateDirectories: true)

      resolve(true)
    } catch let error {
      reject("error", error.localizedDescription, error)
    }
  }

  @objc(excludeLndICloudBackup:reject:)
  func excludeLndICloudBackup(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let applicationSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
    var lndFolder = applicationSupport.appendingPathComponent("lnd", isDirectory: true)

    do {
      if FileManager.default.fileExists(atPath: lndFolder.path) {
        var resourceValues = URLResourceValues()
        resourceValues.isExcludedFromBackup = true
        try lndFolder.setResourceValues(resourceValues)
        resolve(true)
      } else {
        let error = BlixtToolsError(msg: "lnd path " + lndFolder.path + " doesn't exist")
        reject("error", error.localizedDescription, error)
      }
    } catch let error {
      print("failed setting isExcludedFromBackup: \(error)")
      reject("error", error.localizedDescription, error)
    }
  }

  @objc(tailLog:resolve:reject:)
  func tailLog(numberOfLines: Double, resolve: @escaping RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let chain = Bundle.main.object(forInfoDictionaryKey: "CHAIN") as? String

    let paths = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
    let url = paths[0].appendingPathComponent("lnd", isDirectory: true)
                      .appendingPathComponent("logs", isDirectory: true)
                      .appendingPathComponent("bitcoin", isDirectory: true)
                      .appendingPathComponent(chain ?? "mainnet", isDirectory: true)
                      .appendingPathComponent("lnd.log", isDirectory: false)

    do {
      let data = try String(contentsOf: url)
      let lines = data.components(separatedBy: .newlines)
      resolve(lines.suffix(Int(numberOfLines)).joined(separator: "\n"))
    } catch {
      reject("error", error.localizedDescription, error)
    }
  }

  var lndLogFileObservingStarted = false
  @objc(observeLndLogFile:reject:)
  func observeLndLogFile(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    if (lndLogFileObservingStarted) {
      resolve(true)
      return
    }
    let chain = Bundle.main.object(forInfoDictionaryKey: "CHAIN") as? String

    let paths = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
    let url = paths[0].appendingPathComponent("lnd", isDirectory: true)
                      .appendingPathComponent("logs", isDirectory: true)
                      .appendingPathComponent("bitcoin", isDirectory: true)
                      .appendingPathComponent(chain ?? "mainnet", isDirectory: true)
                      .appendingPathComponent("lnd.log", isDirectory: false)
    let fileHandle = FileHandle(forReadingAtPath: url.path)

    DispatchQueue.main.async(execute: { [self] in
      NotificationCenter.default.addObserver(
        forName: FileHandle.readCompletionNotification,
        object: fileHandle,
        queue: OperationQueue.main,
        using: { [self] n in
          let data = n.userInfo?[NSFileHandleNotificationDataItem] as? Data
          if data != nil && (data?.count ?? 0) > 0 {
            var s: String? = nil
            if let bytes = data {
              s = String(bytes: bytes, encoding: .utf8)
            }
            if let s = s {
              // Emit through TurboModule event callback.
              if self.responds(to: NSSelectorFromString("emitOnLndLog:")) {
                self.perform(NSSelectorFromString("emitOnLndLog:"), with: s)
              }
            }
          }
          fileHandle?.readInBackgroundAndNotify()
        })
      fileHandle?.seekToEndOfFile()
      fileHandle?.readInBackgroundAndNotify()
    })
    lndLogFileObservingStarted = true
    resolve(true)
  }

  @objc(tailSpeedloaderLog:resolve:reject:)
  func tailSpeedloaderLog(numberOfLines: Double, resolve: @escaping RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let cachePath = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)

    let url = cachePath[0].appendingPathComponent("log", isDirectory: true)
                          .appendingPathComponent("speedloader.log", isDirectory: false)

    do {
      let data = try String(contentsOf: url)
      let lines = data.components(separatedBy: .newlines)
      resolve(lines.suffix(Int(numberOfLines)).joined(separator: "\n"))
    } catch {
      reject("error", error.localizedDescription, error)
    }
  }

  @objc(copyLndLog:reject:)
  func copyLndLog(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let chain = Bundle.main.object(forInfoDictionaryKey: "CHAIN") as? String
      let paths = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
      let url = paths[0].appendingPathComponent("lnd", isDirectory: true)
        .appendingPathComponent("logs", isDirectory: true)
        .appendingPathComponent("bitcoin", isDirectory: true)
        .appendingPathComponent(chain ?? "mainnet", isDirectory: true)
        .appendingPathComponent("lnd.log", isDirectory: false)
#if os(iOS)
      do {
        let data = try String(contentsOf: url)
        let activityController = UIActivityViewController(activityItems: [data], applicationActivities: nil)
        RCTSharedApplication()?.delegate?.window??.rootViewController?.present(activityController, animated: true, completion: {
          resolve(true)
        })
      } catch {
        reject("error", error.localizedDescription, error)
      }
#else
      do {
        let data = try Data(contentsOf: url)
        let savePanel = NSSavePanel()
        savePanel.nameFieldStringValue = "lnd.log"
        if (savePanel.runModal() == NSApplication.ModalResponse.OK) {
          let saveUrl = savePanel.url
          NSLog(saveUrl?.path ?? "")
          NSLog(saveUrl?.absoluteString ?? "")
          NSLog(saveUrl?.relativeString ?? "")

          if let saveUrlUnwrapped = saveUrl {
            try data.write(to: saveUrlUnwrapped)
          }
          resolve(true)
        } else {
          resolve(false)
        }
      } catch {
        print("Error saving backup")
        reject("error", error.localizedDescription, error)
      }
#endif
    }
  }

  @objc(copySpeedloaderLog:reject:)
  func copySpeedloaderLog(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    // TODO(hsjoberg): error handling if file doesn't exist
    DispatchQueue.main.async {
      let cachePath = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)

      let url = cachePath[0].appendingPathComponent("log", isDirectory: true)
                            .appendingPathComponent("speedloader.log", isDirectory: false)
#if os(iOS)
      do {
        let data = try String(contentsOf: url)
        let activityController = UIActivityViewController(activityItems: [data], applicationActivities: nil)
        RCTSharedApplication()?.delegate?.window??.rootViewController?.present(activityController, animated: true, completion: {
          resolve(true)
        })
      } catch {
        reject("error", error.localizedDescription, error)
      }
#else
      do {
        let data = try Data(contentsOf: url)
        let savePanel = NSSavePanel()
        savePanel.nameFieldStringValue = "speedloader.log"
        if (savePanel.runModal() == NSApplication.ModalResponse.OK) {
          let saveUrl = savePanel.url
          NSLog(saveUrl?.path ?? "")
          NSLog(saveUrl?.absoluteString ?? "")
          NSLog(saveUrl?.relativeString ?? "")

          if let saveUrlUnwrapped = saveUrl {
            try data.write(to: saveUrlUnwrapped)
          }
          resolve(true)
        } else {
          resolve(false)
        }
      } catch {
        print("Error saving backup")
        reject("error", error.localizedDescription, error)
      }
#endif
    }
  }

  @objc(setPersistentModeEnabled:)
  func setPersistentModeEnabled(_ enabled: Bool) {
    #if os(macOS)
    DispatchQueue.main.async {
      NotificationCenter.default.post(name: Notification.Name("BlixtPersistentModeEnabledChanged"), object: enabled)
    }
    #endif
  }

  @objc(macosOpenFileDialog:reject:)
  func macosOpenFileDialog(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
  #if os(iOS)
    let error = BlixtToolsError(msg: "Not supported iOS")
    reject("error", error.localizedDescription, error)
  #else
    DispatchQueue.main.async {
      do {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        if panel.runModal() == .OK {
          if let u = panel.url {
            resolve(try Data(contentsOf: u).base64EncodedString())
          } else {
            let error = BlixtToolsError(msg: "Could not open file")
            reject("error", error.localizedDescription, error)
          }
        } else {
          resolve(nil)
        }
      }
      catch {
       print("Error open")
       reject("error", error.localizedDescription, error)
     }
    }
  #endif
  }

  @objc(getAppFolderPath:reject:)
  func getAppFolderPath(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let paths = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
    let url = paths[0]

    resolve(url.relativeString)
  }

  @objc(getInternalFiles:reject:)
  func getInternalFiles(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let applicationSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    var filesMap: [String: Int] = [:]
    if let enumerator = FileManager.default.enumerator(at: applicationSupport, includingPropertiesForKeys: [.isRegularFileKey], options: [.skipsHiddenFiles, .skipsPackageDescendants]) {
        for case let fileURL as URL in enumerator {
            do {
                let fileAttributes = try fileURL.resourceValues(forKeys:[.isRegularFileKey])
                if fileAttributes.isRegularFile! {
                    let fileSize = try FileManager.default.attributesOfItem(atPath: fileURL.path)[.size] as! Int
                    filesMap[fileURL.lastPathComponent] = fileSize
                }
            } catch {
                reject("ERROR", "Failed to list files", error)
            }
        }
    }
    resolve(filesMap)
  }

  @objc(generateSecureRandomAsBase64:resolve:reject:)
  func generateSecureRandomAsBase64(length: Double, resolve: @escaping RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let numberOfBytes = Int(length)
    var bytes = Data(count: numberOfBytes)
    let result = bytes.withUnsafeMutableBytes { mutableBytes -> Int32 in
      if let baseAddress = mutableBytes.baseAddress {
        return SecRandomCopyBytes(kSecRandomDefault, numberOfBytes, baseAddress)
      } else {
        return errSecParam
      }
    }

    if result == errSecSuccess {
      resolve(bytes.base64EncodedString())
    } else {
      let error = NSError(domain: "BlixtTools", code: Int(result), userInfo: nil)
      reject("randombytes_error", "Error generating random bytes", error)
    }
  }

  @objc(getFilesDir:reject:)
  func getFilesDir(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let applicationSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    let lndPath = applicationSupport.appendingPathComponent("lnd", isDirectory: true)
    resolve(lndPath.path)
  }

  @objc(getCacheDir:reject:)
  func getCacheDir(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    resolve(cacheDir.path)
  }

  @objc(saveLogs:reject:)
  func saveLogs(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let chain = Bundle.main.object(forInfoDictionaryKey: "CHAIN") as? String
    let url = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("lnd", isDirectory: true)
      .appendingPathComponent("logs", isDirectory: true)
      .appendingPathComponent("bitcoin", isDirectory: true)
      .appendingPathComponent(chain ?? "mainnet", isDirectory: true)
      .appendingPathComponent("lnd.log", isDirectory: false)

    if FileManager.default.fileExists(atPath: url.path) {
      resolve(url.path)
      return
    }

    let error = BlixtToolsError(msg: "lnd.log does not exist")
    reject("error", error.localizedDescription, error)
  }

  @objc(saveChannelDbFile:reject:)
  func saveChannelDbFile(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(false)
  }

  @objc(importChannelDbFile:resolve:reject:)
  func importChannelDbFile(channelDbPath: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(false)
  }

  @objc(getIntentStringData:reject:)
  func getIntentStringData(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(nil)
  }

  @objc(getIntentNfcData:reject:)
  func getIntentNfcData(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(nil)
  }

  @objc(DEBUG_deleteWallet:reject:)
  func DEBUG_deleteWallet(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(false)
  }

  @objc(DEBUG_deleteDatafolder:reject:)
  func DEBUG_deleteDatafolder(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(false)
  }

  @objc(restartApp)
  func restartApp() {
    DispatchQueue.main.async {
      self.bridge?.reload()
    }
  }
}
