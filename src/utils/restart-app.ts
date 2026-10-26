import { i18n } from "../i18n/i18n";
import { stopDaemon } from "react-native-turbo-lnd";

import { namespaces } from "../i18n/i18n.constants";
import NativeBlixtTools from "../turbomodules/NativeBlixtTools";
import NativeLndmobileTools from "../turbomodules/NativeLndmobileTools";
import { Alert } from "./alert";
import { IS_ELECTROBUN, PLATFORM } from "./constants";
import { timeout } from ".";

type RestartAlertMode = "confirm" | "acknowledge" | "notice";

type ShowRestartNeededAlertOptions = {
  mode?: RestartAlertMode;
  stopDaemonFirst?: boolean;
};

const canRestartInCurrentRuntime = PLATFORM === "android" || IS_ELECTROBUN;
const RESTART_STOP_DAEMON_TIMEOUT_MS = 15000;
const RESTART_STOP_DAEMON_POLL_INTERVAL_MS = 250;

const getRestartDialogStrings = () => {
  return {
    title: i18n.t("bitcoinNetwork.restartDialog.title", {
      ns: namespaces.settings.settings,
    }),
    message: i18n.t("bitcoinNetwork.restartDialog.msg", {
      ns: namespaces.settings.settings,
    }),
    question: i18n.t("bitcoinNetwork.restartDialog.msg1", {
      ns: namespaces.settings.settings,
    }),
    ok: i18n.t("buttons.ok", { ns: namespaces.common }),
    yes: i18n.t("buttons.yes", { ns: namespaces.common }),
    no: i18n.t("buttons.no", { ns: namespaces.common }),
  };
};

export async function restartApp(options: { stopDaemonFirst?: boolean } = {}) {
  const { stopDaemonFirst = canRestartInCurrentRuntime } = options;

  if (stopDaemonFirst) {
    try {
      await stopDaemon({});

      const start = Date.now();
      while (NativeLndmobileTools.getStatus() !== 0) {
        if (Date.now() - start >= RESTART_STOP_DAEMON_TIMEOUT_MS) {
          break;
        }
        await timeout(RESTART_STOP_DAEMON_POLL_INTERVAL_MS);
      }
    } catch (error) {
      console.log(error);
    }
  }
  await timeout(1000);
  NativeBlixtTools.restartApp();
}

export async function restartAppOrNotify(options: { stopDaemonFirst?: boolean } = {}) {
  if (canRestartInCurrentRuntime) {
    await restartApp(options);
    return;
  }

  showRestartNeededAlert({ mode: "notice" });
}

export function showRestartNeededAlert(options: ShowRestartNeededAlertOptions = {}) {
  const { mode = "confirm", stopDaemonFirst = canRestartInCurrentRuntime } = options;
  const strings = getRestartDialogStrings();

  if (mode === "acknowledge") {
    Alert.alert(strings.title, strings.message, [
      {
        style: "default",
        text: strings.ok,
        onPress: () => {
          void restartApp({ stopDaemonFirst });
        },
      },
    ]);
    return;
  }

  if (!canRestartInCurrentRuntime || mode === "notice") {
    Alert.alert(strings.title, strings.message);
    return;
  }

  Alert.alert(strings.title, `${strings.message}\n${strings.question}`, [
    {
      style: "cancel",
      text: strings.no,
    },
    {
      style: "default",
      text: strings.yes,
      onPress: () => {
        void restartApp({ stopDaemonFirst });
      },
    },
  ]);
}
