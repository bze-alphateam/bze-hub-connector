import {
  MSG_HANDSHAKE,
  MSG_HANDSHAKE_ACK,
  MSG_ACCOUNT_CHANGED,
  MSG_ENDPOINTS_CHANGED,
  MSG_THEME_CHANGED,
  type HubConfig,
} from "./types";
import { handleBridgeResponse, isBridgeResponse } from "./bridge";
import { installKeplr } from "./keplr";
import { writeEndpointsToStorage } from "./storage";

let hubDetected = false;
let hubConfig: HubConfig | null = null;

/**
 * Initialize the BZE Hub connector.
 *
 * Call this once at app startup (before React mounts if possible).
 * If running inside BZE Hub, it:
 *   - Creates window.keplr (Keplr-compatible wallet API)
 *   - Writes proxy endpoints to localStorage
 *   - Listens for account/endpoint changes from the Hub shell
 *
 * If NOT running inside BZE Hub, it does nothing.
 *
 * @returns A promise that resolves to true if running in Hub, false otherwise.
 *
 * @example
 * ```ts
 * import { initHubConnector } from '@bze/hub-connector';
 * initHubConnector();
 * ```
 */
export async function initHubConnector(): Promise<boolean> {
  // SSR guard — do nothing on server
  if (typeof window === "undefined") return false;

  // Not in an iframe? Not in Hub.
  if (window.parent === window) return false;

  // Already initialized?
  if (hubDetected) return true;

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve(false);
    }, 500);

    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      // Handshake response
      if (data.type === MSG_HANDSHAKE_ACK && data.config) {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);

        const config = data.config as HubConfig;

        // Sanity check — is this a valid Hub config?
        if (!config.chainId || !config.proxyRest || !config.proxyRpc) {
          console.warn("[hub-connector] invalid handshake config, ignoring");
          resolve(false);
          return;
        }

        hubDetected = true;
        hubConfig = config;

        // Install Keplr bridge
        installKeplr();

        // Write proxy endpoints to localStorage
        writeEndpointsToStorage(config);

        // Set up persistent listener for ongoing messages
        setupPersistentListener();

        // Signal that Keplr is available
        window.dispatchEvent(new Event("keplr_keystorechange"));

        console.log(
          `[hub-connector] connected to BZE Hub (chain: ${config.chainId}, address: ${config.activeAddress})`
        );

        resolve(true);
      }
    }

    window.addEventListener("message", onMessage);

    // Send handshake
    window.parent.postMessage({ type: MSG_HANDSHAKE }, "*");
  });
}

/**
 * Check if currently running inside BZE Hub.
 * Returns false until initHubConnector() completes successfully.
 */
export function isInHub(): boolean {
  if (typeof window === "undefined") return false;
  return hubDetected;
}

/**
 * Get the Hub configuration (only available after successful init).
 * Returns null if not in Hub.
 */
export function getHubConfig(): HubConfig | null {
  return hubConfig;
}

// --- Persistent listener for ongoing communication ---

function setupPersistentListener() {
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;

    // Bridge responses (for signing, getKey, etc.)
    if (isBridgeResponse(data)) {
      handleBridgeResponse(data);
      return;
    }

    // Account changed
    if (data.type === MSG_ACCOUNT_CHANGED) {
      window.dispatchEvent(new Event("keplr_keystorechange"));
      return;
    }

    // Endpoints changed (node synced/desynced)
    if (data.type === MSG_ENDPOINTS_CHANGED && hubConfig && data.endpoints) {
      hubConfig.proxyRest = data.endpoints.proxyRest || hubConfig.proxyRest;
      hubConfig.proxyRpc = data.endpoints.proxyRpc || hubConfig.proxyRpc;
      writeEndpointsToStorage(hubConfig);
      window.dispatchEvent(new Event("keplr_keystorechange"));
      return;
    }

    // Theme changed
    if (data.type === MSG_THEME_CHANGED && data.theme) {
      // Emit a custom event that the dApp can listen for
      window.dispatchEvent(
        new CustomEvent("bze-hub:theme-changed", { detail: data.theme })
      );
      return;
    }
  });
}

// Re-export types for consumers
export type { HubConfig, Key, OfflineSigner, OfflineAminoSigner } from "./types";
