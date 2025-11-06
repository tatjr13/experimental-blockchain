import { useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { SubnetData } from '../hooks/useSubnetData';

interface Node {
  id: number;
  name: string;
  subnet: SubnetData;
  color: string;
  size: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface Link {
  source: number;
  target: number;
  color: string;
  particles: number;
  width: number;
}

interface NetworkGraphProps {
  subnets: SubnetData[];
  onNodeClick?: (subnet: SubnetData) => void;
}

export function NetworkGraph({ subnets, onNodeClick }: NetworkGraphProps) {
  const graphRef = useRef<any>(null);

  // Create nodes from subnet data
  const nodes = useMemo<Node[]>(() => {
    return subnets.map((subnet) => {
      // Color based on emission type
      const color = subnet.flowBased ? '#00FF88' : '#4158D0'; // green for flow, blue for price

      // Size based on TAO pool + pending emissions
      const totalValue = subnet.taoPool + subnet.pendingEmission;
      const size = subnet.netuid === 0 ? 15 : Math.max(8, Math.min(20, totalValue / 10));

      return {
        id: subnet.netuid,
        name: `Subnet ${subnet.netuid}`,
        subnet,
        color,
        size,
        ...(subnet.netuid === 0 && { fx: 0, fy: 0 }), // Pin root to center
      };
    });
  }, [subnets]);

  // Create links from root to all other subnets (emission flows)
  const links = useMemo<Link[]>(() => {
    const emissionLinks: Link[] = [];

    subnets.forEach((subnet) => {
      if (subnet.netuid !== 0) {
        emissionLinks.push({
          source: 0, // From root
          target: subnet.netuid,
          color: '#FFD700', // Gold for emissions
          particles: subnet.pendingEmission > 0 ? 2 : 0,
          width: 1,
        });
      }
    });

    return emissionLinks;
  }, [subnets]);

  // Custom node rendering with neon glow effect
  const drawNode = useCallback((node: Node, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const size = node.size;

    // Draw glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = node.color;

    // Draw gradient circle
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, node.color);
    gradient.addColorStop(0.5, node.color + 'CC');
    gradient.addColorStop(1, node.color + '33');

    ctx.beginPath();
    ctx.arc(0, 0, size, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw border
    ctx.strokeStyle = node.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw text label
    ctx.font = `${12 / globalScale}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText(node.id.toString(), 0, size + 12 / globalScale);
  }, []);

  // Custom link rendering
  const drawLink = useCallback((link: Link, ctx: CanvasRenderingContext2D) => {
    const start = link.source as any;
    const end = link.target as any;

    if (typeof start !== 'object' || typeof end !== 'object') return;

    ctx.strokeStyle = link.color + '40';
    ctx.lineWidth = link.width;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }, []);

  // Handle node hover
  const handleNodeHover = useCallback((node: Node | null) => {
    document.body.style.cursor = node ? 'pointer' : 'default';
  }, []);

  // Handle node click
  const handleNodeClick = useCallback((node: Node) => {
    if (onNodeClick) {
      onNodeClick(node.subnet);
    }
  }, [onNodeClick]);

  return (
    <div className="w-full h-full relative">
      <ForceGraph2D
        ref={graphRef}
        graphData={{ nodes, links }}
        nodeId="id"
        nodeLabel={(node: any) => {
          const n = node as Node;
          return `
            <div class="bg-black/90 p-3 rounded-lg border border-white/20 text-sm">
              <div class="font-bold text-${n.subnet.flowBased ? 'green' : 'blue'}-400">
                Subnet ${n.subnet.netuid}
              </div>
              <div class="text-gray-300 mt-1">
                TAO Pool: ${n.subnet.taoPool.toFixed(2)}
              </div>
              <div class="text-gray-300">
                Alpha Pool: ${n.subnet.alphaPool.toFixed(2)}
              </div>
              <div class="text-gray-300">
                Price: ${n.subnet.price.toFixed(4)}
              </div>
              <div class="text-yellow-400">
                Pending: ${n.subnet.pendingEmission.toFixed(2)}
              </div>
              <div class="text-gray-400 text-xs mt-1">
                ${n.subnet.flowBased ? 'Flow-Based' : 'Price-Based'}
              </div>
            </div>
          `;
        }}
        nodeCanvasObject={drawNode}
        linkCanvasObject={drawLink}
        linkDirectionalParticles={(link: any) => link.particles}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={(link: any) => link.color}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        cooldownTicks={100}
        d3VelocityDecay={0.3}
        backgroundColor="#0a0e27"
        enableNodeDrag={false}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />

      {/* Legend */}
      <div className="absolute top-4 right-4 glass-panel p-4 text-sm">
        <div className="font-bold mb-2">Emission Type</div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-neon-blue shadow-neon-blue"></div>
          <span>Price-Based</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-neon-green shadow-neon-green"></div>
          <span>Flow-Based</span>
        </div>
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-neon-gold"></div>
            <span className="text-xs">Emissions</span>
          </div>
        </div>
      </div>
    </div>
  );
}
