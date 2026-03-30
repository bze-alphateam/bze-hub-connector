import { sendToHub } from "./bridge";
import type { Key, OfflineSigner, OfflineAminoSigner } from "./types";

/** Create and install the Keplr-compatible API on window */
export function installKeplr() {
  const keplr = {
    async enable(chainId: string): Promise<void> {
      await sendToHub("enable", [chainId]);
    },

    async getKey(chainId: string): Promise<Key> {
      const result = (await sendToHub("getKey", [chainId])) as Key;
      // Ensure pubKey and address are Uint8Array (they arrive as arrays over postMessage)
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
      return sendToHub("signDirect", [chainId, signer, signDoc]);
    },

    async signAmino(
      chainId: string,
      signer: string,
      signDoc: unknown
    ): Promise<unknown> {
      return sendToHub("signAmino", [chainId, signer, signDoc]);
    },

    async experimentalSuggestChain(chainInfo: unknown): Promise<void> {
      await sendToHub("suggestChain", [chainInfo]);
    },

    async signArbitrary(
      chainId: string,
      signer: string,
      data: string
    ): Promise<unknown> {
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

  // Install on window
  (window as any).keplr = keplr;
  (window as any).getOfflineSigner = keplr.getOfflineSigner.bind(keplr);
  (window as any).getOfflineSignerOnlyAmino =
    keplr.getOfflineSignerOnlyAmino.bind(keplr);
}
