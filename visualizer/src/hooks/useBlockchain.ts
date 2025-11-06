import { useState, useEffect } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';

export interface BlockchainState {
  api: ApiPromise | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  currentBlock: number;
}

export function useBlockchain(rpcUrl: string = 'ws://156.67.24.161:9944') {
  const [state, setState] = useState<BlockchainState>({
    api: null,
    isConnected: false,
    isConnecting: true,
    error: null,
    currentBlock: 0,
  });

  useEffect(() => {
    let api: ApiPromise | null = null;
    let unsubscribeNewHeads: (() => void) | null = null;

    async function connect() {
      try {
        setState(prev => ({ ...prev, isConnecting: true, error: null }));

        // Create provider
        const provider = new WsProvider(rpcUrl);

        // Create API instance
        api = await ApiPromise.create({ provider });

        // Wait for API to be ready
        await api.isReady;

        console.log('✅ Connected to Bittensor RPC:', rpcUrl);

        // Subscribe to new block headers
        unsubscribeNewHeads = await api.rpc.chain.subscribeNewHeads((header) => {
          const blockNumber = header.number.toNumber();
          setState(prev => ({
            ...prev,
            currentBlock: blockNumber,
          }));
        });

        setState(prev => ({
          ...prev,
          api,
          isConnected: true,
          isConnecting: false,
        }));
      } catch (err) {
        console.error('❌ Failed to connect to RPC:', err);
        setState(prev => ({
          ...prev,
          api: null,
          isConnected: false,
          isConnecting: false,
          error: err instanceof Error ? err.message : 'Failed to connect',
        }));
      }
    }

    connect();

    // Cleanup function
    return () => {
      if (unsubscribeNewHeads) {
        unsubscribeNewHeads();
      }
      if (api) {
        api.disconnect();
      }
    };
  }, [rpcUrl]);

  return state;
}
