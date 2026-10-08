'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

export interface GraphNodeData {
  label: string;
  folder: string;
  orphan: boolean;
  color?: string;
  degree?: number;
  type?: 'canvas';
  tags?: string[];
  [key: string]: unknown;
}

export type CustomNodeProps = Node<GraphNodeData>;

export const GraphNodeComponent: React.FC<NodeProps<CustomNodeProps>> = memo(({ data, selected }) => {
  const isCanvas = data.type === 'canvas';
  const isOrphan = data.orphan;
  const color = data.color || (isOrphan ? '#475569' : '#3b82f6');

  return (
    <div
      className={`group relative flex items-center gap-2 rounded-full px-3 py-1.5 transition-all shadow-md cursor-pointer border ${
        selected
          ? 'ring-2 ring-blue-400 border-blue-400 scale-105 z-20'
          : 'border-slate-800 hover:border-slate-600 hover:scale-102'
      } ${
        isOrphan
          ? 'bg-slate-900/80 text-slate-400 italic border-dashed'
          : isCanvas
          ? 'bg-amber-950/70 text-amber-200 border-amber-800/80'
          : 'bg-slate-900/90 text-slate-100'
      }`}
      style={{
        boxShadow: selected ? `0 0 12px ${color}` : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0 w-1 h-1" />
      <span
        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs font-medium tracking-tight whitespace-nowrap">
        {data.label}
      </span>
      {isCanvas && (
        <span className="ml-1 text-[10px] font-mono bg-amber-900/60 text-amber-300 px-1 py-0.2 rounded">
          canvas
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="opacity-0 w-1 h-1" />
    </div>
  );
});

GraphNodeComponent.displayName = 'GraphNodeComponent';
