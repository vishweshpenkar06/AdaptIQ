'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Concept, ConceptStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface KnowledgeGraphProps {
  concepts: Concept[];
  dependencies: { parentId: string; childId: string }[];
  onSelectConcept: (concept: Concept) => void;
  selectedConceptId?: string;
}

interface NodePosition {
  x: number;
  y: number;
}

const statusColors: Record<ConceptStatus, { bg: string; border: string; glow: string }> = {
  mastered: {
    bg: '#22C55E',
    border: '#16A34A',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  weak: {
    bg: '#F59E0B',
    border: '#D97706',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  missing: {
    bg: '#EF4444',
    border: '#DC2626',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

export function KnowledgeGraph({ 
  concepts, 
  dependencies, 
  onSelectConcept,
  selectedConceptId 
}: KnowledgeGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate node positions using a simple force-directed layout
  const nodePositions = useMemo(() => {
    const positions: Record<string, NodePosition> = {};
    const cols = 4;
    const nodeWidth = 160;
    const nodeHeight = 100;
    const paddingX = 80;
    const paddingY = 60;

    concepts.forEach((concept, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      positions[concept.id] = {
        x: paddingX + col * (nodeWidth + paddingX),
        y: paddingY + row * (nodeHeight + paddingY),
      };
    });

    return positions;
  }, [concepts]);

  // Get connected nodes for highlighting
  const getConnectedNodes = useCallback((conceptId: string) => {
    const connected = new Set<string>();
    dependencies.forEach((dep) => {
      if (dep.parentId === conceptId) connected.add(dep.childId);
      if (dep.childId === conceptId) connected.add(dep.parentId);
    });
    return connected;
  }, [dependencies]);

  const connectedNodes = hoveredNode ? getConnectedNodes(hoveredNode) : new Set<string>();

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Calculate SVG dimensions
  const svgWidth = 900;
  const svgHeight = 500;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-card">
      {/* Zoom Controls */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-background border border-border text-foreground hover:bg-muted transition-colors"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-background border border-border text-foreground hover:bg-muted transition-colors"
          aria-label="Zoom out"
        >
          -
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-background border border-border text-foreground hover:bg-muted transition-colors text-xs"
          aria-label="Reset view"
        >
          R
        </button>
      </div>

      {/* Legend */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-lg bg-background/90 backdrop-blur-sm border border-border p-3">
        <p className="text-xs font-medium text-foreground">Legend</p>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#22C55E]" />
          <span className="text-xs text-muted-foreground">Mastered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#F59E0B]" />
          <span className="text-xs text-muted-foreground">Weak</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#EF4444]" />
          <span className="text-xs text-muted-foreground">Missing</span>
        </div>
      </div>

      {/* Graph Canvas */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className={cn('cursor-grab', isDragging && 'cursor-grabbing')}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          <g>
            {dependencies.map((dep) => {
              const start = nodePositions[dep.parentId];
              const end = nodePositions[dep.childId];
              if (!start || !end) return null;

              const isHighlighted = 
                hoveredNode === dep.parentId || 
                hoveredNode === dep.childId;

              // Calculate curve control points
              const midX = (start.x + end.x) / 2;
              const midY = (start.y + end.y) / 2;
              const offset = 20;

              return (
                <g key={`${dep.parentId}-${dep.childId}`}>
                  <path
                    d={`M ${start.x + 70} ${start.y + 35} Q ${midX} ${midY - offset} ${end.x + 70} ${end.y + 35}`}
                    fill="none"
                    stroke={isHighlighted ? '#2563EB' : '#CBD5E1'}
                    strokeWidth={isHighlighted ? 3 : 2}
                    strokeDasharray={isHighlighted ? 'none' : '5,5'}
                    className="transition-all duration-200"
                  />
                  {/* Arrow head */}
                  <circle
                    cx={end.x + 70}
                    cy={end.y + 35}
                    r={4}
                    fill={isHighlighted ? '#2563EB' : '#94A3B8'}
                    className="transition-all duration-200"
                  />
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {concepts.map((concept) => {
              const pos = nodePositions[concept.id];
              if (!pos) return null;

              const status = concept.status || 'missing';
              const colors = statusColors[status];
              const isHovered = hoveredNode === concept.id;
              const isConnected = connectedNodes.has(concept.id);
              const isSelected = selectedConceptId === concept.id;
              const accuracy = Math.round((concept.accuracy || 0) * 100);

              return (
                <g
                  key={concept.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseEnter={() => setHoveredNode(concept.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => onSelectConcept(concept)}
                  className="cursor-pointer"
                >
                  {/* Glow effect */}
                  {(isHovered || isSelected) && (
                    <rect
                      x={-5}
                      y={-5}
                      width={150}
                      height={80}
                      rx={14}
                      fill="none"
                      stroke={colors.glow}
                      strokeWidth={8}
                      className="animate-pulse"
                    />
                  )}

                  {/* Node background */}
                  <rect
                    x={0}
                    y={0}
                    width={140}
                    height={70}
                    rx={10}
                    fill={isHovered || isSelected ? colors.bg : '#FFFFFF'}
                    stroke={isConnected && !isHovered ? '#2563EB' : colors.border}
                    strokeWidth={isHovered || isSelected || isConnected ? 3 : 2}
                    className="transition-all duration-200"
                  />

                  {/* Status indicator */}
                  <circle
                    cx={120}
                    cy={15}
                    r={6}
                    fill={colors.bg}
                  />

                  {/* Concept name */}
                  <text
                    x={70}
                    y={30}
                    textAnchor="middle"
                    className="text-sm font-semibold"
                    fill={isHovered || isSelected ? '#FFFFFF' : '#0F172A'}
                  >
                    {concept.name.length > 14 
                      ? concept.name.substring(0, 12) + '...' 
                      : concept.name}
                  </text>

                  {/* Accuracy */}
                  <text
                    x={70}
                    y={50}
                    textAnchor="middle"
                    className="text-xs"
                    fill={isHovered || isSelected ? 'rgba(255,255,255,0.8)' : '#64748B'}
                  >
                    {accuracy}% Accuracy
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
