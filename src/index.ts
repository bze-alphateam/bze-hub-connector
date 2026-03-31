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
import { resolveHandshake, isHubDetected, isHandshakeComplete, subscribeHandshake } from "./handshake";

let hubConfig: HubConfig | null = null;

/**
 * Initialize the BZE Hub connector.
 *
 * Call this once at app startup (before React mounts if possible).
 * If running inside BZE Hub, it:
 *   - Creates window.keplr IMMEDIATELY (so wallet libraries detect it)
 *   - Performs a handshake with the Hub shell
 *   - Writes proxy endpoints to localStorage
 *   - Listens for account/endpoint changes from the Hub shell
 *
 * If NOT running inside BZE Hub, it does nothing.
 *
 * @returns A promise that resolves to true if running in Hub, false otherwise.
 */
export async function initHubConnector(): Promise<boolean> {
  // SSR guard
  if (typeof window === "undefined") return false;

  // Not in an iframe? Not in Hub.
  if (window.parent === window) {
    resolveHandshake(false);
    return false;
  }

  // Already initialized?
  if (isHandshakeComplete()) return isHubDetected();

  // Install window.keplr IMMEDIATELY so wallet libraries detect it on scan.
  // The keplr methods internally wait for the handshake before sending requests.
  installKeplr();

  // Dispatch keplr_keystorechange so libraries re-check for keplr
  window.dispatchEvent(new Event("keplr_keystorechange"));

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      // Handshake failed — remove the placeholder keplr
      delete (window as any).keplr;
      delete (window as any).getOfflineSigner;
      delete (window as any).getOfflineSignerOnlyAmino;
      resolveHandshake(false);
      resolve(false);
    }, 500);

    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === MSG_HANDSHAKE_ACK && data.config) {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);

        const config = data.config as HubConfig;

        if (!config.chainId || !config.proxyRest || !config.proxyRpc) {
          console.warn("[hub-connector] invalid handshake config, ignoring");
          delete (window as any).keplr;
          resolveHandshake(false);
          resolve(false);
          return;
        }

        hubConfig = config;

        // Write proxy endpoints to localStorage
        writeEndpointsToStorage(config);

        // Set up persistent listener
        setupPersistentListener();

        // Signal that keplr is ready with real data
        window.dispatchEvent(new Event("keplr_keystorechange"));

        console.log(
          `[hub-connector] connected to BZE Hub (chain: ${config.chainId}, address: ${config.activeAddress})`
        );

        resolveHandshake(true);
        resolve(true);
      }
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: MSG_HANDSHAKE }, "*");
  });
}

/**
 * Check if currently running inside BZE Hub.
 */
export function isInHub(): boolean {
  if (typeof window === "undefined") return false;
  return isHubDetected();
}

/**
 * Get the Hub configuration (only available after successful init).
 */
export function getHubConfig(): HubConfig | null {
  return hubConfig;
}

// --- Persistent listener ---

function setupPersistentListener() {
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;

    if (isBridgeResponse(data)) {
      handleBridgeResponse(data);
      return;
    }

    if (data.type === MSG_ACCOUNT_CHANGED) {
      window.dispatchEvent(new Event("keplr_keystorechange"));
      return;
    }

    if (data.type === MSG_ENDPOINTS_CHANGED && hubConfig && data.endpoints) {
      hubConfig.proxyRest = data.endpoints.proxyRest || hubConfig.proxyRest;
      hubConfig.proxyRpc = data.endpoints.proxyRpc || hubConfig.proxyRpc;
      writeEndpointsToStorage(hubConfig);
      window.dispatchEvent(new Event("keplr_keystorechange"));
      return;
    }

    if (data.type === MSG_THEME_CHANGED && data.theme) {
      window.dispatchEvent(
        new CustomEvent("bze-hub:theme-changed", { detail: data.theme })
      );
      return;
    }
  });
}

// --- React hook ---

import { useSyncExternalStore } from "react";

/**
 * React hook that returns `true` when the app is running inside BZE Hub.
 *
 * Unlike the static `isInHub()`, this hook triggers a re-render when the
 * handshake resolves, so components always reflect the correct state.
 */
export function useIsInHub(): boolean {
  return useSyncExternalStore(
    subscribeHandshake,
    // Client snapshot
    () => isHubDetected(),
    // Server snapshot (SSR)
    () => false,
  );
}

export type { HubConfig, Key, OfflineSigner, OfflineAminoSigner } from "./types";
