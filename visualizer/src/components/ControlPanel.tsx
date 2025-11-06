import { motion } from 'framer-motion';

interface ControlPanelProps {
  filter: 'all' | 'flow' | 'price';
  onFilterChange: (filter: 'all' | 'flow' | 'price') => void;
  isPaused: boolean;
  onPauseToggle: () => void;
}

export function ControlPanel({
  filter,
  onFilterChange,
  isPaused,
  onPauseToggle
}: ControlPanelProps) {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="glass-panel p-4 flex items-center justify-between gap-6"
    >
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-glow text-neon-blue">
          Bittensor Network Visualizer
        </h1>
        <p className="text-sm text-gray-400">
          Real-time subnet monitoring and flow analysis
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Filter Buttons */}
        <div className="flex gap-2">
          <FilterButton
            active={filter === 'all'}
            onClick={() => onFilterChange('all')}
            label="All"
          />
          <FilterButton
            active={filter === 'price'}
            onClick={() => onFilterChange('price')}
            label="Price-Based"
            color="neon-blue"
          />
          <FilterButton
            active={filter === 'flow'}
            onClick={() => onFilterChange('flow')}
            label="Flow-Based"
            color="neon-green"
          />
        </div>

        {/* Pause Button */}
        <button
          onClick={onPauseToggle}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all duration-300
            ${isPaused
              ? 'bg-neon-green/20 text-neon-green border border-neon-green/50 hover:bg-neon-green/30'
              : 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue/30'
            }
          `}
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>
    </motion.div>
  );
}

// Helper component for filter buttons
function FilterButton({
  active,
  onClick,
  label,
  color = 'white'
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg font-medium transition-all duration-300
        ${active
          ? `bg-${color}/20 text-${color} border border-${color}/50 shadow-${color === 'white' ? 'glow' : `neon-${color.split('-')[1]}`}`
          : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
        }
      `}
    >
      {label}
    </motion.button>
  );
}
