# Prompt for ChatGPT: Bittensor Subnet Network Visualizer

Copy and paste this entire prompt to ChatGPT to generate the web visualization interface.

---

## Context

I need you to design and create a **modern, interactive web-based data visualization** for a Bittensor blockchain testnet. This will visualize a network of 20 subnets showing their interconnections, token pools, emission flows, and trading activity in real-time.

## What is Bittensor?

Bittensor is a decentralized machine learning network where:
- **Subnets** are independent networks (like specialized markets)
- Each subnet has a **TAO/Alpha token pool** (like a liquidity pool)
- **TAO** flows into subnets via **emissions** (rewards distributed by the network)
- Users can **swap TAO ↔ Alpha** (trading activity)
- **Emissions** are distributed based on either:
  - **Price-based**: Higher price = more emissions
  - **Flow-based**: More net TAO inflow = more emissions

## Visualization Requirements

Create a **single-page web application** with:

### 1. Main Network Graph
- **20 subnet nodes** arranged in a force-directed or circular layout
- **1 root node** (netuid 0) in the center or special position
- **Color-coded nodes** based on:
  - Emission type (price-based = blue, flow-based = green)
  - Activity level (size based on trading volume)
  - TAO pool size (brightness or saturation)

### 2. Node Details (on hover or click)
Each subnet node should show:
- **Netuid number**
- **TAO in pool**: Current TAO reserves
- **Alpha in pool**: Current Alpha reserves
- **Current price**: TAO/Alpha ratio
- **Pending emissions**: Accumulated rewards waiting to distribute
- **24h trading volume**: Total swap activity
- **Emission type**: Price-based or Flow-based

### 3. Flow Animations
Real-time animated flows showing:
- **Emission flows**: From root → subnets (golden/yellow particles flowing in)
- **Swap flows**: Between subnets and users (green for buys, red for sells)
- **Flow intensity**: More particles = higher volume
- **Flow direction**: Arrows or particle movement

### 4. Control Panel (Sidebar or Top Bar)
Filters and controls:
- **Time range selector**: Last 1h / 6h / 24h
- **Show/hide flows**: Toggle emission flows, swap flows
- **Subnet filter**: Show only flow-based, price-based, or all
- **Metric selector**: Color nodes by price / volume / emissions
- **Pause/Resume**: Stop animation for analysis

### 5. Statistics Dashboard
Real-time stats showing:
- **Total TAO in all pools**
- **Total pending emissions**
- **24h swap volume**
- **Average subnet price**
- **Most active subnet**
- **Flow-based vs Price-based comparison**

### 6. Timeline Scrubber
- Playback historical data
- See how network evolved over time
- Speed controls (1x, 2x, 5x, 10x)

## Technical Stack Suggestions

### Frontend Framework
**React** with:
- **D3.js** for graph visualization
- **React Force Graph** or **vis-network** for network layout
- **Recharts** or **Victory** for supplementary charts
- **Tailwind CSS** for styling
- **Framer Motion** for smooth animations

### Data Connection
Connect to local Bittensor RPC:
- **WebSocket**: `ws://127.0.0.1:9944`
- **Library**: `@polkadot/api` for blockchain queries

### Data Structure

```javascript
// Subnet data structure
{
  netuid: 5,
  taoPool: 1234.5678,        // TAO in pool
  alphaPool: 9876.5432,      // Alpha in pool
  price: 0.125,              // Current TAO/Alpha price
  movingPrice: 0.124,        // EMA price for emissions
  pendingEmission: 567.89,   // Pending rewards
  flowBased: false,          // Emission type
  volume24h: 1500.25,        // 24h swap volume
  flowEMA: 123.45,           // Flow EMA (if flow-based)
  subtokenEnabled: true,     // Can swap?
  lastUpdate: 1234567890     // Timestamp
}

// Swap event structure
{
  type: 'buy' | 'sell',
  netuid: 5,
  amount: 50.0,              // TAO amount
  alphaAmount: 400.0,        // Alpha amount
  timestamp: 1234567890,
  account: '5GrwvaE...'      // User address
}

// Emission event structure
{
  block: 12345,
  totalEmission: 1000.0,     // Block reward
  distributions: [
    { netuid: 1, amount: 52.6 },  // ~5.26% each
    { netuid: 2, amount: 52.6 },
    // ... for all 20 subnets
  ]
}
```

## Blockchain Data Queries

### Using @polkadot/api

```javascript
const { ApiPromise, WsProvider } = require('@polkadot/api');

// Connect
const api = await ApiPromise.create({
  provider: new WsProvider('ws://127.0.0.1:9944')
});

// Query subnet data
for (let netuid = 0; netuid < 20; netuid++) {
  const tao = await api.query.subtensorModule.subnetTAO(netuid);
  const alphaIn = await api.query.subtensorModule.subnetAlphaIn(netuid);
  const alphaOut = await api.query.subtensorModule.subnetAlphaOut(netuid);
  const pending = await api.query.subtensorModule.pendingEmission(netuid);
  const flowBased = await api.query.subtensorModule.flowBasedEmissionsEnabled(netuid);
  const subtokenEnabled = await api.query.subtensorModule.subtokenEnabled(netuid);

  // Calculate price
  const price = tao / (alphaIn - alphaOut);  // Simplified
}

// Subscribe to new blocks
api.rpc.chain.subscribeNewHeads((header) => {
  console.log(`New block #${header.number}`);
  // Update visualization
});

// Subscribe to events
api.query.system.events((events) => {
  events.forEach((record) => {
    const { event } = record;

    // Check for swap events
    if (api.events.subtensorModule.StakeAdded.is(event)) {
      // Handle buy (addStake = TAO → Alpha)
    }
    if (api.events.subtensorModule.StakeRemoved.is(event)) {
      // Handle sell (removeStake = Alpha → TAO)
    }
  });
});
```

## Design Aesthetic

### Visual Style
- **Modern glassmorphism** with subtle blur effects
- **Dark theme** with neon accents (think: Tron, cyberpunk)
- **Smooth animations** (no jarring transitions)
- **Color palette**:
  - Background: Dark navy/black (#0a0e27)
  - Nodes: Gradient blues/greens (#4158D0 → #C850C0)
  - Emissions: Gold/yellow (#FFD700)
  - Buys: Bright green (#00FF88)
  - Sells: Bright red (#FF4444)
  - Text: Light gray (#E0E0E0)

### Typography
- **Headers**: Inter or Poppins (bold, large)
- **Body**: Roboto or Open Sans (clean, readable)
- **Numbers**: Roboto Mono (monospace for data)

### Layout
```
┌─────────────────────────────────────────────────────┐
│  BITTENSOR SUBNET NETWORK VISUALIZER    [Controls]  │
├──────────────┬──────────────────────────────────────┤
│              │                                       │
│   Stats      │        Main Network Graph            │
│   Panel      │                                       │
│              │         20 Subnet Nodes               │
│   • Total    │       with animated flows             │
│   • Volume   │                                       │
│   • Active   │                                       │
│              │                                       │
├──────────────┴──────────────────────────────────────┤
│         Timeline Scrubber [=========>----]          │
└─────────────────────────────────────────────────────┘
```

## Interactive Features

### Node Interactions
- **Hover**: Show tooltip with subnet details
- **Click**: Expand detailed panel with charts
- **Drag**: Reposition nodes (in force layout)
- **Right-click**: Context menu (filter, focus, compare)

### Flow Interactions
- **Hover emission flow**: Show amount and recipient
- **Hover swap flow**: Show trade details
- **Click flow**: Highlight all flows for that subnet

### Zoom & Pan
- **Mouse wheel**: Zoom in/out
- **Click+drag**: Pan around canvas
- **Double-click**: Reset view
- **Fit view button**: Auto-scale to fit all nodes

## Example Features to Implement

### 1. Heatmap Mode
Color nodes based on selected metric:
- Red (cold) → Yellow → Green (hot)
- Metrics: Volume, Emissions, Price change, Flow

### 2. Comparison Mode
Select 2+ subnets to compare side-by-side:
- Line charts showing price history
- Bar charts showing volume
- Flow EMA trends

### 3. Alert System
Visual alerts when:
- Large swap detected (> 1000 TAO)
- Subnet switches to flow-based
- Emissions spike/drop significantly
- Price changes > 10%

### 4. Export Features
- **Screenshot**: Capture current visualization
- **Video export**: Record 30s of animation
- **Data export**: Download CSV of current state

## Responsive Design

Must work on:
- **Desktop**: Full experience (1920x1080+)
- **Tablet**: Simplified layout (768px+)
- **Mobile**: Stats only, no graph (< 768px)

## Performance Considerations

- **60 FPS animations** (use requestAnimationFrame)
- **Efficient rendering** (only redraw changed elements)
- **WebSocket throttling** (don't update more than 10x/sec)
- **Canvas vs SVG**: Use Canvas for animations, SVG for static nodes
- **Memory management**: Clear old data (keep last 1000 events max)

## Sample React Component Structure

```
src/
├── App.jsx                 # Main app component
├── components/
│   ├── NetworkGraph.jsx    # Main force graph
│   ├── SubnetNode.jsx      # Individual subnet node
│   ├── FlowParticle.jsx    # Animated flow particles
│   ├── StatsPanel.jsx      # Statistics sidebar
│   ├── ControlPanel.jsx    # Filters and controls
│   ├── Timeline.jsx        # Playback scrubber
│   └── SubnetDetail.jsx    # Expanded subnet view
├── hooks/
│   ├── useBlockchain.js    # Connect to RPC
│   ├── useSubnetData.js    # Query subnet data
│   ├── useEvents.js        # Subscribe to events
│   └── useAnimation.js     # Animation loop
├── utils/
│   ├── blockchain.js       # @polkadot/api helpers
│   ├── calculations.js     # Price, flow calculations
│   └── colors.js           # Color schemes
└── styles/
    └── globals.css         # Tailwind + custom styles
```

## Initial Implementation Steps

1. **Set up React app** with Vite or Create React App
2. **Install dependencies**:
   - `@polkadot/api`
   - `d3` or `react-force-graph`
   - `tailwindcss`
   - `framer-motion`
3. **Connect to RPC**: Test basic connection and queries
4. **Render static graph**: Show 20 nodes in layout
5. **Add real data**: Query and display actual subnet data
6. **Implement animations**: Emission and swap flows
7. **Add interactivity**: Hover, click, zoom
8. **Create control panel**: Filters and options
9. **Add statistics**: Real-time metrics
10. **Polish UI**: Colors, typography, responsiveness

## Expected Deliverables

Please provide:

1. **Full source code** for the web app
2. **Setup instructions** (npm install, npm start)
3. **Configuration** for RPC endpoint
4. **Screenshots/mockups** of the design
5. **Brief documentation** on how to use it

## Testing Data

For testing, assume:
- 20 subnets (netuids 0-19)
- Netuid 0 is root (special styling)
- Each subnet has ~10-100 TAO in pool
- Prices range from 0.5 to 2.0 TAO/Alpha
- Pending emissions are 40-60 per subnet
- Mix of flow-based (green) and price-based (blue)
- Swaps happening every 5-30 seconds

## Questions to Consider

- Should nodes be draggable or fixed positions?
- Should we show historical price charts on hover?
- Do you want sound effects for swaps/emissions?
- Should we have a "god mode" view showing all connections?
- Want to compare this to mainnet data later?

---

## Summary

Create a beautiful, modern, interactive web visualization of a Bittensor subnet network that:
- Shows 20+ subnets as nodes
- Displays TAO/Alpha pools and prices
- Animates emission and swap flows in real-time
- Provides detailed statistics and controls
- Connects to local blockchain RPC
- Has clean, cyberpunk-style aesthetics
- Performs smoothly at 60 FPS

Make it look like a professional data science dashboard you'd see at a fintech company or blockchain analytics platform!
