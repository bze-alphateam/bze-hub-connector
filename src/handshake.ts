/** Shared handshake state — avoids circular imports between index.ts and keplr.ts */

let handshakeComplete = false;
let hubDetected = false;
let resolvers: Array<(detected: boolean) => void> = [];

/** Wait for the handshake to complete. Used by keplr methods to delay until ready. */
export function waitForHandshake(): Promise<boolean> {
  if (handshakeComplete) return Promise.resolve(hubDetected);
  return new Promise((resolve) => {
    resolvers.push(resolve);
  });
}

/** Called by index.ts when the handshake completes or times out. */
export function resolveHandshake(detected: boolean) {
  handshakeComplete = true;
  hubDetected = detected;
  for (const resolve of resolvers) {
    resolve(detected);
  }
  resolvers = [];
}

/** Check if handshake is done. */
export function isHandshakeComplete(): boolean {
  return handshakeComplete;
}

/** Check if hub was detected. */
export function isHubDetected(): boolean {
  return hubDetected;
}
