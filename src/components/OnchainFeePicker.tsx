import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Text, Spinner, Icon } from "native-base";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";
import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { namespaces } from "../i18n/i18n.constants";
import type useOnchainFee from "../hooks/useOnchainFee";

interface OnchainFeePickerProps {
  fee: ReturnType<typeof useOnchainFee>;
  disabled?: boolean;
}

export default function OnchainFeePicker({ fee, disabled = false }: OnchainFeePickerProps) {
  const t = useTranslation(namespaces.onchain.withdraw).t;
  const {
    feeRate,
    feePriority,
    setFeePriority,
    customFee,
    setCustomFee,
    recommendedFees,
    feesLoading,
    feesError,
    retryFees,
  } = fee;

  return (
    <View style={style.feePicker}>
      <View style={style.feeOptions}>
        {(["low", "medium", "high"] as const).map((priority) => (
          <TouchableOpacity
            key={priority}
            testID={`FEE_PRIORITY_${priority.toUpperCase()}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: feePriority === priority, disabled }}
            aria-checked={feePriority === priority}
            disabled={disabled}
            onPress={() => setFeePriority(priority)}
            style={[style.feeOption, feePriority === priority && style.selectedFeeOption]}
          >
            <Text style={style.feeLabel}>
              {t(`form.feeRate.${priority}`, {
                defaultValue: {
                  low: "Low",
                  medium: "Medium",
                  high: "High",
                }[priority],
              })}
            </Text>
            <Text style={style.feeValue}>
              {recommendedFees ? `${recommendedFees[priority]} sat/vB` : "—"}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          testID="FEE_PRIORITY_CUSTOM"
          accessibilityRole="radio"
          accessibilityLabel={t("form.feeRate.customAction", { defaultValue: "Custom fee" })}
          accessibilityState={{ checked: feePriority === "custom", disabled }}
          aria-checked={feePriority === "custom"}
          disabled={disabled}
          onPress={() => setFeePriority("custom")}
          style={[style.customFeeButton, feePriority === "custom" && style.selectedFeeOption]}
        >
          <Icon type="Feather" name="edit-2" style={style.customFeeIcon} />
        </TouchableOpacity>
      </View>
      {feePriority === "custom" && (
        <>
          <View style={style.customFeeRow}>
            <TextInput
              testID="INPUT_CUSTOM_FEE"
              accessibilityLabel={t("form.feeRate.customLabel", {
                defaultValue: "Custom fee in sat/vB",
              })}
              placeholder="sat/vB"
              placeholderTextColor={blixtTheme.lightGray}
              keyboardType="number-pad"
              returnKeyType="done"
              value={customFee}
              onChangeText={setCustomFee}
              editable={!disabled}
              style={style.feeRateTextInput}
            />
            <Text> sat/vB</Text>
          </View>
          {feeRate === undefined && (
            <Text style={style.feeHint}>
              {t("form.feeRate.invalid", {
                defaultValue: "Enter a whole number of at least 1 sat/vB.",
              })}
            </Text>
          )}
        </>
      )}
      {feesLoading && <Spinner color={blixtTheme.light} />}
      {feesError && (
        <>
          <Text style={style.feeHint}>
            {t("form.feeRate.unavailable", {
              defaultValue: "Could not load fees. Retry or enter a custom fee.",
            })}
          </Text>
          <Button small={true} disabled={disabled} onPress={retryFees}>
            <Text>{t("form.feeRate.retry", { defaultValue: "Retry" })}</Text>
          </Button>
        </>
      )}
    </View>
  );
}

const style = StyleSheet.create({
  feePicker: {
    flex: 1,
    maxWidth: 600,
    alignSelf: "stretch",
    flexDirection: "column",
    alignItems: "stretch",
    paddingVertical: 8,
  },
  feeOptions: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  feeOption: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: blixtTheme.gray,
  },
  selectedFeeOption: {
    borderColor: blixtTheme.primary,
    backgroundColor: blixtTheme.gray,
  },
  feeLabel: { fontSize: 15, maxWidth: "100%", textAlign: "center" },
  feeValue: { fontSize: 13, marginTop: 4, maxWidth: "100%", textAlign: "center" },
  feeHint: {
    fontSize: 13,
    color: blixtTheme.lightGray,
    marginVertical: 6,
  },
  customFeeButton: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: blixtTheme.gray,
    borderRadius: 6,
  },
  customFeeIcon: {
    fontSize: 18,
    color: blixtTheme.light,
    paddingRight: 0,
    textAlign: "center",
  },
  customFeeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  feeRateTextInput: {
    minHeight: 44,
    fontFamily: blixtTheme.fontRegular,
    fontSize: 15,
    padding: 0,
    color: blixtTheme.light,
    backgroundColor: blixtTheme.gray,
    flex: 1,
    textAlign: "center",
  },
});
