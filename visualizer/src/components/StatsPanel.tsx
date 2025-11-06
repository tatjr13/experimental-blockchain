import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SubnetData } from '../hooks/useSubnetData';

interface StatsPanelProps {
  subnets: SubnetData[];
  currentBlock: number;
}

export function StatsPanel({ subnets, currentBlock }: StatsPanelProps) {
  const stats = useMemo(() => {
    const totalTAO = subnets.reduce((sum, s) => sum + s.taoPool, 0);
    const totalPendingEmissions = subnets.reduce((sum, s) => sum + s.pendingEmission, 0);
    const totalVolume = subnets.reduce((sum, s) => sum + s.volume24h, 0);
    const avgPrice = subnets.length > 0
      ? subnets.reduce((sum, s) => sum + s.price, 0) / subnets.length
      : 0;

    // Find most active subnet (highest pending emissions)
    const mostActive = subnets.reduce((max, s) =>
      s.pendingEmission > max.pendingEmission ? s : max
    , subnets[0] || { netuid: 0, pendingEmission: 0 });

    // Count emission types
    const flowBased = subnets.filter(s => s.flowBased).length;
    const priceBased = subnets.filter(s => !s.flowBased).length;

    return {
      totalTAO,
      totalPendingEmissions,
      totalVolume,
      avgPrice,
      mostActive,
      flowBased,
      priceBased,
      totalSubnets: subnets.length,
    };
  }, [subnets]);

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-full w-80 glass-panel p-6 custom-scrollbar overflow-y-auto"
    >
      <h2 className="text-2xl font-bold mb-6 text-glow text-neon-blue">
        Network Stats
      </h2>

      {/* Current Block */}
      <div className="mb-6 p-4 bg-white/5 rounded-lg border border-neon-blue/30">
        <div className="text-sm text-gray-400">Current Block</div>
        <div className="text-2xl font-bold text-neon-blue">
          #{currentBlock.toLocaleString()}
        </div>
      </div>

      {/* Total Subnets */}
      <StatCard
        label="Total Subnets"
        value={stats.totalSubnets}
        color="text-white"
      />

      {/* Total TAO in Pools */}
      <StatCard
        label="Total TAO in Pools"
        value={`${stats.totalTAO.toFixed(2)} TAO`}
        color="text-neon-blue"
        icon="💎"
      />

      {/* Total Pending Emissions */}
      <StatCard
        label="Pending Emissions"
        value={`${stats.totalPendingEmissions.toFixed(2)} TAO`}
        color="text-neon-gold"
        icon="⚡"
      />

      {/* Average Price */}
      <StatCard
        label="Average Subnet Price"
        value={`${stats.avgPrice.toFixed(4)} TAO/α`}
        color="text-neon-purple"
        icon="💰"
      />

      {/* 24h Volume */}
      <StatCard
        label="24h Swap Volume"
        value={`${stats.totalVolume.toFixed(2)} TAO`}
        color="text-neon-green"
        icon="📊"
      />

      {/* Most Active Subnet */}
      <div className="mb-4 p-4 bg-white/5 rounded-lg border border-neon-green/30">
        <div className="text-sm text-gray-400 mb-1">Most Active Subnet</div>
        <div className="text-xl font-bold text-neon-green">
          Subnet {stats.mostActive?.netuid}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {stats.mostActive?.pendingEmission.toFixed(2)} TAO pending
        </div>
      </div>

      {/* Emission Types */}
      <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
        <div className="text-sm text-gray-400 mb-3">Emission Types</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-neon-blue">Price-Based</span>
            <span className="font-bold text-neon-blue">{stats.priceBased}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neon-green">Flow-Based</span>
            <span className="font-bold text-neon-green">{stats.flowBased}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-neon-blue transition-all duration-500"
            style={{ width: `${(stats.priceBased / stats.totalSubnets) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Network Health */}
      <div className="p-4 bg-white/5 rounded-lg border border-neon-green/30">
        <div className="text-sm text-gray-400 mb-2">Network Health</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-neon-green animate-pulse shadow-neon-green"></div>
          <span className="text-neon-green font-bold">Operational</span>
        </div>
        <div className="text-xs text-gray-400 mt-2">
          All systems running smoothly
        </div>
      </div>
    </motion.div>
  );
}

// Helper component for stat cards
function StatCard({
  label,
  value,
  color,
  icon
}: {
  label: string;
  value: string | number;
  color: string;
  icon?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm text-gray-400">{label}</div>
          <div className={`text-xl font-bold ${color}`}>
            {value}
          </div>
        </div>
        {icon && (
          <div className="text-3xl opacity-50">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}
