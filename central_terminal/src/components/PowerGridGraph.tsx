import React, { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GridStatus } from '../hooks/useEventStream';

interface Props {
  gridStatus: GridStatus | null;
}

export const PowerGridGraph: React.FC<Props> = ({ gridStatus }) => {
  const { nodes, edges } = useMemo(() => {
    if (!gridStatus) {
      return { nodes: [], edges: [] };
    }

    const alloc = gridStatus.allocations || {};
    const shed = gridStatus.shed_modules || [];

    const nodes: Node[] = [
      {
        id: 'solar',
        data: {
          label: `☀ Solar Arrays\n${gridStatus.solar_output_w.toFixed(0)}W`,
        },
        position: { x: 50, y: 20 },
        sourcePosition: Position.Right,
        style: {
          background: gridStatus.dust_storm_active ? '#663300' : '#1a3a1a',
          color: '#fff',
          border: '1px solid #444',
          borderRadius: 8,
          padding: 10,
          fontSize: 12,
          whiteSpace: 'pre-line' as const,
          width: 140,
        },
      },
      {
        id: 'battery',
        data: {
          label: `🔋 Battery\n${(gridStatus.battery_pct * 100).toFixed(1)}%`,
        },
        position: { x: 50, y: 130 },
        sourcePosition: Position.Right,
        style: {
          background: gridStatus.battery_pct < 0.2 ? '#661a1a' : '#1a1a3a',
          color: '#fff',
          border: '1px solid #444',
          borderRadius: 8,
          padding: 10,
          fontSize: 12,
          whiteSpace: 'pre-line' as const,
          width: 140,
        },
      },
      {
        id: 'grid',
        data: {
          label: `⚡ Power Grid\n${gridStatus.total_available_w.toFixed(0)}W avail`,
        },
        position: { x: 260, y: 75 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          background: '#1a2a3a',
          color: '#00ccff',
          border: '2px solid #00ccff',
          borderRadius: 8,
          padding: 10,
          fontSize: 12,
          fontWeight: 'bold',
          whiteSpace: 'pre-line' as const,
          width: 150,
        },
      },
    ];

    let yPos = 10;
    const moduleNames = Object.keys(alloc);
    moduleNames.forEach((mod) => {
      const isShed = shed.includes(mod);
      const watts = alloc[mod] || 0;
      const displayName = mod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      nodes.push({
        id: mod,
        data: {
          label: `${isShed ? '🔴' : '🟢'} ${displayName}\n${watts.toFixed(0)}W`,
        },
        position: { x: 480, y: yPos },
        targetPosition: Position.Left,
        style: {
          background: isShed ? '#3a1a1a' : '#1a3a1a',
          color: isShed ? '#ff6666' : '#66ff66',
          border: `1px solid ${isShed ? '#ff4444' : '#44ff44'}`,
          borderRadius: 8,
          padding: 10,
          fontSize: 12,
          whiteSpace: 'pre-line' as const,
          width: 160,
        },
      });
      yPos += 90;
    });

    const edges: Edge[] = [
      {
        id: 'solar-grid',
        source: 'solar',
        target: 'grid',
        animated: true,
        style: { stroke: '#ffcc00' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#ffcc00' },
      },
      {
        id: 'battery-grid',
        source: 'battery',
        target: 'grid',
        animated: gridStatus.battery_charge_w > 0,
        style: { stroke: '#6666ff' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6666ff' },
      },
    ];

    moduleNames.forEach((mod) => {
      const isShed = shed.includes(mod);
      edges.push({
        id: `grid-${mod}`,
        source: 'grid',
        target: mod,
        animated: !isShed,
        style: { stroke: isShed ? '#ff4444' : '#44ff44' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isShed ? '#ff4444' : '#44ff44',
        },
      });
    });

    return { nodes, edges };
  }, [gridStatus]);

  if (!gridStatus) {
    return <div style={{ color: '#666', textAlign: 'center', paddingTop: 80 }}>Waiting for grid data...</div>;
  }

  return (
    <div style={{ height: 280 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#0a0a0a' }}
      />
    </div>
  );
};
