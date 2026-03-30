# @bze/hub-connector

Connect any Cosmos dApp to [BZE Hub](https://github.com/bze-alphateam/bze-hub) — the BeeZee desktop wallet and node manager.

When your dApp runs inside BZE Hub, this library automatically creates a Keplr-compatible `window.keplr` API that delegates signing to the Hub's secure wallet. When running outside the Hub (normal browser), it does nothing.

## Installation

```bash
npm install @bze/hub-connector
```

## Usage

Call `initHubConnector()` once at app startup, before your wallet provider initializes:

```typescript
import { initHubConnector } from '@bze/hub-connector';

// Call early in your app's entry point
initHubConnector();
```

That's it. If the dApp is running inside BZE Hub:
- `window.keplr` is created automatically
- Wallet libraries (@interchain-kit, CosmJS, etc.) detect it as Keplr
- Signing requests are routed to the Hub's wallet via postMessage
- REST/RPC endpoints are set to the Hub's local proxy

If the dApp is NOT in BZE Hub, nothing happens — your existing Keplr/Leap integration works as usual.

## API

### `initHubConnector(): Promise<boolean>`

Initialize the connector. Returns `true` if running in BZE Hub, `false` otherwise.

### `isInHub(): boolean`

Synchronous check. Returns `false` until `initHubConnector()` completes.

### `getHubConfig(): HubConfig | null`

Get the Hub configuration (chain ID, proxy ports, active address). Returns `null` if not in Hub.

## What it does

1. Detects if running in a BZE Hub iframe (500ms handshake timeout)
2. Creates `window.keplr` with full Keplr API compatibility
3. Routes all signing calls to the Hub's Go wallet backend via postMessage
4. Writes the Hub's proxy endpoints to localStorage (so your REST client uses the local node)
5. Listens for account/endpoint changes from the Hub shell

## Keplr API Coverage

- `enable(chainId)`
- `getKey(chainId)`
- `getOfflineSigner(chainId)`
- `getOfflineSignerOnlyAmino(chainId)`
- `signDirect(chainId, signer, signDoc)`
- `signAmino(chainId, signer, signDoc)`
- `experimentalSuggestChain(chainInfo)`
- `signArbitrary(chainId, signer, data)`
