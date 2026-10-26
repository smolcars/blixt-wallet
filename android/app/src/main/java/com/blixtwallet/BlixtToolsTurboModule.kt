package com.blixtwallet

import android.content.Intent
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.os.FileObserver
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.hypertrack.hyperlog.HyperLog
import com.jakewharton.processphoenix.ProcessPhoenix
import java.io.BufferedReader
import java.io.File
import java.io.FileInputStream
import java.io.FileNotFoundException
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStreamReader
import java.io.PrintWriter
import java.io.RandomAccessFile
import java.security.SecureRandom
import java.text.SimpleDateFormat
import java.util.Arrays
import java.util.Date
import java.util.HashMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.asyncstorage.legacy_storage.LegacyStorageModule

class BlixtToolsTurboModule(reactContext: ReactApplicationContext) :
  NativeBlixtToolsSpec(reactContext) {
  private var logObserver: FileObserver? = null
  private val asyncStorage by lazy {
    LegacyStorageModule.getStorageInstance(reactApplicationContext)
  }
  private val asyncStorageScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

  override fun getName() = NAME

  override fun getFlavor(): String {
    return readBuildConfigString("FLAVOR_custom") ?: BuildConfig.FLAVOR
  }

  override fun getDebug(): Boolean {
    return BuildConfig.DEBUG
  }

  override fun getVersionCode(): Double {
    return BuildConfig.VERSION_CODE.toDouble()
  }

  override fun getBuildType(): String {
    return BuildConfig.BUILD_TYPE
  }

  override fun getApplicationId(): String {
    return BuildConfig.APPLICATION_ID
  }

  override fun getVersionName(): String {
    return BuildConfig.VERSION_NAME
  }

  override fun getAppleTeamId(): String {
    return ""
  }

  override fun getChain(): String {
    return BuildConfig.CHAIN
  }

  override fun writeConfig(config: String, promise: Promise) {
    val filename = "${reactApplicationContext.filesDir}/lnd.conf"

    try {
      File(filename).parentFile?.mkdirs()
      PrintWriter(filename).use { out ->
        out.println(config)
      }
      HyperLog.d(TAG, "Saved lnd config: $filename")
    } catch (e: Exception) {
      HyperLog.e(TAG, "Couldn't write $filename", e)
      promise.reject("Couldn't write: $filename", e)
      return
    }

    promise.resolve("File written: $filename")
  }

  override fun generateSecureRandomAsBase64(length: Double, promise: Promise) {
    val secureRandom = SecureRandom()
    val buffer = ByteArray(length.toInt())
    secureRandom.nextBytes(buffer)
    promise.resolve(Base64.encodeToString(buffer, Base64.NO_WRAP))
  }

  override fun log(level: String, tag: String, message: String) {
    val mainTag = "BlixtWallet"
    when (level) {
      "v" -> HyperLog.v(mainTag, "[$tag] $message")
      "d" -> HyperLog.d(mainTag, "[$tag] $message")
      "i" -> HyperLog.i(mainTag, "[$tag] $message")
      "w" -> HyperLog.w(mainTag, "[$tag] $message")
      "e" -> HyperLog.e(mainTag, "[$tag] $message")
      else -> HyperLog.v(mainTag, "[unknown msg type][$tag] $message")
    }
  }

  override fun saveLogs(promise: Promise) {
    val file = HyperLog.getDeviceLogsInFile(reactApplicationContext, false)
    if (file != null && file.exists()) {
      promise.resolve(file.absolutePath)
    } else {
      promise.reject("Fail saving log")
    }
  }

  override fun copyLndLog(promise: Promise) {
    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "text/plain"
      putExtra(Intent.EXTRA_TITLE, "lnd.log")
    }
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Current activity is null")
      return
    }
    activity.startActivityForResult(intent, MainActivity.INTENT_COPYLNDLOG)
    promise.resolve(true)
  }

  override fun copySpeedloaderLog(promise: Promise) {
    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "text/plain"
      putExtra(Intent.EXTRA_TITLE, "speedloader.log")
    }
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Current activity is null")
      return
    }
    activity.startActivityForResult(intent, MainActivity.INTENT_COPYSPEEDLOADERLOG)
    promise.resolve(true)
  }

  override fun tailLog(numberOfLines: Double, promise: Promise) {
    val file = File(
      "${reactApplicationContext.filesDir}/logs/bitcoin/${BuildConfig.CHAIN}/lnd.log"
    )
    tailFile(file, numberOfLines.toInt(), promise)
  }

  override fun observeLndLogFile(promise: Promise) {
    if (logObserver != null) {
      promise.resolve(true)
      return
    }

    val appDir = reactApplicationContext.filesDir
    val logDir = "$appDir/logs/bitcoin/mainnet"
    val logFile = "$logDir/lnd.log"

    var stream: FileInputStream? = null
    while (true) {
      try {
        stream = FileInputStream(logFile)
      } catch (_: FileNotFoundException) {
        val dir = File(logDir)
        dir.mkdirs()
        val f = File(logFile)
        try {
          f.createNewFile()
          continue
        } catch (e: IOException) {
          e.printStackTrace()
          promise.reject(e)
          return
        }
      }
      val inputStream = InputStreamReader(stream ?: run {
        promise.reject("ERROR", "Failed opening log stream")
        return
      })
      val buf = BufferedReader(inputStream)
      try {
        readToEnd(buf, false)
      } catch (e: IOException) {
        e.printStackTrace()
        promise.reject(e)
        return
      }

      logObserver = object : FileObserver(logFile) {
        override fun onEvent(event: Int, path: String?) {
          if (event != MODIFY) {
            return
          }
          try {
            readToEnd(buf, true)
          } catch (e: IOException) {
            e.printStackTrace()
          }
        }
      }
      logObserver?.startWatching()
      Log.i(TAG, "Started watching $logFile")
      promise.resolve(true)
      return
    }
  }

  override fun tailSpeedloaderLog(numberOfLines: Double, promise: Promise) {
    val file = File("${reactApplicationContext.cacheDir}/log/speedloader.log")
    tailFile(file, numberOfLines.toInt(), promise)
  }

  override fun saveChannelsBackup(base64Backups: String, promise: Promise) {
    MainActivity.tmpChanBackup = Base64.decode(base64Backups, Base64.NO_WRAP)
    val dateFormat = SimpleDateFormat("yyyy-MM-dd_HH-mm-ss")

    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "text/plain"
      putExtra(Intent.EXTRA_TITLE, "blixt-channels-backup-${dateFormat.format(Date())}.bin")
    }
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Current activity is null")
      return
    }
    activity.startActivityForResult(intent, MainActivity.INTENT_EXPORTCHANBACKUP)
    promise.resolve(true)
  }

  override fun saveChannelBackupFile(promise: Promise) {
    val dateFormat = SimpleDateFormat("yyyy-MM-dd_HH-mm-ss")
    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "text/plain"
      putExtra(Intent.EXTRA_TITLE, "blixt-channels-backup-${dateFormat.format(Date())}.bin")
    }
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Current activity is null")
      return
    }
    activity.startActivityForResult(intent, MainActivity.INTENT_EXPORTCHANBACKUPFILE)
    promise.resolve(true)
  }

  override fun getTorEnabled(promise: Promise) {
    asyncStorageScope.launch {
      try {
        val torEnabled = asyncStorage
          .getValues(listOf("torEnabled"))
          .firstOrNull()
          ?.value
        if (torEnabled != null) {
          promise.resolve(torEnabled == "true")
        } else {
          promise.reject("ASYNC_STORAGE_ERROR", "Could not find torEnabled")
        }
      } catch (e: Exception) {
        promise.reject("ASYNC_STORAGE_ERROR", "Could not read torEnabled", e)
      }
    }
  }

  override fun DEBUG_deleteSpeedloaderLastrunFile(promise: Promise) {
    val filename = "${reactApplicationContext.cacheDir}/lastrun"
    val file = File(filename)
    promise.resolve(file.delete())
  }

  override fun DEBUG_deleteSpeedloaderDgraphDirectory(promise: Promise) {
    val filename = "${reactApplicationContext.cacheDir}/dgraph"
    val file = File(filename)
    deleteRecursive(file)
    promise.resolve(null)
  }

  override fun DEBUG_deleteNeutrinoFiles(promise: Promise) {
    val chainFolder = "${reactApplicationContext.filesDir}/data/chain/bitcoin/${BuildConfig.CHAIN}"

    val neutrinoDbFile = File("$chainFolder/neutrino.db")
    val blockHeadersBinFile = File("$chainFolder/block_headers.bin")
    val regHeadersBinFile = File("$chainFolder/reg_filter_headers.bin")
    promise.resolve(
      neutrinoDbFile.delete() && blockHeadersBinFile.delete() && regHeadersBinFile.delete()
    )
  }

  override fun getInternalFiles(promise: Promise) {
    try {
      val filesDir = reactApplicationContext.filesDir.toString()
      val filesMap = listFiles(filesDir)
      val result = Arguments.createMap()
      for ((filePath, fileSize) in filesMap) {
        result.putDouble(filePath, fileSize.toDouble())
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("ERROR", e)
    }
  }

  override fun getCacheDir(promise: Promise) {
    promise.resolve(reactApplicationContext.cacheDir.absolutePath)
  }

  override fun getFilesDir(promise: Promise) {
    promise.resolve(reactApplicationContext.filesDir.absolutePath)
  }

  override fun getAppFolderPath(promise: Promise) {
    promise.resolve(reactApplicationContext.filesDir.absolutePath)
  }

  override fun saveChannelDbFile(promise: Promise) {
    MainActivity.tmpExportChannelDbPromise = promise
    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "application/octet-stream"
      putExtra(Intent.EXTRA_TITLE, "channel.db")
    }
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Current activity is null")
      return
    }
    activity.startActivityForResult(intent, MainActivity.INTENT_EXPORTCHANNELDBFILE)
  }

  override fun importChannelDbFile(channelDbPath: String, promise: Promise) {
    Log.i(
      TAG,
      "${reactApplicationContext.filesDir}/data/graph/${BuildConfig.CHAIN}/channel.db"
    )
    try {
      val sourceFile = File(channelDbPath)
      val channelDbFilePath = "${reactApplicationContext.filesDir}/data/graph/${BuildConfig.CHAIN}/channel.db"
      val destChannelDbFile = File(channelDbFilePath)

      destChannelDbFile.delete()

      val destFile = File(channelDbFilePath)
      if (!destFile.exists() && !destFile.createNewFile()) {
        promise.reject(IOException("Failed to create destination channel.db file"))
        return
      }

      FileInputStream(sourceFile).use { input ->
        FileOutputStream(destFile).use { output ->
          val buffer = ByteArray(1024)
          var read = input.read(buffer)
          while (read != -1) {
            output.write(buffer, 0, read)
            read = input.read(buffer)
          }
          output.flush()
        }
      }

      sourceFile.delete()
      promise.resolve(true)
    } catch (error: IOException) {
      promise.reject(error)
    }
  }

  override fun getIntentStringData(promise: Promise) {
    val sharedText = reactApplicationContext.currentActivity
      ?.intent
      ?.getStringExtra(Intent.EXTRA_TEXT)

    if (sharedText != null) {
      Log.d(TAG, sharedText)
      promise.resolve(sharedText)
    } else {
      Log.d(TAG, "sharedText null")
      promise.resolve(null)
    }
  }

  override fun getIntentNfcData(promise: Promise) {
    @Suppress("DEPRECATION")
    val tag = reactApplicationContext.currentActivity
      ?.intent
      ?.getParcelableExtra(NfcAdapter.EXTRA_TAG) as? Tag

    if (tag == null) {
      promise.resolve(null)
      return
    }

    val ndef = Ndef.get(tag)
    if (ndef == null) {
      HyperLog.d(TAG, "NFC tag is not NDEF")
      promise.resolve(null)
      return
    }

    val ndefMessage: NdefMessage = ndef.cachedNdefMessage ?: run {
      promise.resolve(null)
      return
    }

    val records: Array<NdefRecord> = ndefMessage.records
    if (records.isNotEmpty()) {
      val record = records[0]
      if (
        record.tnf == NdefRecord.TNF_WELL_KNOWN &&
        Arrays.equals(record.type, NdefRecord.RTD_TEXT)
      ) {
        val payload = record.payload
        val charset = if ((payload[0].toInt() and 128) == 0) Charsets.UTF_8 else Charsets.UTF_16
        val languageCodeLength = payload[0].toInt() and 0x3F

        try {
          val text = String(
            payload,
            languageCodeLength + 1,
            payload.size - languageCodeLength - 1,
            charset
          )
          promise.resolve(text)
          return
        } catch (e: Exception) {
          HyperLog.e(TAG, "Error returning ndef data", e)
        }
      } else {
        HyperLog.d(TAG, "Cannot read NFC Tag Record")
      }
    }

    promise.resolve(null)
  }

  override fun DEBUG_deleteWallet(promise: Promise) {
    HyperLog.i(TAG, "DEBUG deleting wallet")
    val filename = "${reactApplicationContext.filesDir}/data/chain/bitcoin/${BuildConfig.CHAIN}/wallet.db"
    val file = File(filename)
    promise.resolve(file.delete())
  }

  override fun DEBUG_deleteDatafolder(promise: Promise) {
    HyperLog.i(TAG, "DEBUG deleting data folder")
    val filename = "${reactApplicationContext.filesDir}/data/"
    val file = File(filename)
    deleteRecursive(file)
    promise.resolve(null)
  }

  override fun restartApp() {
    ProcessPhoenix.triggerRebirth(reactApplicationContext)
  }

  override fun checkICloudEnabled(promise: Promise) {
    promise.resolve(false)
  }

  override fun checkApplicationSupportExists(promise: Promise) {
    promise.resolve(false)
  }

  override fun createIOSApplicationSupportAndLndDirectories(promise: Promise) {
    promise.resolve(false)
  }

  override fun excludeLndICloudBackup(promise: Promise) {
    promise.resolve(false)
  }

  override fun setPersistentModeEnabled(enabled: Boolean) {
    // macOS-only window behavior.
  }

  override fun macosOpenFileDialog(promise: Promise) {
    promise.resolve(null)
  }

  private fun tailFile(file: File, numberOfLines: Int, promise: Promise) {
    var fileHandler: RandomAccessFile? = null
    try {
      fileHandler = RandomAccessFile(file, "r")
      val fileLength = fileHandler.length() - 1
      val sb = StringBuilder()
      var line = 0

      for (filePointer in fileLength downTo 0) {
        fileHandler.seek(filePointer)
        val readByte = fileHandler.readByte().toInt()

        if (readByte == 0xA) {
          if (filePointer < fileLength) {
            line += 1
          }
        } else if (readByte == 0xD) {
          if (filePointer < fileLength - 1) {
            line += 1
          }
        }

        if (line >= numberOfLines) {
          break
        }
        sb.append(readByte.toChar())
      }

      promise.resolve(sb.reverse().toString())
    } catch (e: FileNotFoundException) {
      e.printStackTrace()
      promise.reject(e)
    } catch (e: IOException) {
      e.printStackTrace()
      promise.reject(e)
    } finally {
      try {
        fileHandler?.close()
      } catch (_: IOException) {
      }
    }
  }

  @Throws(IOException::class)
  private fun readToEnd(buf: BufferedReader, emit: Boolean) {
    var line: String?
    while (true) {
      line = buf.readLine()
      if (line == null) {
        break
      }
      if (!emit) {
        continue
      }
      emitOnLndLog(line)
    }
  }

  private fun deleteRecursive(fileOrDirectory: File) {
    if (fileOrDirectory.isDirectory) {
      fileOrDirectory.listFiles()?.forEach { child ->
        deleteRecursive(child)
      }
    }

    HyperLog.d(TAG, "Delete file ${fileOrDirectory.name} : ${fileOrDirectory.delete()}")
  }

  private fun listFiles(dirPath: String): HashMap<String, Long> {
    val filesMap = HashMap<String, Long>()
    val dir = File(dirPath)
    val files = dir.listFiles()
    if (files != null) {
      for (file in files) {
        if (file.isDirectory) {
          filesMap.putAll(listFiles(file.absolutePath))
        } else {
          filesMap[file.name] = file.length()
        }
      }
    }
    return filesMap
  }

  private fun readBuildConfigString(fieldName: String): String? {
    return try {
      BuildConfig::class.java.getField(fieldName).get(null)?.toString()
    } catch (_: Exception) {
      null
    }
  }

  override fun invalidate() {
    asyncStorageScope.cancel()
    super.invalidate()
  }

  companion object {
    const val NAME = "BlixtTools"
    private const val TAG = "BlixtTools"
  }
}
