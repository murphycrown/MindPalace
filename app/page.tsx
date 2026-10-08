'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GraphData, GraphNode as IGraphNode, CanvasData } from '@/lib/graph-types';
import { GraphNodeComponent } from '@/components/GraphNode';
import { SearchBar } from '@/components/SearchBar';
import { FolderLegend } from '@/components/FolderLegend';
import { SidePanel } from '@/components/SidePanel';
import { CanvasViewer } from '@/components/CanvasViewer';

const nodeTypes = {
  custom: GraphNodeComponent,
};

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    fetch('/graph-data.json')
      .then((res) => res.json())
      .then((data: GraphData) => {
        setGraphData(data);

        // Grid layout initialization for React Flow nodes
        const nodeCount = data.nodes.length;
        const cols = Math.ceil(Math.sqrt(nodeCount));
        const spacingX = 220;
        const spacingY = 120;

        const initialNodes: Node[] = data.nodes.map((n: IGraphNode, idx: number) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          return {
            id: n.id,
            type: 'custom',
            position: { x: col * spacingX, y: row * spacingY },
            data: {
              label: n.label,
              folder: n.folder,
              orphan: n.orphan,
              color: n.color,
              degree: n.degree,
              type: n.type,
              tags: n.tags,
            },
          };
        });

        const initialEdges: Edge[] = data.links.map((link, idx) => ({
          id: `e-${link.source}-${link.target}-${idx}`,
          source: link.source,
          target: link.target,
          animated: false,
          style: { stroke: '#475569', strokeWidth: 1.5, opacity: 0.6 },
        }));

        setNodes(initialNodes);
        setEdges(initialEdges);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load graph data:', err);
        setLoading(false);
      });
  }, [setNodes, setEdges]);

  // Update node dimming/visibility based on search and folder filters
  useEffect(() => {
    if (!graphData) return;

    const q = searchQuery.toLowerCase().trim();

    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        const matchesFolder = !selectedFolder || n.data.folder === selectedFolder;
        const matchesSearch =
          !q ||
          (n.data.label as string).toLowerCase().includes(q) ||
          ((n.data.tags as string[]) || []).some((t) => t.toLowerCase().includes(q));

        const isMatch = matchesFolder && matchesSearch;

        return {
          ...n,
          style: {
            opacity: isMatch ? 1 : 0.2,
            transition: 'opacity 0.2s ease-in-out',
          },
        };
      })
    );
  }, [searchQuery, selectedFolder, graphData, setNodes]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const selectedCanvas = useMemo((): CanvasData | null => {
    if (!selectedNodeId || !graphData) return null;
    return graphData.canvases[selectedNodeId] || null;
  }, [selectedNodeId, graphData]);

  const filteredCount = useMemo(() => {
    if (!graphData || !searchQuery) return undefined;
    const q = searchQuery.toLowerCase().trim();
    return graphData.nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    ).length;
  }, [graphData, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-950 text-slate-400">
        <div className="animate-pulse font-mono text-sm">Loading Mind Palace Graph...</div>
      </div>
    );
  }

  if (!graphData) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-950 text-red-400">
        <div className="font-mono text-sm">Error loading graph data.</div>
      </div>
    );
  }

  return (
    <main className="relative h-screen w-screen bg-slate-950 overflow-hidden">
      {/* Top Left Header & Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 shadow-lg backdrop-blur-sm">
          <h1 className="font-bold text-slate-100 text-sm mb-0.5">Mind Palace</h1>
          <p>{graphData.nodes.length} nodes · {graphData.links.length} links</p>
        </div>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          resultCount={filteredCount}
        />

        <FolderLegend
          folders={graphData.folders}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
        />
      </div>

      {/* Main Graph Viewport */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-950"
      >
        <Background color="#334155" gap={24} size={1} />
        <Controls className="fill-slate-300 bg-slate-900 border-slate-800" />
        <MiniMap
          nodeColor={(node) => (node.data?.color as string) || '#3b82f6'}
          className="bg-slate-900/90 border-slate-800 rounded-lg"
        />
      </ReactFlow>

      {/* Side Panel for Notes */}
      {selectedNodeId && !selectedCanvas && (
        <SidePanel
          nodeId={selectedNodeId}
          graphData={graphData}
          onClose={() => setSelectedNodeId(null)}
          onNavigateNote={(id) => setSelectedNodeId(id)}
        />
      )}

      {/* Canvas Overlay for .canvas files */}
      {selectedCanvas && (
        <CanvasViewer
          canvas={selectedCanvas}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </main>
  );
}
