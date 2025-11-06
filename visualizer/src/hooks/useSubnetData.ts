import { useState, useEffect } from 'react';
import { ApiPromise } from '@polkadot/api';

export interface SubnetData {
  netuid: number;
  taoPool: number;
  alphaIn: number;
  alphaOut: number;
  alphaPool: number;
  price: number;
  movingPrice: number;
  pendingEmission: number;
  flowBased: boolean;
  subtokenEnabled: boolean;
  volume24h: number;
  flowEMA: number;
}

export interface SubnetDataState {
  subnets: SubnetData[];
  isLoading: boolean;
  error: string | null;
  totalSubnets: number;
}

const RAO_DECIMALS = 1e9; // 1 TAO = 1e9 Rao

export function useSubnetData(api: ApiPromise | null, currentBlock: number) {
  const [state, setState] = useState<SubnetDataState>({
    subnets: [],
    isLoading: true,
    error: null,
    totalSubnets: 0,
  });

  useEffect(() => {
    if (!api || !api.isConnected) {
      return;
    }

    async function fetchSubnetData() {
      if (!api) return;

      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Get total number of networks
        const totalNets = await api.query.subtensorModule.totalNetworks();
        const totalSubnets = Number(totalNets.toString());

        // Fetch data for all subnets
        const subnetsData: SubnetData[] = [];

        for (let netuid = 0; netuid < totalSubnets; netuid++) {
          try {
            // Query subnet data in parallel
            const [
              tao,
              alphaIn,
              alphaOut,
              pending,
              flowBased,
              subtokenEnabled,
              movingPrice,
              flowEMA,
            ] = await Promise.all([
              api.query.subtensorModule.subnetTAO(netuid),
              api.query.subtensorModule.subnetAlphaIn(netuid),
              api.query.subtensorModule.subnetAlphaOut(netuid),
              api.query.subtensorModule.pendingEmission(netuid),
              api.query.subtensorModule.flowBasedEmissionsEnabled(netuid),
              api.query.subtensorModule.subtokenEnabled(netuid),
              api.query.subtensorModule.subnetMovingPrice(netuid),
              api.query.subtensorModule.subnetFlowEMA(netuid),
            ]);

            // Convert from Rao to TAO
            const taoPool = Number(tao.toString()) / RAO_DECIMALS;
            const alphaInValue = Number(alphaIn.toString()) / RAO_DECIMALS;
            const alphaOutValue = Number(alphaOut.toString()) / RAO_DECIMALS;
            const alphaPool = alphaInValue - alphaOutValue;

            // Calculate price (TAO per Alpha)
            const price = alphaPool > 0 ? taoPool / alphaPool : 0;

            // Parse moving price (I96F32 format)
            const movingPriceValue = parseI96F32(movingPrice.toString());

            // Parse flow EMA (I96F32 format)
            const flowEMAValue = parseI96F32(flowEMA.toString());

            subnetsData.push({
              netuid,
              taoPool,
              alphaIn: alphaInValue,
              alphaOut: alphaOutValue,
              alphaPool,
              price,
              movingPrice: movingPriceValue,
              pendingEmission: Number(pending.toString()) / RAO_DECIMALS,
              flowBased: flowBased.toHuman() === true,
              subtokenEnabled: subtokenEnabled.toHuman() === true,
              volume24h: 0, // TODO: Calculate from events
              flowEMA: flowEMAValue,
            });
          } catch (err) {
            console.warn(`Failed to fetch data for netuid ${netuid}:`, err);
          }
        }

        setState({
          subnets: subnetsData,
          isLoading: false,
          error: null,
          totalSubnets,
        });

        console.log(`✅ Loaded data for ${subnetsData.length} subnets`);
      } catch (err) {
        console.error('❌ Failed to fetch subnet data:', err);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch data',
        }));
      }
    }

    fetchSubnetData();

    // Refresh data every 12 seconds (approx 1 block)
    const interval = setInterval(fetchSubnetData, 12000);

    return () => clearInterval(interval);
  }, [api, currentBlock]);

  return state;
}

// Helper to parse I96F32 fixed-point number
function parseI96F32(value: string): number {
  try {
    // I96F32 is a 128-bit fixed-point number with 32 fractional bits
    // For simplicity, we'll treat it as a regular number
    const num = BigInt(value);
    const divisor = BigInt(2 ** 32);
    return Number(num) / Number(divisor);
  } catch {
    return 0;
  }
}
