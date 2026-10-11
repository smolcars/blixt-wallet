import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { namespaces } from "../i18n/i18n.constants";
import { Alert } from "../utils/alert";
import { useStoreState } from "../state/store";
import { PLATFORM } from "../utils/constants";
import {
  FeePriority,
  RecommendedFees,
  fetchRecommendedFees,
  parseCustomFee,
  confirmOnchainFee,
} from "../utils/onchain-fees";

export default function useOnchainFee() {
  const t = useTranslation(namespaces.onchain.withdraw).t;
  const [feePriority, setFeePriority] = useState<FeePriority | "custom">("medium");
  const [customFee, setCustomFee] = useState("");
  const [result, setResult] = useState<{
    server: string;
    request: number;
    fees?: RecommendedFees;
    error: boolean;
  }>();
  const [feeRequest, setFeeRequest] = useState(0);
  const feeServer = useStoreState((store) => store.settings.onchainFeeServer);
  // Ignore a previous response immediately when the server changes or a retry starts.
  const currentResult =
    result?.server === feeServer && result.request === feeRequest ? result : undefined;
  const recommendedFees = currentResult?.fees;
  const feesLoading = currentResult === undefined;
  const feesError = currentResult?.error ?? false;
  const feeRate =
    feePriority === "custom" ? parseCustomFee(customFee) : recommendedFees?.[feePriority];

  const confirmFee = () =>
    confirmOnchainFee(feeRate, async (rate) => {
      const choice = await Alert.promiseAlert(
        t("form.feeRate.highFeeTitle", { defaultValue: "Unusually high network fee" }),
        t("form.feeRate.highFeeMessage", {
          feeRate: rate,
          defaultValue:
            "The selected fee rate is {{feeRate}} sat/vB. This could spend a large part of your balance on network fees. The total fee depends on transaction size. Continue with this fee rate?",
        }),
        [
          {
            text: t("buttons.cancel", { ns: namespaces.common, defaultValue: "Cancel" }),
            style: "cancel",
          },
          {
            text: t("form.feeRate.highFeeConfirm", { defaultValue: "Use high fee" }),
            style: "destructive",
          },
        ],
      );
      return choice.style === "destructive";
    });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetchRecommendedFees(feeServer, controller.signal, PLATFORM)
      .then((fees) => {
        if (active) {
          setResult({ server: feeServer, request: feeRequest, fees, error: false });
        }
      })
      .catch(() => {
        if (active) {
          setResult({ server: feeServer, request: feeRequest, error: true });
        }
      })
      .finally(() => {
        clearTimeout(timeout);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [feeRequest, feeServer]);

  return {
    confirmFee,
    feeRate,
    feePriority,
    setFeePriority,
    customFee,
    setCustomFee,
    recommendedFees,
    feesLoading,
    feesError,
    retryFees: () => setFeeRequest((request) => request + 1),
  };
}
