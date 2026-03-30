import type { HubConfig } from "./types";

/**
 * Write the Hub proxy endpoints to localStorage in the format bze-ui-kit expects.
 * This ensures the dApp's getSettings() reads the proxy URLs instead of public endpoints.
 *
 * Key format: {storageKeyVersion}-{chainId}:bze_app_settings
 * Value format: { data: JSON.stringify(settings), expiry: 0 }
 */
export function writeEndpointsToStorage(config: HubConfig) {
  const key = `${config.storageKeyVersion}-${config.chainId}:bze_app_settings`;

  const settings = {
    endpoints: {
      restEndpoint: `http://localhost:${config.proxyRest}`,
      rpcEndpoint: `http://localhost:${config.proxyRpc}`,
    },
    preferredFeeDenom: "ubze",
  };

  const wrapped = {
    data: JSON.stringify(settings),
    expiry: 0,
  };

  try {
    localStorage.setItem(key, JSON.stringify(wrapped));
  } catch (e) {
    console.warn("[hub-connector] failed to write endpoints to localStorage:", e);
  }
}
