import { useState, useMemo } from 'react';
import { useBlockchain } from './hooks/useBlockchain';
import { useSubnetData } from './hooks/useSubnetData';
import { NetworkGraph } from './components/NetworkGraph';
import { StatsPanel } from './components/StatsPanel';
import { ControlPanel } from './components/ControlPanel';
import type { SubnetData } from './hooks/useSubnetData';
import './index.css';

function App() {
  const [filter, setFilter] = useState<'all' | 'flow' | 'price'>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [selectedSubnet, setSelectedSubnet] = useState<SubnetData | null>(null);

  // Connect to blockchain
  const { api, isConnected, isConnecting, error: connectionError, currentBlock } = useBlockchain();

  // Fetch subnet data
  const { subnets, isLoading, error: dataError } = useSubnetData(api, currentBlock);

  // Filter subnets based on selection
  const filteredSubnets = useMemo(() => {
    if (filter === 'all') return subnets;
    if (filter === 'flow') return subnets.filter(s => s.flowBased);
    if (filter === 'price') return subnets.filter(s => !s.flowBased);
    return subnets;
  }, [subnets, filter]);

  // Loading state
  if (isConnecting) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-xl text-neon-blue text-glow">
            Connecting to Bittensor Network...
          </div>
          <div className="text-sm text-gray-400 mt-2">
            ws://127.0.0.1:9944
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (connectionError || dataError) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center p-8">
        <div className="glass-panel p-8 max-w-2xl">
          <div className="text-2xl text-neon-red mb-4">⚠ Connection Error</div>
          <div className="text-gray-300 mb-4">
            {connectionError || dataError}
          </div>
          <div className="text-sm text-gray-400 space-y-2">
            <p>Make sure your local Bittensor node is running:</p>
            <code className="block bg-black/50 p-3 rounded">
              tmux attach -t subtensor
            </code>
            <p className="mt-4">Or check the node logs:</p>
            <code className="block bg-black/50 p-3 rounded">
              tail -f /tmp/subtensor-logs/dev.log
            </code>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 neon-button bg-neon-blue/20 text-neon-blue border border-neon-blue/50"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Loading subnet data
  if (isLoading && subnets.length === 0) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse w-16 h-16 bg-neon-blue/30 rounded-full mx-auto mb-4"></div>
          <div className="text-xl text-neon-blue text-glow">
            Loading Subnet Data...
          </div>
          <div className="text-sm text-gray-400 mt-2">
            Block #{currentBlock}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-dark cyber-grid">
      {/* Header with Controls */}
      <div className="p-4">
        <ControlPanel
          filter={filter}
          onFilterChange={setFilter}
          isPaused={isPaused}
          onPauseToggle={() => setIsPaused(!isPaused)}
        />
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Stats Panel */}
        <div className="flex-shrink-0 p-4 pt-0">
          <StatsPanel subnets={subnets} currentBlock={currentBlock} />
        </div>

        {/* Network Graph */}
        <div className="flex-1 p-4 pt-0">
          <div className="glass-panel h-full">
            {isConnected && subnets.length > 0 ? (
              <NetworkGraph
                subnets={filteredSubnets}
                onNodeClick={setSelectedSubnet}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No subnet data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Subnet Detail Panel */}
      {selectedSubnet && (
        <div className="fixed bottom-4 right-4 glass-panel p-4 max-w-md">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-bold text-neon-blue">
              Subnet {selectedSubnet.netuid} Details
            </h3>
            <button
              onClick={() => setSelectedSubnet(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <DetailRow label="TAO Pool" value={`${selectedSubnet.taoPool.toFixed(2)} TAO`} />
            <DetailRow label="Alpha Pool" value={`${selectedSubnet.alphaPool.toFixed(2)} α`} />
            <DetailRow label="Current Price" value={`${selectedSubnet.price.toFixed(4)} TAO/α`} />
            <DetailRow label="Moving Price" value={`${selectedSubnet.movingPrice.toFixed(4)} TAO/α`} />
            <DetailRow label="Pending Emission" value={`${selectedSubnet.pendingEmission.toFixed(2)} TAO`} />
            <DetailRow label="Flow EMA" value={selectedSubnet.flowEMA.toFixed(4)} />
            <DetailRow
              label="Emission Type"
              value={selectedSubnet.flowBased ? 'Flow-Based' : 'Price-Based'}
              valueClass={selectedSubnet.flowBased ? 'text-neon-green' : 'text-neon-blue'}
            />
            <DetailRow
              label="Swaps"
              value={selectedSubnet.subtokenEnabled ? 'Enabled' : 'Disabled'}
              valueClass={selectedSubnet.subtokenEnabled ? 'text-neon-green' : 'text-neon-red'}
            />
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      <div className="fixed top-4 right-4 glass-panel px-3 py-2 text-xs flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-neon-green animate-pulse' : 'bg-neon-red'}`}></div>
        <span className="text-gray-300">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {isConnected && (
          <span className="text-gray-500">• Block #{currentBlock}</span>
        )}
      </div>
    </div>
  );
}

// Helper component for detail rows
function DetailRow({
  label,
  value,
  valueClass = 'text-white'
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}:</span>
      <span className={`font-mono ${valueClass}`}>{value}</span>
    </div>
  );
}

export default App;
