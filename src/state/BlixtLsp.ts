import { Action, action, computed, Computed, Thunk, thunk } from "easy-peasy";
import { generateSecureRandom } from "../lndmobile/index";

import { bytesToHexString, stringToUint8Array, timeout } from "../utils";
import { IStoreModel } from "./index";

import { signMessage, subscribeChannelEvents } from "react-native-turbo-lnd";

import logger from "./../utils/log";
import {
  createDunderSignedRequest,
  DunderSignedEndpoint,
  supportsDunderSignedRequests,
} from "../utils/dunder-signed-request";
const log = logger("BlixtLsp");

type UserState = "NOT_REGISTERED" | "REGISTERED" | "WAITING_FOR_SETTLEMENT";

export interface IErrorResponse {
  status: "ERROR";
  reason: string;
}

export interface IOnDemandChannelServiceStatusResponse {
  status: boolean;
  approxFeeSat: number;
  minimumPaymentSat: number;
  peer: string;
  /**
   * How requests may be signed: absent or 1 = a fixed word ("REGISTER", ...),
   * 2 = a signed JSON message (see utils/dunder-signed-request.ts).
   */
  requestSigningVersion?: number;
}

/** Legacy register body. Newer servers get a signed message instead. */
export interface IOnDemandChannelRegisterRequest {
  pubkey: string;
  signature: string; // Message has to be REGISTER base64
  preimage: string;
  amountSat: number;
}

export interface IOnDemandChannelRegisterOkResponse {
  status: "OK";
  servicePubkey: string;
  fakeChannelId: string;
  cltvExpiryDelta: number;
  feeBaseMsat: number;
  feeProportionalMillionths: number;
}

export interface IOnDemandChannelCheckStatusRequest {
  pubkey: string;
  signature: string;
}

export interface IOnDemandChannelCheckStatusResponse {
  state: UserState;
  unclaimedAmountSat: number;
}

export interface IOnDemandChannelClaimRequest {
  pubkey: string;
  signature: string; // Message has to be REGISTER base64
}

export interface IOnDemandChannelClaimResponse {
  status: "OK";
  amountSat: number;
}

export interface IOnDemandChannelRegisterErrorResponse extends IErrorResponse {}
export interface IOnDemandChannelUnknownRequestResponse extends IErrorResponse {}

export interface IOndemandChannel {
  checkOndemandChannelService: Thunk<IOndemandChannel, void, any>;
  connectToService: Thunk<
    IOndemandChannel,
    undefined,
    any,
    IStoreModel,
    Promise<boolean>
  >;
  addInvoice: Thunk<
    IOndemandChannel,
    { sat: number; description: string; preimage?: Uint8Array },
    any,
    IStoreModel
  >;

  serviceStatus: Thunk<
    IOndemandChannel,
    void,
    any,
    IStoreModel,
    Promise<IOnDemandChannelServiceStatusResponse>
  >;
  /** The cached service status if it advertises signed requests, otherwise a fresh one. */
  getStatusForSigning: Thunk<
    IOndemandChannel,
    void,
    any,
    IStoreModel,
    Promise<IOnDemandChannelServiceStatusResponse | null>
  >;
  checkStatus: Thunk<
    IOndemandChannel,
    void,
    any,
    IStoreModel,
    Promise<IOnDemandChannelCheckStatusResponse>
  >;
  register: Thunk<
    IOndemandChannel,
    { preimage: Uint8Array; amount: number },
    any,
    IStoreModel,
    Promise<IOnDemandChannelRegisterOkResponse>
  >;
  claim: Thunk<
    IOndemandChannel,
    void,
    any,
    IStoreModel,
    Promise<IOnDemandChannelRegisterOkResponse>
  >;

  registerInvoicePreimage: Uint8Array | null;
  setRegisterInvoicePreimage: Action<IOndemandChannel, Uint8Array | null>;

  setStatus: Action<IOndemandChannel, IOnDemandChannelServiceStatusResponse | null>;

  status: IOnDemandChannelServiceStatusResponse | null;
  serviceActive: Computed<IOndemandChannel, boolean>;
}

/**
 * Builds the JSON body for a signed Dunder request. Uses the signed-message
 * format when the server advertises it (see utils/dunder-signed-request.ts),
 * otherwise the legacy format where only a fixed word is signed.
 */
async function createDunderRequestBody(
  dunderServer: string,
  pubkey: string,
  status: IOnDemandChannelServiceStatusResponse | null,
  endpoint: DunderSignedEndpoint,
  legacyMessage: string,
  data: Record<string, unknown>,
): Promise<string> {
  if (supportsDunderSignedRequests(status)) {
    const body = await createDunderSignedRequest({
      server: dunderServer,
      endpoint,
      pubkey,
      data,
      sign: async (message) => (await signMessage({ msg: stringToUint8Array(message) })).signature,
      randomHex: async () => bytesToHexString(await generateSecureRandom(16)),
    });
    return JSON.stringify(body);
  }

  const signMessageResult = await signMessage({ msg: stringToUint8Array(legacyMessage) });
  return JSON.stringify({
    pubkey,
    signature: signMessageResult.signature,
    ...data,
  });
}

export interface IBlixtLsp {
  initialize: Thunk<IBlixtLsp, void, any, IStoreModel>;

  // On-demand Channels
  ondemandChannel: IOndemandChannel;
}

export const blixtLsp: IBlixtLsp = {
  initialize: thunk(async (actions, _, { getState, getStoreState, getStoreActions }) => {
    log.d("Initializing");

    subscribeChannelEvents(
      {},
      (_channelEvent) => {
        log.d("SubscribeChannelEvents");

        // This code isn't very good:
        const registerInvoicePreimage = getState().ondemandChannel.registerInvoicePreimage;
        if (registerInvoicePreimage) {
          log.d("Has registerInvoicePreimage");
          const tx = getStoreState().transaction.getTransactionByPreimage(registerInvoicePreimage);
          if (!tx) {
            log.e("Couldn't find transaction while attempting to settle BlixtLSP invoice", [tx]);
            return;
          }
          tx.status = "SETTLED";
          getStoreActions().transaction.syncTransaction(tx);
          log.i("tx should be synced");
          actions.ondemandChannel.setRegisterInvoicePreimage(null);
        }
      },
      (error) => {
        log.e("Got error from subscribeChannelEvents", [error]);
      },
    );
  }),

  ondemandChannel: {
    checkOndemandChannelService: thunk(async (actions) => {
      try {
        const serviceStatus = await actions.serviceStatus();
        log.i("serviceStatus", [serviceStatus]);
        actions.setStatus(serviceStatus);
      } catch (error) {
        log.w("checkOndemandChannelService failed", [error]);
        actions.setStatus(null);
      }
    }),
    // Requests
    serviceStatus: thunk(async (_, _2, { getStoreState }) => {
      log.i("serviceStatus");
      const dunderServer = getStoreState().settings.dunderServer;
      return (await fetch(`${dunderServer}/ondemand-channel/service-status`)).json();
    }),

    getStatusForSigning: thunk(async (actions, _, { getState }) => {
      const cached = getState().status;
      if (supportsDunderSignedRequests(cached)) {
        return cached;
      }
      try {
        const fresh = await actions.serviceStatus();
        actions.setStatus(fresh);
        return fresh;
      } catch (error) {
        log.w("Could not fetch Dunder service status, using legacy signatures", [error]);
        return null;
      }
    }),

    checkStatus: thunk(async (actions, _2, { getStoreState }) => {
      log.i("checkStatus");
      const dunderServer = getStoreState().settings.dunderServer;

      const request = await createDunderRequestBody(
        dunderServer,
        getStoreState().lightning.nodeInfo?.identityPubkey!,
        await actions.getStatusForSigning(),
        "/ondemand-channel/check-status",
        "CHECKSTATUS",
        {},
      );

      return (
        await fetch(`${dunderServer}/ondemand-channel/check-status`, {
          body: request,
          method: "POST",
        })
      ).json();
    }),

    connectToService: thunk(async (actions, _, { getStoreActions }) => {
      const result = await actions.serviceStatus();
      log.d("serviceStatus", [result]);

      let connectToPeer = false;
      let attempt = 3;
      while (attempt--) {
        try {
          connectToPeer = !!(await getStoreActions().lightning.connectPeer(result.peer));
        } catch (e: any) {
          if (!e.message.includes("already connected to peer")) {
            log.i(`Failed to connect: ${e.message}.`);
            await timeout(1000);
          } else {
            connectToPeer = true;
            break;
          }
        }
      }
      return connectToPeer;
    }),

    addInvoice: thunk(async (actions, { sat, description, preimage }, { getStoreActions }) => {
      if (!preimage) {
        preimage = await generateSecureRandom(32);
      }
      const result = await actions.register({
        preimage,
        amount: sat,
      });
      console.log(result);

      const invoice = await getStoreActions().receive.addInvoiceBlixtLsp({
        sat,
        preimage,
        chanId: result.fakeChannelId,
        cltvExpiryDelta: result.cltvExpiryDelta,
        feeBaseMsat: result.feeBaseMsat,
        feeProportionalMillionths: result.feeProportionalMillionths,
        description,
        servicePubkey: result.servicePubkey,
      });
      console.log(invoice);
      return invoice;
    }),

    register: thunk(async (actions, { preimage, amount }, { getStoreState }) => {
      log.i("register");
      const dunderServer = getStoreState().settings.dunderServer;
      const request = await createDunderRequestBody(
        dunderServer,
        getStoreState().lightning.nodeInfo?.identityPubkey!,
        await actions.getStatusForSigning(),
        "/ondemand-channel/register",
        "REGISTER",
        {
          preimage: bytesToHexString(preimage),
          amountSat: amount,
        },
      );

      actions.setRegisterInvoicePreimage(preimage);

      const result = await fetch(`${dunderServer}/ondemand-channel/register`, {
        body: request,
        method: "POST",
      });
      const json = await result.json();
      if (json.status === "ERROR") {
        throw new Error(json.reason);
      }
      return json;
    }),

    claim: thunk(async (actions, _2, { getStoreState }) => {
      log.i("claim");
      const dunderServer = getStoreState().settings.dunderServer;

      const request = await createDunderRequestBody(
        dunderServer,
        getStoreState().lightning.nodeInfo?.identityPubkey!,
        await actions.getStatusForSigning(),
        "/ondemand-channel/claim",
        "CLAIM",
        {},
      );

      return (
        await fetch(`${dunderServer}/ondemand-channel/claim`, {
          body: request,
          method: "POST",
        })
      ).json();
    }),

    setRegisterInvoicePreimage: action((store, payload) => {
      store.registerInvoicePreimage = payload;
    }),

    setStatus: action((store, payload) => {
      store.status = payload;
    }),

    registerInvoicePreimage: null,
    status: null,
    serviceActive: computed((store) => store.status?.status === true),
  },
};
