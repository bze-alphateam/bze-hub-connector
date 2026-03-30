import { sendToHub } from "./bridge";
import { waitForHandshake } from "./handshake";
import type { Key, OfflineSigner, OfflineAminoSigner } from "./types";

/** Ensure handshake is done before any bridge call */
async function ensureReady(): Promise<void> {
  const detected = await waitForHandshake();
  if (!detected) {
    throw new Error("Not connected to BZE Hub");
  }
}

/** Create and install the Keplr-compatible API on window */
export function installKeplr() {
  const keplr = {
    async enable(chainId: string): Promise<void> {
      await ensureReady();
      await sendToHub("enable", [chainId]);
    },

    async getKey(chainId: string): Promise<Key> {
      await ensureReady();
      const result = (await sendToHub("getKey", [chainId])) as Key;
      if (result.pubKey && Array.isArray(result.pubKey)) {
        result.pubKey = new Uint8Array(result.pubKey);
      }
      if (result.address && Array.isArray(result.address)) {
        result.address = new Uint8Array(result.address);
      }
      return result;
    },

    async getOfflineSigner(chainId: string): Promise<OfflineSigner> {
      return {
        async getAccounts() {
          const key = await keplr.getKey(chainId);
          return [
            {
              address: key.bech32Address,
              pubkey: key.pubKey,
              algo: "secp256k1" as const,
            },
          ];
        },
        async signDirect(signerAddress: string, signDoc: unknown) {
          return sendToHub("signDirect", [chainId, signerAddress, signDoc]);
        },
        async signAmino(signerAddress: string, signDoc: unknown) {
          return sendToHub("signAmino", [chainId, signerAddress, signDoc]);
        },
      };
    },

    async getOfflineSignerOnlyAmino(
      chainId: string
    ): Promise<OfflineAminoSigner> {
      return {
        async getAccounts() {
          const key = await keplr.getKey(chainId);
          return [
            {
              address: key.bech32Address,
              pubkey: key.pubKey,
              algo: "secp256k1" as const,
            },
          ];
        },
        async signAmino(signerAddress: string, signDoc: unknown) {
          return sendToHub("signAmino", [chainId, signerAddress, signDoc]);
        },
      };
    },

    async signDirect(
      chainId: string,
      signer: string,
      signDoc: unknown
    ): Promise<unknown> {
      await ensureReady();
      return sendToHub("signDirect", [chainId, signer, signDoc]);
    },

    async signAmino(
      chainId: string,
      signer: string,
      signDoc: unknown
    ): Promise<unknown> {
      await ensureReady();
      return sendToHub("signAmino", [chainId, signer, signDoc]);
    },

    async experimentalSuggestChain(chainInfo: unknown): Promise<void> {
      await ensureReady();
      await sendToHub("suggestChain", [chainInfo]);
    },

    async signArbitrary(
      chainId: string,
      signer: string,
      data: string
    ): Promise<unknown> {
      await ensureReady();
      return sendToHub("signArbitrary", [chainId, signer, data]);
    },

    defaultOptions: {
      sign: {
        preferNoSetFee: false,
        preferNoSetMemo: true,
        disableBalanceCheck: false,
      },
    },
  };

  (window as any).keplr = keplr;
  (window as any).getOfflineSigner = keplr.getOfflineSigner.bind(keplr);
  (window as any).getOfflineSignerOnlyAmino =
    keplr.getOfflineSignerOnlyAmino.bind(keplr);
}
