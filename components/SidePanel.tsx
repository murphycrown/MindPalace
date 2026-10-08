'use client';

import React, { useState, useMemo } from 'react';
import { GraphData, GraphNode } from '@/lib/graph-types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface SidePanelProps {
  nodeId: string;
  graphData: GraphData;
  onClose: () => void;
  onNavigateNote: (nodeId: string) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  nodeId,
  graphData,
  onClose,
  onNavigateNote,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const node = useMemo(() => {
    return graphData.nodes.find((n) => n.id === nodeId) || null;
  }, [graphData, nodeId]);

  const content = useMemo(() => {
    return graphData.contents[nodeId] || '';
  }, [graphData, nodeId]);

  // Backlinks (nodes linking to current node)
  const backlinks = useMemo(() => {
    const sourceIds = graphData.links
      .filter((l) => l.target === nodeId)
      .map((l) => l.source);
    return graphData.nodes.filter((n) => sourceIds.includes(n.id));
  }, [graphData, nodeId]);

  // Outlinks (nodes linked from current node)
  const outlinks = useMemo(() => {
    const targetIds = graphData.links
      .filter((l) => l.source === nodeId)
      .map((l) => l.target);
    return graphData.nodes.filter((n) => targetIds.includes(n.id));
  }, [graphData, nodeId]);

  if (!node) return null;

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-md z-50 flex flex-col p-6 animate-in fade-in duration-200 overflow-hidden">
        {/* Full Screen Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFullScreen(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-xs font-semibold"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {node.label}
              </h1>
              <p className="text-xs text-slate-400 capitalize">{node.folder}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullScreen(false)}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              Exit Full Screen
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 p-1.5 rounded-md hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Full Screen Content Body */}
        <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full py-6 px-4 space-y-6">
          {/* Metadata */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-800/60">
            {node.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-mono bg-slate-800 text-blue-300 px-2.5 py-0.5 rounded-full border border-slate-700/60"
              >
                #{tag}
              </span>
            ))}
            {node.date && (
              <span className="text-xs font-mono bg-slate-800/60 text-slate-400 px-2 py-0.5 rounded-full">
                {node.date}
              </span>
            )}
          </div>

          {node.orphan ? (
            <div className="text-sm text-slate-400 italic bg-slate-900 p-4 rounded-lg border border-slate-800">
              This is an orphan node target. The note content does not exist yet.
            </div>
          ) : (
            <MarkdownRenderer
              content={content}
              aliases={graphData.aliases}
              images={graphData.images}
              onNavigateNote={onNavigateNote}
            />
          )}

          {/* Links Section in Full Screen */}
          <div className="border-t border-slate-800 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {outlinks.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Outlinks ({outlinks.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {outlinks.map((linkNode) => (
                    <button
                      key={linkNode.id}
                      onClick={() => onNavigateNote(linkNode.id)}
                      className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-2.5 py-1 rounded transition-colors"
                    >
                      {linkNode.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {backlinks.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Backlinks ({backlinks.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {backlinks.map((linkNode) => (
                    <button
                      key={linkNode.id}
                      onClick={() => onNavigateNote(linkNode.id)}
                      className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-2.5 py-1 rounded transition-colors"
                    >
                      {linkNode.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 right-0 h-screen w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
        <div>
          <h2 className="text-base font-bold text-slate-100 truncate max-w-[200px]">
            {node.label}
          </h2>
          <p className="text-xs text-slate-400 capitalize">{node.folder}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsFullScreen(true)}
            title="Open in full screen"
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-md hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1 border border-slate-800"
          >
            <span>⛶</span>
            <span>Full</span>
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-md hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Metadata Chips */}
      <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950/40 border-b border-slate-800/80">
        {node.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] font-mono bg-slate-800 text-blue-300 px-2 py-0.5 rounded-full border border-slate-700/60"
          >
            #{tag}
          </span>
        ))}
        {node.date && (
          <span className="text-[10px] font-mono bg-slate-800/60 text-slate-400 px-2 py-0.5 rounded-full">
            {node.date}
          </span>
        )}
      </div>

      {/* Body Content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {node.orphan ? (
          <div className="text-xs text-slate-400 italic bg-slate-950 p-3 rounded-lg border border-slate-800">
            This is an orphan node target. The note content does not exist yet.
          </div>
        ) : (
          <MarkdownRenderer
            content={content}
            aliases={graphData.aliases}
            images={graphData.images}
            onNavigateNote={onNavigateNote}
          />
        )}

        {/* Links section */}
        <div className="border-t border-slate-800 pt-3 space-y-3">
          {/* Outlinks */}
          {outlinks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Outlinks ({outlinks.length})
              </h3>
              <div className="flex flex-wrap gap-1">
                {outlinks.map((linkNode) => (
                  <button
                    key={linkNode.id}
                    onClick={() => onNavigateNote(linkNode.id)}
                    className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded transition-colors"
                  >
                    {linkNode.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Backlinks */}
          {backlinks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Backlinks ({backlinks.length})
              </h3>
              <div className="flex flex-wrap gap-1">
                {backlinks.map((linkNode) => (
                  <button
                    key={linkNode.id}
                    onClick={() => onNavigateNote(linkNode.id)}
                    className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded transition-colors"
                  >
                    {linkNode.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
