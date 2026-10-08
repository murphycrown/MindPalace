'use client';

import React from 'react';
import { CanvasData } from '@/lib/graph-types';

interface CanvasViewerProps {
  canvas: CanvasData;
  onClose: () => void;
}

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  canvas,
  onClose,
}) => {
  const nodes = canvas.data?.nodes || [];
  const edges = canvas.data?.edges || [];

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

      {/* Canvas Viewport */}
      <div className="flex-1 relative overflow-auto my-4 bg-slate-900/50 rounded-xl border border-slate-800/80 p-8">
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Canvas is empty or has no node data
          </div>
        ) : (
          <div className="relative min-h-[500px] min-w-[800px]">
            {nodes.map((n) => (
              <div
                key={n.id}
                style={{
                  position: 'absolute',
                  left: n.x,
                  top: n.y,
                  width: n.width,
                  height: n.height,
                }}
                className="rounded-lg bg-slate-800/90 border border-slate-700 p-3 shadow-lg flex flex-col text-xs text-slate-200 overflow-hidden"
              >
                <div className="font-semibold text-amber-300 mb-1 border-b border-slate-700/60 pb-1 truncate">
                  {n.label || n.type}
                </div>
                {n.text && <p className="text-slate-300 whitespace-pre-wrap truncate">{n.text}</p>}
                {n.file && <p className="text-blue-400 font-mono text-[10px] truncate">{n.file}</p>}
                {n.url && <p className="text-blue-400 font-mono text-[10px] truncate">{n.url}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
