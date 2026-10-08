'use client';

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CanvasData } from '@/lib/graph-types';

import { resolveImage } from '@/lib/utils';

interface CanvasViewerProps {
  canvas: CanvasData;
  images?: Record<string, string>;
  aliases?: Record<string, string>;
  onNavigateNote?: (nodeId: string) => void;
  onClose: () => void;
}

// Custom Node for Canvas cards/notes/files/images
const CanvasNodeComponent: React.FC<NodeProps> = ({ data }) => {
  const nodeData = data as {
    label?: string;
    type?: string;
    text?: string;
    file?: string;
    url?: string;
    color?: string;
    images?: Record<string, string>;
    aliases?: Record<string, string>;
    onNavigateNote?: (nodeId: string) => void;
  };

  const isImageFile = nodeData.file && /\.(png|jpe?g|gif|svg|webp|avif|bmp)$/i.test(nodeData.file);
  const resolvedImgSrc = isImageFile && nodeData.images ? resolveImage(nodeData.file!, nodeData.images) : null;

  const resolvedNoteId =
    nodeData.file && !isImageFile && nodeData.aliases
      ? nodeData.aliases[nodeData.file.replace(/\.md$/, '').toLowerCase()]
      : null;

  return (
    <div className="bg-slate-800/95 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs text-slate-200 min-w-[180px] max-w-[500px] h-full flex flex-col justify-between overflow-hidden">
      <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Left} className="!bg-amber-400 !w-2.5 !h-2.5" />

      <div className="h-full flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1.5 mb-2">
          <span className="font-semibold text-amber-300 truncate">
            {nodeData.label || nodeData.file || nodeData.type || 'Card'}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-400 border border-slate-800">
            {nodeData.type || (isImageFile ? 'image' : 'text')}
          </span>
        </div>

        {nodeData.text && (
          <div className="text-slate-300 whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-[300px] overflow-y-auto pr-1">
            {nodeData.text}
          </div>
        )}

        {isImageFile && (
          <div className="flex-1 flex items-center justify-center bg-slate-950/60 rounded border border-slate-800 overflow-hidden my-1 p-1">
            {resolvedImgSrc ? (
              <img
                src={resolvedImgSrc}
                alt={nodeData.file}
                className="max-h-[350px] w-auto max-w-full object-contain rounded"
              />
            ) : (
              <div className="text-amber-400/80 italic font-mono text-[11px] p-2 text-center">
                📷 {nodeData.file}
              </div>
            )}
          </div>
        )}

        {!isImageFile && nodeData.file && (
          <div className="my-1">
            {resolvedNoteId && nodeData.onNavigateNote ? (
              <button
                onClick={() => nodeData.onNavigateNote!(resolvedNoteId)}
                className="w-full text-left text-blue-400 hover:text-blue-300 font-mono text-[11px] bg-slate-900/80 hover:bg-slate-900 p-2 rounded border border-slate-800 transition-colors flex items-center gap-1.5 truncate"
              >
                <span>📄</span>
                <span className="truncate">{nodeData.file}</span>
              </button>
            ) : (
              <div className="text-blue-400 font-mono text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800 flex items-center gap-1.5">
                <span>📄</span>
                <span className="truncate">{nodeData.file}</span>
              </div>
            )}
          </div>
        )}

        {nodeData.url && (
          <a
            href={nodeData.url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 underline font-mono text-[11px] truncate block hover:text-blue-300 my-1"
          >
            🔗 {nodeData.url}
          </a>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-400 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} className="!bg-amber-400 !w-2.5 !h-2.5" />
    </div>
  );
};

const nodeTypes = {
  canvasCard: CanvasNodeComponent,
};

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  canvas,
  images = {},
  aliases = {},
  onNavigateNote,
  onClose,
}) => {
  const rawNodes = canvas.data?.nodes || [];
  const rawEdges = canvas.data?.edges || [];

  const flowNodes: Node[] = useMemo(() => {
    return rawNodes.map((n) => ({
      id: n.id,
      type: 'canvasCard',
      position: { x: n.x, y: n.y },
      style: {
        width: n.width || 320,
        height: n.height || 220,
      },
      data: {
        label: n.label,
        type: n.type,
        text: n.text,
        file: n.file,
        url: n.url,
        color: n.color,
        images,
        aliases,
        onNavigateNote,
      },
    }));
  }, [rawNodes, images, aliases, onNavigateNote]);

  const flowEdges: Edge[] = useMemo(() => {
    return rawEdges.map((e) => ({
      id: e.id,
      source: e.fromNode,
      target: e.toNode,
      label: e.label,
      animated: true,
      style: { stroke: '#fbbf24', strokeWidth: 2 },
      labelStyle: { fill: '#fef3c7', fontWeight: 600, fontSize: 11 },
      labelBgStyle: { fill: '#1e293b', rx: 4, ry: 4 },
    }));
  }, [rawEdges]);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="bg-amber-900/60 text-amber-300 text-xs px-2 py-0.5 rounded font-mono">
              canvas
            </span>
            {canvas.label}
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{canvas.path}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-100 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors text-xs font-semibold"
        >
          Close Canvas
        </button>
      </div>

      {/* Canvas Viewport with React Flow */}
      <div className="flex-1 relative my-4 bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
        {flowNodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Canvas is empty or has no node data
          </div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            colorMode="dark"
          >
            <Background color="#334155" gap={20} size={1} />
            <Controls className="bg-slate-900 border-slate-800 fill-slate-200" />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};
