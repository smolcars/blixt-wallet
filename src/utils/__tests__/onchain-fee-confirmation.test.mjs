import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { transformFileSync } from "@babel/core";
import React from "react";
import { act, create } from "react-test-renderer";
import * as feeUtils from "../onchain-fees.ts";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Exercise the real screens and fee hook without loading native UI or LND.
function loadComponent(relativePath, dependencies) {
  const filename = fileURLToPath(new URL(relativePath, import.meta.url));
  const { code } = transformFileSync(filename, {
    configFile: false,
    babelrc: false,
    presets: ["@babel/preset-typescript", "@babel/preset-react"],
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });
  const module = { exports: {} };
  const requireMock = (name) => {
    const key = name.split("/").at(-1);
    assert.ok(key in dependencies, `Missing test dependency: ${name}`);
    return dependencies[key];
  };
  new Function("require", "module", "exports", code)(requireMock, module, module.exports);
  return module.exports.default;
}

for (const screen of ["Withdraw", "OpenChannel"]) {
  for (const allFunds of [false, true]) {
    for (const source of ["medium", "custom"]) {
      test(`${screen}, ${allFunds ? "all funds" : "fixed amount"}, ${source}: requires approval before submitting`, async (t) => {
        const submissions = [];
        const prompts = [];
        const submit = (kind) => async (args) => submissions.push({ kind, args });
        const actions = {
          onChain: {
            sendCoins: submit("send"),
            sendCoinsAll: submit("sendAll"),
            getBalance: async () => {},
          },
          channel: {
            connectAndOpenChannel: submit("open"),
            connectAndOpenChannelAll: submit("openAll"),
            getChannels: async () => {},
          },
          settings: { changeTorEnabled: async () => {} },
        };
        const store = {
          settings: { onchainFeeServer: "https://fees.example/api", bitcoinUnit: "satoshi" },
          onChain: { balance: 1000000n },
        };
        const dependencies = {
          react: React,
          "react-native": { useWindowDimensions: () => ({ width: 400, fontScale: 1 }) },
          "native-base": { Container: "Container", Text: "Text", Spinner: "Spinner" },
          "react-i18next": {
            useTranslation: () => ({
              t: (key, options) =>
                (options?.defaultValue ?? key).replace("{{feeRate}}", options?.feeRate),
            }),
          },
          "i18n.constants": { namespaces: { onchain: {}, lightningInfo: {} } },
          store: {
            useStoreActions: (select) => select(actions),
            useStoreState: (select) => select(store),
          },
          "onchain-fees": {
            ...feeUtils,
            fetchRecommendedFees: async () => ({ low: 1, medium: 10000, high: 20000 }),
          },
          alert: {
            Alert: {
              promiseAlert: (title, message, buttons) =>
                new Promise((resolve) => {
                  prompts.push({ title, message, buttons, resolve });
                }),
            },
          },
          Button: { Button: "Button" },
          Form: "Form",
          Input: "Input",
          OnchainFeePicker: "FeePicker",
          commonColor: { blixtTheme: {} },
          constants: { PLATFORM: "macos" },
          utils: { toast: () => {} },
          "bitcoin-units": { BitcoinUnits: { satoshi: { nice: "sat" } } },
          useBalance: () => ({ bitcoinUnit: { nice: "sat" }, satoshiValue: 100000n }),
          useFormatBitcoinValue: () => String,
          lightning_pb: { CommitmentType: {} },
          "restart-app": {},
        };
        dependencies.useOnchainFee = loadComponent("../../hooks/useOnchainFee.ts", dependencies);
        const path = screen === "Withdraw" ? "OnChain/Withdraw" : "LightningInfo/OpenChannel";
        const Component = loadComponent(`../../windows/${path}.tsx`, dependencies);
        let renderer;
        await act(async () => {
          renderer = create(
            React.createElement(Component, {
              navigation: { setOptions() {}, pop() {} },
              route: {},
            }),
          );
        });
        t.after(() => act(() => renderer.unmount()));
        const form = () => renderer.root.findByType("Form").props;
        if (source === "custom") {
          act(() => {
            const fee = form().items.find(({ key }) => key === "SAT").component.props.fee;
            fee.setFeePriority("custom");
            fee.setCustomFee("15000");
          });
        }
        if (allFunds) {
          act(() => {
            const amount = form().items.find(({ key }) => key === "AMOUNT").component;
            amount.props.children[1].props.onPress();
          });
        }
        let pending;
        act(() => {
          const press = form().buttons[0].props.onPress;
          pending = press();
          void press(); // A second tap must not open another prompt or send.
        });
        assert.equal(prompts.length, 1);
        assert.equal(submissions.length, 0);
        assert.equal(form().buttons[0].props.disabled, true);
        const rate = source === "medium" ? 10000 : 15000;
        assert.ok(prompts[0].message.includes(`${rate} sat/vB`));
        await act(async () => {
          prompts[0].resolve(prompts[0].buttons.find(({ style }) => style === "cancel"));
          await pending;
        });
        assert.equal(submissions.length, 0);
        assert.equal(form().buttons[0].props.disabled, false);

        act(() => {
          pending = form().buttons[0].props.onPress();
        });
        assert.equal(prompts.length, 2);
        assert.equal(submissions.length, 0);
        await act(async () => {
          prompts[1].resolve(prompts[1].buttons.find(({ style }) => style === "destructive"));
          await pending;
        });
        assert.equal(submissions.length, 1);
        const expected = screen === "Withdraw" ? "send" : "open";
        assert.equal(submissions[0].kind, expected + (allFunds ? "All" : ""));
        assert.equal(submissions[0].args[screen === "Withdraw" ? "feeRate" : "feeRateSat"], rate);
      });
    }
  }
}
