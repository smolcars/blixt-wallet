import {
  Container,
  Icon,
  Left,
  ListItem,
  Right,
  Text,
  Body,
  CheckBox,
  Header,
  Item,
} from "native-base";
import { PLATFORM } from "../../utils/constants";
import { Platform, StyleSheet } from "react-native";
import React, { useCallback, useLayoutEffect, useState } from "react";
import { hexToUint8Array, timeout, toast } from "../../utils";
import NativeBlixtTools from "../../turbomodules/NativeBlixtTools";

import { namespaces } from "../../i18n/i18n.constants";
import { useStoreActions, useStoreState } from "../../state/store";

import { Alert } from "../../utils/alert";
import { restartApp, showRestartNeededAlert } from "../../utils/restart-app";
import Clipboard from "@react-native-clipboard/clipboard";
import { pick } from "@react-native-documents/picker";
import { readFile } from "react-native-fs";
import { useTranslation } from "react-i18next";
import { setBrickDeviceAndExportChannelDb } from "../../storage/app";
import {
  getChanInfo,
  getNodeInfo,
  lookupInvoice,
  restoreChannelBackups,
  routerResetMissionControl,
  routerXImportMissionControl,
  stopDaemon,
} from "react-native-turbo-lnd";
import { ISyncInvoicesFromLndResult, ISyncPaymentsFromLndResult } from "../../state/Transaction";
import { NavigationProp } from "@react-navigation/native";
import { create, toJson } from "@bufbuild/protobuf";
import {
  ChannelEdgeSchema,
  NodeInfoSchema,
  RestoreChanBackupRequestSchema,
} from "react-native-turbo-lnd/protos/lightning_pb";
import { base64Decode } from "@bufbuild/protobuf/wire";
import { XImportMissionControlRequestSchema } from "react-native-turbo-lnd/protos/routerrpc/router_pb";
import { FlatList, ScrollView, View } from "react-native";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import Input from "../../components/Input";

interface IPowerUserToolsProps {
  navigation: NavigationProp<any>;
}

interface ToolItem {
  type: string;
  title: string;
  icon?: { type: string; name?: string };
  subtitle?: string;
  warning?: string;
  onPress?: (...args: any[]) => any;
  onLongPress?: (...args: any[]) => any;
  checkBox?: boolean;
  checked?: boolean;
}

export default function PowerUserTools({ navigation }: IPowerUserToolsProps) {
  const { t } = useTranslation(namespaces.settings.settings);
  const lndChainBackend = useStoreState((store) => store.settings.lndChainBackend);
  const [searchText, setSearchText] = useState("");

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("powerUserTools.title"),
      headerBackTitle: "Back",
      headerShown: true,
    });
  }, [navigation, t]);

  const name = useStoreState((store) => store.settings.name);
  const scheduledGossipSyncEnabled = useStoreState(
    (store) => store.settings.scheduledGossipSyncEnabled,
  );
  const dunderEnabled = useStoreState((store) => store.settings.dunderEnabled);
  const dunderServer = useStoreState((store) => store.settings.dunderServer);
  const changeScheduledSyncEnabled = useStoreActions(
    (store) => store.settings.changeScheduledSyncEnabled,
  );
  const setSyncEnabled = useStoreActions((store) => store.scheduledSync.setSyncEnabled);
  const writeConfig = useStoreActions((store) => store.writeConfig);
  const checkAutopilot = useStoreActions((store) => store.autopilot.checkAutopilot);

  const restartNeeded = () => {
    showRestartNeededAlert();
  };

  // Sign message
  const signMessage = useStoreActions((store) => store.lightning.signMessage);
  const onPressSignMessage = async () => {
    Alert.prompt(
      t("miscelaneous.signMessage.dialog1.title"),
      undefined,
      async (text) => {
        if (text.length === 0) {
          return;
        }
        const signMessageResponse = await signMessage(text);

        Alert.alert(t("miscelaneous.signMessage.dialog2.title"), signMessageResponse.signature, [
          {
            text: t("buttons.ok", { ns: namespaces.common }),
          },
          {
            text: t("buttons.copy", { ns: namespaces.common }),
            onPress: async () => {
              Clipboard.setString(signMessageResponse.signature);
              toast(t("miscelaneous.signMessage.dialog2.alert"), undefined, "warning");
            },
          },
        ]);
      },
      "plain-text",
    );
  };

  // Copy App log
  const copyAppLog = async () => {
    try {
      const path = await NativeBlixtTools.saveLogs();
      toast(`${t("miscelaneous.appLog.dialog.alert")}: ` + path, 20000, "warning");
    } catch (e: any) {
      console.error(e);
      toast(t("miscelaneous.appLog.dialog.error"), undefined, "danger");
    }
  };

  // Copy lnd log
  const copyLndLog = async () => {
    try {
      await NativeBlixtTools.copyLndLog();
    } catch (e: any) {
      console.error(e);
      toast(`${t("miscelaneous.lndLog.dialog.error")}: ${e.message}`, undefined, "danger");
    }
  };

  // Copy speedloader log
  const copySpeedloaderLog = async () => {
    try {
      await NativeBlixtTools.copySpeedloaderLog();
    } catch (e: any) {
      console.error(e);
      toast(`${t("miscelaneous.speedloaderLog.dialog.error")}: ${e.message}`, undefined, "danger");
    }
  };

  // Rescan wallet
  const changeRescanWallet = useStoreActions((store) => store.settings.changeRescanWallet);
  const onPressRescanWallet = async () => {
    await changeRescanWallet(true);
    restartNeeded();
  };

  // Setup demo environment
  const setupDemo = useStoreActions((store) => store.setupDemo);

  // Reset mission control
  const onPressResetMissionControl = async () => {
    try {
      await routerResetMissionControl({});
      toast("Done");
    } catch (error: any) {
      toast(t("msg.error", { ns: namespaces.common }) + ": " + error.message, 0, "danger", "OK");
    }
  };

  // Compact lnd databases
  const changeLndCompactDb = useStoreActions((store) => store.settings.changeLndCompactDb);
  const onPressLndCompactDb = async () => {
    await changeLndCompactDb(true);
    restartNeeded();
  };

  const onPressTriggerAutopilot = async () => {
    try {
      toast("Triggering autopilot check");
      await checkAutopilot({ force: true });
    } catch (error: any) {
      toast("Error: " + error.message, 10000, "danger");
    }
  };

  const onGetNodeInfoPress = async () => {
    Alert.prompt(
      "Get node info",
      "Enter Node ID",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {},
        },
        {
          text: "Get info",
          onPress: async (text?: string) => {
            if (text === "") {
              return;
            }
            try {
              const pubkey = text!.split("@")[0];
              const nodeInfo = await getNodeInfo({
                pubKey: pubkey,
              });
              Alert.alert("", JSON.stringify(toJson(NodeInfoSchema, nodeInfo), null, 2));
            } catch (e: any) {
              Alert.alert(e.message);
            }
          },
        },
      ],
      "plain-text",
    );
  };

  const onGetChanInfoPress = async () => {
    Alert.prompt(
      "Get channel info",
      "Enter Channel ID",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {},
        },
        {
          text: "Get info",
          onPress: async (text?: string) => {
            if (text === "") {
              return;
            }
            try {
              const nodeInfo = await getChanInfo({ chanId: text });
              Alert.alert("", JSON.stringify(toJson(ChannelEdgeSchema, nodeInfo), null, 2));
            } catch (e: any) {
              Alert.alert(e.message);
            }
          },
        },
      ],
      "plain-text",
    );
  };

  const onPressLookupInvoiceByHash = async () => {
    try {
      const hash = await Alert.promisePromptCallback(
        "Lookup invoice",
        "Provide payment hash",
        "plain-text",
      );

      if (hash === null) {
        return;
      }

      const invoice = await lookupInvoice({
        rHashStr: hash,
      });
      Alert.alert("", JSON.stringify(invoice, undefined, 2));
    } catch (error: any) {
      toast("Error: " + error.message, 10000, "danger");
    }
  };

  // Resync invoices from LND
  const syncInvoicesFromLnd = useStoreActions((store) => store.transaction.syncInvoicesFromLnd);
  const onPressSyncInvoicesFromLnd = async () => {
    try {
      toast("Syncing invoices from LND...", undefined, "warning");
      const result: ISyncInvoicesFromLndResult = await syncInvoicesFromLnd();
      Alert.alert(
        "Invoice Sync Complete",
        `Recovered ${result.syncedInvoices} missing invoice(s)\n` +
          `Updated ${result.updatedInvoices} invoice(s)\n` +
          `Total invoices in LND: ${result.totalLndInvoices}`,
      );
    } catch (error: any) {
      toast("Error: " + error.message, 10000, "danger");
    }
  };

  // Resync payments from LND
  const syncPaymentsFromLnd = useStoreActions((store) => store.transaction.syncPaymentsFromLnd);
  const onPressSyncPaymentsFromLnd = async () => {
    try {
      toast("Syncing payments from LND...", undefined, "warning");
      const result: ISyncPaymentsFromLndResult = await syncPaymentsFromLnd();
      Alert.alert(
        "Payment Sync Complete",
        `Recovered ${result.syncedPayments} missing payment(s)\n` +
          `Updated ${result.updatedPayments} payment(s)\n` +
          `Total payments in LND: ${result.totalLndPayments}`,
      );
    } catch (error: any) {
      toast("Error: " + error.message, 10000, "danger");
    }
  };

  // Change backend to bitcoindWithZmq
  const changeLndChainBackend = useStoreActions((store) => store.settings.changeLndChainBackend);
  const onPressChangeBackendToBitcoindWithZmq = async () => {
    await changeLndChainBackend("bitcoindWithZmq");
  };

  // Change backend to neutrino
  const onPressChangeBackendToNeutrino = async () => {
    await changeLndChainBackend("neutrino");
  };

  // Export channel db and brick
  const onPressExportChannelDbAndBrickInstance = async () => {
    try {
      const result = await Alert.promiseAlert(
        "Export channel db and brick",
        "Are you sure you want to export the channel db and brick?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "OK", style: "default" },
        ],
      );
      if (result.style === "cancel") {
        return;
      }

      if (PLATFORM === "android") {
        await setSyncEnabled(false);
        await changeScheduledSyncEnabled(false);
      }

      await setBrickDeviceAndExportChannelDb(true);
      await stopDaemon({});

      Alert.alert("Restart the app to continue the procedure.", "", [
        {
          text: "OK",
          onPress() {
            if (PLATFORM === "android") {
              NativeBlixtTools.restartApp();
            }
          },
        },
      ]);
    } catch (e: any) {
      toast("Error: " + e.message, 10000, "danger");
      return;
    }
  };

  // Restore SCB file
  const onPressRestoreChannelBackup = async () => {
    try {
      let backupBase64: string;
      if (PLATFORM === "macos") {
        const selected = await NativeBlixtTools.macosOpenFileDialog();
        // Native promise cancellation can bridge as null or undefined.
        if (selected == null) return;
        backupBase64 = selected;
      } else {
        const [res] = await pick();

        let backupFileUri: string;
        if (PLATFORM === "ios") {
          backupFileUri = res.uri.replace(/%20/g, " ");
        } else {
          backupFileUri = res.uri;
        }

        try {
          if (PLATFORM === "android") {
            backupBase64 = await readFile(backupFileUri, "base64");
          } else {
            backupBase64 = await readFile(backupFileUri, undefined);
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e: any) {
          if (PLATFORM === "android") {
            backupBase64 = await readFile(backupFileUri, undefined);
          } else {
            backupBase64 = await readFile(backupFileUri, "base64");
          }
        }
      }

      const r = create(RestoreChanBackupRequestSchema, {
        backup: {
          case: "multiChanBackup",
          value: base64Decode(backupBase64),
        },
      });

      await restoreChannelBackups(r);
    } catch (error: any) {
      toast("Error: " + error.message, 10000, "danger");
    }
  };

  const toolsData: ToolItem[] = [
    // Lnd section
    { type: "header", title: "Lnd" },
    {
      type: "item",
      icon: { type: "FontAwesome5", name: "file-signature" },
      title: t("miscelaneous.signMessage.title"),
      onPress: onPressSignMessage,
    },
    {
      type: "item",
      icon: { type: "Entypo", name: "info" },
      title: t("debug.getNodeInfo.title"),
      onPress: onGetNodeInfoPress,
    },
    {
      type: "item",
      icon: { type: "Entypo", name: "info" },
      title: t("debug.getChannelInfo.title"),
      onPress: onGetChanInfoPress,
    },
    {
      type: "item",
      icon: { type: "AntDesign", name: "file1" },
      title: "Lookup invoice",
      onPress: onPressLookupInvoiceByHash,
    },
    {
      type: "item",
      icon: { type: "MaterialCommunityIcons", name: "database-sync" },
      title: "Resync invoices from LND",
      subtitle: "Recover missing invoices from LND's database",
      onPress: onPressSyncInvoicesFromLnd,
    },
    {
      type: "item",
      icon: { type: "MaterialCommunityIcons", name: "database-sync" },
      title: "Resync payments from LND",
      subtitle: "Recover missing payments from LND's database",
      onPress: onPressSyncPaymentsFromLnd,
    },
    {
      type: "item",
      icon: { type: "Feather", name: "user" },
      title: t("LN.node.title"),
      onPress: () => navigation.navigate("LightningNodeInfo"),
    },
    {
      type: "item",
      icon: { type: "Feather", name: "users" },
      title: t("LN.peers.title"),
      onPress: () => navigation.navigate("LightningPeers"),
    },
    {
      type: "item",
      icon: { type: "Entypo", name: "network" },
      title: t("LN.network.title"),
      onPress: () => navigation.navigate("LightningNetworkInfo"),
    },
    {
      type: "item",
      icon: { type: "MaterialCommunityIcons", name: "restart" },
      title: t("debug.rescanWallet.title"),
      subtitle: t("debug.rescanWallet.subtitle"),
      onPress: onPressRescanWallet,
    },
    {
      type: "item",
      icon: { type: "MaterialCommunityIcons", name: "restore-alert" },
      title: t("debug.resetMissionControl.title"),
      onPress: onPressResetMissionControl,
    },
    {
      type: "item",
      icon: { type: "MaterialCommunityIcons", name: "file-export" },
      title: "Restore SCB channel backup file",
      onPress: onPressRestoreChannelBackup,
    },
    {
      type: "item",
      icon: { type: "FontAwesome", name: "stop" },
      title: "Stop lnd",
      onPress: async () => {
        try {
          await stopDaemon({});
        } catch (e: any) {
          toast("Error: " + e.message, 10000, "danger");
        }
      },
    },
    {
      type: "item",
      icon: { type: "MaterialCommunityIcons", name: "restart" },
      title: "Restart app",
      onPress: () => {
        void restartApp();
      },
    },

    // Logs section
    { type: "header", title: "Logs" },
    {
      type: "item",
      icon: { type: "Ionicons", name: "newspaper-outline" },
      title: t("debug.lndLog.title"),
      onPress: () => navigation.navigate("LndLog"),
    },
    ...(["android", "ios", "macos"].includes(PLATFORM)
      ? [
          {
            type: "item",
            icon: { type: "AntDesign", name: "copy1" },
            title: t("miscelaneous.lndLog.title"),
            onPress: () => copyLndLog(),
          },
        ]
      : []),
    ...(PLATFORM === "android"
      ? [
          {
            type: "item",
            icon: { type: "AntDesign", name: "copy1" },
            title: t("miscelaneous.appLog.title"),
            onPress: () => copyAppLog(),
          },
        ]
      : []),
    ...(scheduledGossipSyncEnabled && ["android", "ios", "macos"].includes(PLATFORM)
      ? [
          {
            type: "item",
            icon: { type: "AntDesign", name: "copy1" },
            title: t("miscelaneous.speedloaderLog.title"),
            onPress: () => copySpeedloaderLog(),
          },
        ]
      : []),
    {
      type: "item",
      icon: { type: "MaterialCommunityIcons", name: "format-list-bulleted" },
      title: t("debug.showNotifications.title"),
      onPress: () => navigation.navigate("ToastLog"),
    },
    {
      type: "item",
      icon: { type: "MaterialCommunityIcons", name: "format-list-bulleted" },
      title: t("debug.showDebugLog.title"),
      onPress: () => navigation.navigate("DebugLog"),
    },
    ...(scheduledGossipSyncEnabled
      ? [
          {
            type: "item",
            icon: { type: "Ionicons", name: "newspaper-outline" },
            title: t("debug.speedloaderLog.title"),
            onPress: () => navigation.navigate("SpeedloaderLog"),
          },
        ]
      : []),

    // Debug section
    { type: "header", title: "Debug" },
    ...(name === "Hampus" || __DEV__ === true
      ? [
          {
            type: "item",
            icon: { type: "MaterialIcons", name: "developer-mode" },
            title: t("miscelaneous.dev.title"),
            onPress: () => navigation.navigate("DEV_CommandsX"),
          },
        ]
      : []),
    ...(dunderEnabled
      ? [
          {
            type: "item",
            icon: { type: "Entypo", name: "slideshare" },
            title: t("debug.LSP.title"),
            onPress: () => navigation.navigate("DunderDoctor"),
          },
        ]
      : []),
    ...(name === "Hampus" || __DEV__ === true
      ? [
          {
            type: "item",
            icon: { type: "MaterialIcons", name: "developer-mode" },
            title: t("debug.keysend.title"),
            onPress: () => navigation.navigate("KeysendTest"),
          },
          {
            type: "item",
            icon: { type: "Entypo", name: "google-drive" },
            title: t("debug.googleDrive.title"),
            onPress: () => navigation.navigate("GoogleDriveTestbed"),
          },
          {
            type: "item",
            icon: { type: "MaterialIcons", name: "local-grocery-store" },
            title: t("debug.webln.title"),
            onPress: () => navigation.navigate("WebLNBrowser"),
          },
        ]
      : []),
    {
      type: "item",
      icon: { type: "AntDesign", name: "mobile1" },
      title: t("debug.demoMode.title"),
      subtitle: t("debug.demoMode.subtitle"),
      onPress: () => setupDemo({ changeDb: false }),
      onLongPress: () => {
        setupDemo({ changeDb: true });
        toast("DB written");
      },
    },
    {
      type: "item",
      icon: { type: "MaterialCommunityIcons", name: "typewriter" },
      title: t("debug.config.title"),
      onPress: () => {
        writeConfig();
        toast(t("msg.written", { ns: namespaces.common }));
      },
    },
    {
      type: "item",
      icon: { type: "MaterialCommunityIcons", name: "flash-outline" },
      title: "Trigger autopilot check",
      subtitle: "Run custom channel-open autopilot now",
      onPress: onPressTriggerAutopilot,
    },
    {
      type: "item",
      icon: { type: "AntDesign", name: "shrink" },
      title: t("debug.compactLndDatabases.title"),
      onPress: onPressLndCompactDb,
    },
    {
      type: "item",
      icon: { type: "MaterialCommunityIcons", name: "run-fast" },
      title: "Dunder MissionControl import",
      onPress: async () => {
        try {
          console.log(`${dunderServer}/channel-liquidity`);
          const res = await fetch(`${dunderServer}/channel-liquidity`);

          const json: { pairs: any[] } = await res.json();
          const schema = create(XImportMissionControlRequestSchema, {
            pairs: json.pairs
              .filter((c) => c.history.successAmtSat > 0)
              .map((c) => {
                return {
                  nodeFrom: hexToUint8Array(c.nodeFrom),
                  nodeTo: hexToUint8Array(c.nodeTo),
                  history: {
                    successAmtSat: BigInt(c.history.successAmtSat),
                    successTime: BigInt(c.history.successTime),
                  },
                };
              }),
          });

          await routerXImportMissionControl({
            pairs: schema.pairs,
          });

          toast("Done");
        } catch (e: any) {
          toast("Error: " + e.message, 10000, "danger");
        }
      },
    },
    {
      type: "item",
      icon: { type: "Foundation", name: "page-delete" },
      title: "Stop lnd and delete neutrino files",
      onPress: async () => {
        try {
          await stopDaemon({});
          await timeout(5000); // Let lnd close down
        } catch (e: any) {
          if (e?.message?.includes?.("closed")) {
            console.log("yes closed");
          } else {
            toast("Error: " + e.message, 10000, "danger");
            return;
          }
        }

        console.log(NativeBlixtTools.DEBUG_deleteNeutrinoFiles());
        toast("Done. Restart is required");
        restartNeeded();
      },
    },
    ...((name === "Hampus" || __DEV__ === true) && lndChainBackend === "neutrino"
      ? [
          {
            type: "item",
            icon: { type: "AntDesign", name: "file1" },
            title: "Change bitcoin backend to bitcoindWithZmq",
            onPress: onPressChangeBackendToBitcoindWithZmq,
          },
        ]
      : []),
    ...((name === "Hampus" || __DEV__ === true) && lndChainBackend !== "neutrino"
      ? [
          {
            type: "item",
            icon: { type: "AntDesign", name: "file1" },
            title: "Change bitcoin backend to neutrino",
            onPress: onPressChangeBackendToNeutrino,
          },
        ]
      : []),
    ...(PLATFORM === "android" && name === "Hampus"
      ? [
          {
            type: "item",
            icon: { type: "MaterialCommunityIcons", name: "file-export" },
            title: "Export channel.db file and permanently disable this instance of Blixt Wallet",
            subtitle: "Use this feature to migrate this wallet to another device or to lnd.",
            warning: "Only do this if you're know what you're doing",
            onPress: onPressExportChannelDbAndBrickInstance,
          },
        ]
      : []),
    ...(PLATFORM === "android"
      ? [
          {
            type: "item",
            icon: { type: "MaterialCommunityIcons", name: "cellphone-information" },
            title: "Sync worker report",
            onPress: () => navigation.navigate("SyncWorkerReport"),
          },
          {
            type: "item",
            icon: { type: "MaterialCommunityIcons", name: "cellphone-information" },
            title: "Sync worker timeline report",
            onPress: () => navigation.navigate("SyncWorkerTimelineReport"),
          },
        ]
      : []),
  ];

  const getFilteredToolsData = (): ToolItem[] => {
    if (!searchText.trim()) {
      return toolsData;
    }
    const lowerSearch = searchText.toLowerCase();
    const filtered: ToolItem[] = [];
    let currentHeader: ToolItem | null = null;
    let hasItemsInSection = false;

    for (const item of toolsData) {
      if (item.type === "header") {
        currentHeader = item;
        hasItemsInSection = false;
      } else {
        if (item.title.toLowerCase().includes(lowerSearch)) {
          // Add header if this is the first matching item in this section
          if (currentHeader && !hasItemsInSection) {
            filtered.push(currentHeader);
            hasItemsInSection = true;
          }
          filtered.push(item);
        }
      }
    }
    return filtered;
  };

  const filteredToolsData = getFilteredToolsData();

  const renderItem = useCallback(({ item }: { item: ToolItem }) => {
    if (item.type === "header") {
      return <Text style={styles.itemHeader}>{item.title}</Text>;
    }
    return (
      <ListItem style={styles.listItem} icon onPress={item.onPress} onLongPress={item.onLongPress}>
        <Left>
          <Icon style={styles.icon} type={item.icon?.type} name={item.icon?.name} />
        </Left>
        <Body>
          <Text>{item.title}</Text>
          {item.subtitle && <Text note>{item.subtitle}</Text>}
          {item.warning && (
            <Text note={true} style={{ color: blixtTheme.red }}>
              {item.warning}
            </Text>
          )}
        </Body>
        {item.checkBox && (
          <Right>
            <CheckBox checked={item.checked} onPress={item.onPress} />
          </Right>
        )}
      </ListItem>
    );
  }, []);

  return (
    <Container>
      <Header
        androidStatusBarColor="transparent"
        iosBarStyle="light-content"
        searchBar
        rounded
        style={styles.searchHeader}
      >
        <Item rounded style={{ height: 35 }}>
          <Input
            style={{ marginLeft: 8, marginTop: -2.5, borderRadius: 8, color: blixtTheme.dark }}
            placeholder={t("generic.search", { ns: namespaces.common })}
            onChangeText={setSearchText}
            value={searchText}
            autoCorrect={false}
          />
          <Icon name="ios-search" />
        </Item>
      </Header>
      {PLATFORM === "macos" ? (
        // Like Settings, keep this bounded menu mounted on macOS rather than
        // relying on virtualized cells that can stop updating during scrolling.
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
          {filteredToolsData.map((item, index) => (
            <View key={`${item.title}-${index}`}>{renderItem({ item })}</View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredToolsData}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 14 }}
          initialNumToRender={21}
          keyExtractor={(item, index) => `${item.title}-${index}`}
          maxToRenderPerBatch={15}
          removeClippedSubviews={true}
        />
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  listItem: {
    paddingLeft: 2,
    paddingRight: 2,
  },
  itemHeader: {
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 24,
    paddingBottom: 16,
    fontWeight: "bold",
  },
  icon: {
    fontSize: 22,
    ...Platform.select({
      web: {
        marginRight: 5,
      },
    }),
  },
  searchHeader: {
    backgroundColor: blixtTheme.primary,
    paddingTop: 0,
    borderBottomWidth: 0,
    marginHorizontal: 8,
    elevation: 0,
  },
});
