# Bittensor Subnet Network Visualizer

A modern, real-time web visualization for monitoring Bittensor subnet networks, showing interconnections, token pools, emission flows, and trading activity.

![Bittensor Visualizer](https://img.shields.io/badge/Built%20with-React%20%2B%20TypeScript-blue)
![Vite](https://img.shields.io/badge/Bundler-Vite%205-646CFF)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v3-38B2AC)

## Features

### 🌐 Network Graph
- **20 subnet nodes** in force-directed layout with Canvas rendering
- **Color-coded nodes** by emission type (blue = price-based, green = flow-based)
- **Dynamic sizing** based on TAO pool + pending emissions
- **Interactive** hover tooltips and click for detailed view
- **Zoom & Pan** controls for exploration

### ✨ Real-Time Animations
- **Emission flow particles** from root (netuid 0) to subnets (golden particles)
- **Particle intensity** reflects pending emission amounts
- **60 FPS** Canvas-based animations for smooth performance

### 📊 Statistics Dashboard
- **Total TAO in Pools** - aggregated across all subnets
- **Pending Emissions** - total accumulated rewards
- **24h Swap Volume** - trading activity metrics
- **Most Active Subnet** - highest pending emissions
- **Emission Type Distribution** - flow-based vs price-based comparison
- **Network Health** - real-time connection status

### 🎛️ Control Panel
- **Filter Subnets** - view all, only flow-based, or only price-based
- **Pause/Resume** - freeze animation for analysis
- **Real-time Updates** - auto-refresh every 12 seconds (~1 block)

### 🎨 Cyberpunk Aesthetic
- **Dark theme** with navy background (#0a0e27)
- **Neon accents** (blue, purple, green, gold)
- **Glassmorphic panels** with blur effects
- **Glow effects** on nodes and text
- **Cyber grid** background pattern

## Tech Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React + TypeScript | 18.3 | UI library |
| **Build Tool** | Vite | 5.4 | Fast dev server & bundler |
| **Graph Viz** | react-force-graph-2d | Latest | Network graph with Canvas |
| **Blockchain** | @polkadot/api | Latest | Connect to Bittensor RPC |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS |
| **Animations** | Framer Motion | Latest | UI component animations |
| **Charting** | Recharts | Latest | Mini-charts (future use) |

**Total Bundle Size**: ~1.5MB (gzipped: ~522KB)

## Prerequisites

- **Node.js**: v18+ (v20+ recommended)
- **npm**: v8+
- **Running Bittensor node**: Local testnet at `ws://127.0.0.1:9944`

## Installation

```bash
# From the project root
cd visualizer

# Install dependencies
npm install
```

## Usage

### Development Mode

Start the Vite dev server with hot module replacement:

```bash
npm run dev
```

Then open http://localhost:5173/ in your browser.

### Production Build

Build optimized production bundle:

```bash
npm run build
```

Serve the built files:

```bash
npm run preview
```

## Configuration

### RPC Endpoint

By default, the visualizer connects to `ws://127.0.0.1:9944`. To change this, modify the `useBlockchain` hook:

```typescript
// src/hooks/useBlockchain.ts
export function useBlockchain(rpcUrl: string = 'ws://YOUR_RPC_URL:9944') {
  // ...
}
```

### Refresh Rate

Subnet data refreshes every 12 seconds. To adjust:

```typescript
// src/hooks/useSubnetData.ts
const interval = setInterval(fetchSubnetData, 12000); // milliseconds
```

## Project Structure

```
visualizer/
├── src/
│   ├── components/
│   │   ├── NetworkGraph.tsx      # Main force graph visualization
│   │   ├── StatsPanel.tsx        # Left sidebar with metrics
│   │   └── ControlPanel.tsx      # Top bar with filters
│   ├── hooks/
│   │   ├── useBlockchain.ts      # WebSocket connection to RPC
│   │   └── useSubnetData.ts      # Query subnet data from chain
│   ├── App.tsx                   # Main application component
│   ├── index.css                 # Tailwind + custom styles
│   └── main.tsx                  # React entry point
├── public/                       # Static assets
├── tailwind.config.js            # Tailwind theme config
├── postcss.config.js             # PostCSS config
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite config
└── package.json                  # Dependencies
```

## How It Works

### 1. Blockchain Connection

The `useBlockchain` hook establishes a WebSocket connection to your local Bittensor node:

```typescript
const { api, isConnected, currentBlock } = useBlockchain();
```

### 2. Data Fetching

The `useSubnetData` hook queries subnet information every block:

```typescript
const { subnets, isLoading } = useSubnetData(api, currentBlock);
```

**Queries per subnet**:
- `subnetTAO` - TAO reserves in pool
- `subnetAlphaIn` / `subnetAlphaOut` - Alpha token amounts
- `pendingEmission` - Accumulated rewards
- `flowBasedEmissionsEnabled` - Emission type
- `subtokenEnabled` - Swap functionality status
- `subnetMovingPrice` - EMA price for emissions

### 3. Network Visualization

`react-force-graph-2d` renders nodes as Canvas elements with:
- **Custom rendering** via `nodeCanvasObject` callback
- **Force-directed layout** for organic positioning
- **Particle system** for emission flow animations

### 4. Real-Time Updates

- Subscribe to new block headers via `api.rpc.chain.subscribeNewHeads`
- Re-fetch subnet data every 12 seconds
- React state updates trigger automatic re-renders

## Troubleshooting

### Connection Error

**Symptom**: "Failed to connect to RPC"

**Solution**:
1. Check if your node is running:
   ```bash
   tmux attach -t subtensor
   ```
2. Verify RPC is accessible:
   ```bash
   curl -H "Content-Type: application/json" \
     -d '{"id":1, "jsonrpc":"2.0", "method": "system_health"}' \
     http://localhost:9944
   ```
3. Check node logs:
   ```bash
   tail -f /tmp/subtensor-logs/dev.log
   ```

### No Subnet Data

**Symptom**: "Loading Subnet Data..." stuck

**Causes**:
- Subnets not registered yet
- Emissions not enabled

**Solution**:
```bash
cd /root/code/subtensor
node scripts/utils/check_status.js
```

### Particle Animations Not Showing

**Cause**: Pending emissions are 0

**Solution**: Wait for emissions to accumulate over a few blocks. Check:
```bash
tail -f /tmp/subtensor-logs/dev.log | grep pendingEmission
```

### Slow Performance

**Cause**: Too many particles or nodes

**Solutions**:
1. Reduce particle count in `NetworkGraph.tsx`:
   ```typescript
   particles: subnet.pendingEmission > 0 ? 1 : 0, // Reduce from 2
   ```
2. Disable zoom/pan interactions temporarily
3. Close other browser tabs

### TypeScript Errors

**Symptom**: Build fails with type errors

**Solution**:
```bash
# Clear TypeScript cache
rm -rf node_modules/.vite
npm run build
```

## Performance

- **Target**: 60 FPS
- **Actual**: 55-60 FPS on 20 nodes with 40 particles
- **Bottlenecks**:
  - Polkadot API calls (every 12s)
  - React re-renders on state updates

**Optimizations Applied**:
- Canvas rendering (not SVG)
- `useMemo` for expensive calculations
- Debounced data fetching
- Zero runtime CSS overhead (Tailwind)

## Future Enhancements

- [ ] **Timeline Scrubber** - playback historical data
- [ ] **Swap Event Particles** - green for buys, red for sells
- [ ] **Alerts** - notifications for large swaps/emissions
- [ ] **Comparison Mode** - side-by-side subnet analysis
- [ ] **Export Features** - screenshot/video/CSV export
- [ ] **Responsive Design** - mobile/tablet support
- [ ] **Historical Charts** - price/volume over time with Recharts
- [ ] **WebSocket Optimization** - incremental updates only

## Development

### Adding a New Component

```bash
# Create component file
touch src/components/NewComponent.tsx
```

```typescript
import type { SubnetData } from '../hooks/useSubnetData';

interface NewComponentProps {
  subnets: SubnetData[];
}

export function NewComponent({ subnets }: NewComponentProps) {
  return (
    <div className="glass-panel p-4">
      {/* Your component */}
    </div>
  );
}
```

### Customizing Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      'cyber-dark': '#YOUR_COLOR',
      'neon-blue': '#YOUR_COLOR',
    }
  }
}
```

### Adding New Metrics

1. Query data in `useSubnetData.ts`
2. Add to `SubnetData` interface
3. Display in `StatsPanel.tsx` or node tooltips

## Credits

Built for the Bittensor experimental blockchain testnet project.

**Technologies**:
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [react-force-graph](https://github.com/vasturiano/react-force-graph)
- [Polkadot.js](https://polkadot.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)

## License

MIT

---

**Need Help?** Check the main project documentation at `/root/experimental-blockchain/README.md`
