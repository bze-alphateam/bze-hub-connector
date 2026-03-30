/** Configuration received from the Hub shell during handshake */
export interface HubConfig {
  chainId: string;
  storageKeyVersion: string;
  proxyRest: number;
  proxyRpc: number;
  activeAddress: string;
  activeLabel: string;
}

/** Keplr Key structure */
export interface Key {
  name: string;
  algo: string;
  pubKey: Uint8Array;
  address: Uint8Array;
  bech32Address: string;
  isNanoLedger: boolean;
  isKeystone: boolean;
}

/** Keplr-compatible offline signer */
export interface OfflineSigner {
  getAccounts(): Promise<{ address: string; pubkey: Uint8Array; algo: string }[]>;
  signDirect(signerAddress: string, signDoc: unknown): Promise<unknown>;
  signAmino(signerAddress: string, signDoc: unknown): Promise<unknown>;
}

/** Keplr-compatible amino-only signer */
export interface OfflineAminoSigner {
  getAccounts(): Promise<{ address: string; pubkey: Uint8Array; algo: string }[]>;
  signAmino(signerAddress: string, signDoc: unknown): Promise<unknown>;
}

// --- postMessage protocol ---

export const MSG_HANDSHAKE = "bze-hub:handshake";
export const MSG_HANDSHAKE_ACK = "bze-hub:handshake-ack";
export const MSG_BRIDGE_REQUEST = "bze-hub:bridge-request";
export const MSG_BRIDGE_RESPONSE = "bze-hub:bridge-response";
export const MSG_ACCOUNT_CHANGED = "bze-hub:account-changed";
export const MSG_ENDPOINTS_CHANGED = "bze-hub:endpoints-changed";
export const MSG_THEME_CHANGED = "bze-hub:theme-changed";
