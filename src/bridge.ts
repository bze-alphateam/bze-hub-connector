import { MSG_BRIDGE_REQUEST, MSG_BRIDGE_RESPONSE } from "./types";

let messageId = 0;
const pendingRequests = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (reason: Error) => void }
>();

/** Send a request to the Hub shell and wait for a response */
export function sendToHub(method: string, params: unknown[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = `hub-${++messageId}`;
    pendingRequests.set(id, { resolve, reject });

    window.parent.postMessage(
      {
        type: MSG_BRIDGE_REQUEST,
        id,
        method,
        params,
      },
      "*"
    );

    // Timeout after 120 seconds (signing may need user approval)
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error("BZE Hub bridge request timed out"));
      }
    }, 120_000);
  });
}

/** Handle responses from the Hub shell */
export function handleBridgeResponse(data: {
  type: string;
  id: string;
  result?: unknown;
  error?: string;
}) {
  const pending = pendingRequests.get(data.id);
  if (!pending) return;

  pendingRequests.delete(data.id);
  if (data.error) {
    pending.reject(new Error(data.error));
  } else {
    pending.resolve(data.result);
  }
}

/** Check if a message is a bridge response */
export function isBridgeResponse(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>).type === MSG_BRIDGE_RESPONSE
  );
}
