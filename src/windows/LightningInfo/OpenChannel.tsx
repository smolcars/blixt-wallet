import React, { useState, useLayoutEffect, useRef } from "react";
import { View, useWindowDimensions } from "react-native";
import { Text, Container, Icon, Spinner, CheckBox } from "native-base";
import { Button } from "../../components/Button";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";

import { LightningInfoStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import useBalance from "../../hooks/useBalance";
import { toast } from "../../utils";
import useFormatBitcoinValue from "../../hooks/useFormatBitcoinValue";
import { PLATFORM } from "../../utils/constants";
import Input from "../../components/Input";
import OnchainFeePicker from "../../components/OnchainFeePicker";
import useOnchainFee from "../../hooks/useOnchainFee";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";
import { Alert } from "../../utils/alert";
import { CommitmentType } from "react-native-turbo-lnd/protos/lightning_pb";
import { restartAppOrNotify } from "../../utils/restart-app";

export interface IOpenChannelProps {
  navigation: StackNavigationProp<LightningInfoStackParamList, "OpenChannel">;
  route: RouteProp<LightningInfoStackParamList, "OpenChannel">;
}
export default function OpenChannel({ navigation, route }: IOpenChannelProps) {
  const { width, fontScale } = useWindowDimensions();
  const t = useTranslation(namespaces.lightningInfo.openChannel).t;
  const peerUri = route.params?.peerUri;
  const connectAndOpenChannel = useStoreActions((actions) => actions.channel.connectAndOpenChannel);
  const connectAndOpenChannelAll = useStoreActions(
    (actions) => actions.channel.connectAndOpenChannelAll,
  );
  const getChannels = useStoreActions((actions) => actions.channel.getChannels);
  const [peer, setPeer] = useState(peerUri ?? "");
  const [opening, setOpening] = useState(false);
  const submitting = useRef(false);
  const fee = useOnchainFee();
  const { feeRate } = fee;
  const onChainBalance = useStoreState((store) => store.onChain.balance);
  const formatBitcoinValue = useFormatBitcoinValue();
  const {
    dollarValue,
    bitcoinValue,
    satoshiValue,
    onChangeFiatInput,
    onChangeBitcoinInput,
    bitcoinUnit,
    fiatUnit,
  } = useBalance();
  const torEnabled = useStoreState((store) => store.settings.torEnabled);
  const changeTorEnabled = useStoreActions((store) => store.settings.changeTorEnabled);
  const [withdrawAll, setWithdrawAll] = useState(false);
  const [taprootChan, setTaprootChan] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("layout.title"),
      headerShown: true,
    });
  }, [navigation, t]);

  const onOpenChannelPress = async () => {
    if (submitting.current || feeRate === undefined) {
      return;
    }
    submitting.current = true;
    try {
      setOpening(true);
      if (!(await fee.confirmFee())) {
        return;
      }

      if (withdrawAll) {
        await connectAndOpenChannelAll({
          peer,
          feeRateSat: feeRate,
          type: taprootChan ? CommitmentType.SIMPLE_TAPROOT : undefined,
        });
      } else {
        await connectAndOpenChannel({
          peer,
          amount: satoshiValue,
          feeRateSat: feeRate,
          type: taprootChan ? CommitmentType.SIMPLE_TAPROOT : undefined,
        });
      }
      await getChannels(undefined);
      navigation.pop();
    } catch (error: any) {
      toast(`Error: ${error.message}`, 12000, "danger", "Okay");

      // Special case if the error is likely related to Tor
      if (
        (torEnabled && error.message?.includes(".onion: no such host")) ||
        error.message?.includes(".onion: No address associated with hostname")
      ) {
        Alert.alert(t("torPrompt.title"), t("torPrompt.text1") + "\n\n" + t("torPrompt.text2"), [
          {
            text: "Cancel",
          },
          {
            text: "Activate Tor",
            async onPress() {
              await changeTorEnabled(!torEnabled);
              await restartAppOrNotify();
            },
          },
        ]);
      }
    } finally {
      submitting.current = false;
      setOpening(false);
    }
  };

  const onCameraPress = () => {
    navigation.navigate("CameraFullscreen", {
      onRead: setPeer,
    });
  };

  const onWithdrawAllPress = () => {
    setWithdrawAll(true);
  };

  const onCancelWithdrawAllPress = () => {
    setWithdrawAll(false);
  };

  return (
    <Container>
      <BlixtForm
        items={[
          {
            key: "CHANNEL",
            title: t("form.channel.title"),
            component: (
              <>
                <Input
                  placeholder={t("form.channel.placeholder")}
                  value={peer}
                  onChangeText={setPeer}
                />
                {PLATFORM !== "macos" && (
                  <Icon type="AntDesign" name="camera" onPress={onCameraPress} />
                )}
              </>
            ),
          },
          {
            key: "AMOUNT",
            title: `${t("form.amount.title")} ${bitcoinUnit.nice}`,
            component: (
              <>
                <Input
                  placeholder={`${t("form.amount.placeholder")} ${bitcoinUnit.nice}`}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onChangeText={onChangeBitcoinInput}
                  value={
                    withdrawAll
                      ? t("form.amount.withdrawAll", { ns: namespaces.onchain.withdraw })
                      : bitcoinValue || ""
                  }
                />
                {!withdrawAll ? (
                  <Button onPress={onWithdrawAllPress} style={{ marginRight: 5 }} small={true}>
                    <Text>{t("form.amount.all", { ns: namespaces.onchain.withdraw })}</Text>
                  </Button>
                ) : (
                  <Button
                    onPress={onCancelWithdrawAllPress}
                    style={{ marginRight: 5 }}
                    small={true}
                  >
                    <Text>x</Text>
                  </Button>
                )}
              </>
            ),
          },
          {
            key: "AMOUNT_FIAT",
            active: !withdrawAll,
            title: `${t("form.amount.title")} ${fiatUnit}`,
            component: (
              <Input
                placeholder={`${t("form.amount.placeholder")} ${fiatUnit}`}
                keyboardType="numeric"
                returnKeyType="done"
                onChangeText={onChangeFiatInput}
                value={dollarValue}
                disabled={withdrawAll}
              />
            ),
          },
          {
            key: "SAT",
            stacked: width / fontScale < 480,
            title: t("form.fee_rate.title"),
            component: <OnchainFeePicker fee={fee} disabled={opening} />,
          },
          {
            key: "ENABLE_TAPROOT_CHANS",
            active: !withdrawAll,
            title: `Taproot channel`,
            component: (
              <View style={{ alignItems: "flex-end", flex: 1, marginRight: 15 }}>
                <CheckBox
                  checked={taprootChan}
                  onPress={() => setTaprootChan(!taprootChan)}
                  style={{ marginBottom: 10 }}
                />
              </View>
              // <Input placeholder={`${t("form.amount.placeholder")} ${fiatUnit}`} keyboardType="numeric" returnKeyType="done" onChangeText={onChangeFiatInput} value={dollarValue} disabled={withdrawAll} />
            ),
          },
        ]}
        buttons={[
          <Button
            testID="OPEN_CHANNEL"
            key="OPEN_CHANNEL"
            onPress={onOpenChannelPress}
            block={true}
            primary={true}
            disabled={opening || feeRate === undefined}
          >
            {!opening && <Text>{t("form.title")}</Text>}
            {opening && <Spinner color={blixtTheme.light} />}
          </Button>,
        ]}
        noticeText={`${formatBitcoinValue(onChainBalance)} available`}
        noticeIcon={onChainBalance > 0n ? null : "info"}
      />
    </Container>
  );
}
