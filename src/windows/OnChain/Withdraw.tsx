import React, { useState, useLayoutEffect, useRef } from "react";
import { useWindowDimensions } from "react-native";
import { Text, Container, Icon, Spinner } from "native-base";
import { Button } from "../../components/Button";
import { StackNavigationProp } from "@react-navigation/stack";

import { OnChainStackParamList } from "./index";
import { useStoreActions, useStoreState } from "../../state/store";
import BlixtForm from "../../components/Form";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { parseBech32, toast } from "../../utils";
import { BitcoinUnits, convertBitcoinUnit } from "../../utils/bitcoin-units";
import useBalance from "../../hooks/useBalance";
import useFormatBitcoinValue from "../../hooks/useFormatBitcoinValue";
import { PLATFORM } from "../../utils/constants";
import Input from "../../components/Input";
import OnchainFeePicker from "../../components/OnchainFeePicker";
import useOnchainFee from "../../hooks/useOnchainFee";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

export interface IOpenChannelProps {
  navigation: StackNavigationProp<OnChainStackParamList, "Withdraw">;
}
export default ({ navigation }: IOpenChannelProps) => {
  const { width, fontScale } = useWindowDimensions();
  const t = useTranslation(namespaces.onchain.withdraw).t;
  const sendCoins = useStoreActions((actions) => actions.onChain.sendCoins);
  const sendCoinsAll = useStoreActions((actions) => actions.onChain.sendCoinsAll);
  const getBalance = useStoreActions((actions) => actions.onChain.getBalance);
  const [address, setAddress] = useState("");
  const [sending, setSending] = useState(false);
  const submitting = useRef(false);
  const fee = useOnchainFee();
  const { feeRate } = fee;
  const [withdrawAll, setWithdrawAll] = useState(false);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const { dollarValue, bitcoinValue, satoshiValue, onChangeFiatInput, onChangeBitcoinInput } =
    useBalance();
  const onChainBalance = useStoreState((store) => store.onChain.balance);
  const formatBitcoinValue = useFormatBitcoinValue();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("layout.title"),
      headerShown: true,
    });
  }, [navigation, t]);

  const onWithdrawClick = async () => {
    if (submitting.current || feeRate === undefined) {
      return;
    }
    submitting.current = true;
    try {
      setSending(true);
      if (!(await fee.confirmFee())) {
        return;
      }
      let result;
      if (withdrawAll) {
        result = await sendCoinsAll({
          address,
          feeRate,
        });
      } else {
        result = await sendCoins({
          address,
          sat: satoshiValue,
          feeRate,
        });
      }
      console.log(result);
      await getBalance(undefined);
      navigation.pop();

      toast(t("form.withdraw.alert"), 6000, "success");
    } catch (e: any) {
      toast(`${t("msg.error", { ns: namespaces.common })}: ${e.message}`, 12000, "danger", "OK");
    } finally {
      submitting.current = false;
      setSending(false);
    }
  };

  const onAddressChange = (text: string) => {
    const parsed = parseBech32(text);
    setAddress(parsed.address);
    if (parsed.amount) {
      const s = convertBitcoinUnit(parsed.amount, "bitcoin", bitcoinUnit); // TODO test
      onChangeBitcoinInput(s.toString());
    }
  };

  const onCameraPress = () => {
    navigation.navigate("CameraFullscreen", {
      onRead: onAddressChange,
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
            key: "BTC_ADDRESS",
            title: t("form.address.title"),
            component: (
              <>
                <Input
                  testID="INPUT_BITCOIN_ADDRESS"
                  placeholder={t("form.address.placeholder")}
                  value={address}
                  onChangeText={onAddressChange}
                />
                {PLATFORM !== "macos" && (
                  <Icon
                    type="AntDesign"
                    name="camera"
                    onPress={onCameraPress}
                    style={{ padding: 10 }}
                  />
                )}
              </>
            ),
          },
          {
            key: "AMOUNT",
            title: `${t("form.amount.title")} ${BitcoinUnits[bitcoinUnit].nice}`,
            component: (
              <>
                <Input
                  testID="INPUT_AMOUNT"
                  placeholder={`${t("form.amount.placeholder")} ${BitcoinUnits[bitcoinUnit].nice}`}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onChangeText={onChangeBitcoinInput}
                  value={withdrawAll ? t("form.amount.withdrawAll") : bitcoinValue || ""}
                  disabled={withdrawAll}
                />
                {!withdrawAll ? (
                  <Button onPress={onWithdrawAllPress} style={{ marginRight: 5 }} small={true}>
                    <Text>{t("form.amount.all")}</Text>
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
            title: `${t("form.amount.title")} ${fiatUnit}`,
            active: !withdrawAll,
            component: (
              <>
                <Input
                  testID="INPUT_AMOUNT_FIAT"
                  placeholder={`${t("form.amount.placeholder")} ${fiatUnit}`}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onChangeText={onChangeFiatInput}
                  value={dollarValue}
                  disabled={withdrawAll}
                />
              </>
            ),
          },
          {
            key: "SAT",
            stacked: width / fontScale < 480,
            title: t("form.feeRate.title"),
            component: <OnchainFeePicker fee={fee} disabled={sending} />,
          },
        ]}
        buttons={[
          <Button
            testID="SEND_COINS"
            key="WITHDRAW"
            block={true}
            primary={true}
            onPress={onWithdrawClick}
            disabled={sending || feeRate === undefined}
          >
            {!sending && <Text>{t("form.withdraw.title")}</Text>}
            {sending && <Spinner color={blixtTheme.light} />}
          </Button>,
        ]}
        noticeText={`${formatBitcoinValue(onChainBalance)} available`}
        noticeIcon={onChainBalance > 0n ? null : "info"}
      />
    </Container>
  );
};
