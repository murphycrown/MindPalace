// TypeScript interfaces for Mind Palace graph data

export interface GraphNode {
  id: string;
  label: string;
  folder: string;
  orphan: boolean;
  tags: string[];
  date: string | null;
  path: string;
  type?: 'canvas';
  color?: string;
  degree?: number;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface FolderLegend {
  name: string;
  color: string;
}

export interface CanvasNodeData {
  id: string;
  type: 'file' | 'text' | 'group' | 'link';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  label?: string;
  file?: string;
  text?: string;
  url?: string;
}

export interface CanvasEdgeData {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide: 'left' | 'right' | 'top' | 'bottom';
  toSide: 'left' | 'right' | 'top' | 'bottom';
  color?: string;
  label?: string;
}

export interface CanvasData {
  id: string;
  label: string;
  folder: string;
  path: string;
  data: {
    nodes: CanvasNodeData[];
    edges: CanvasEdgeData[];
  } | null;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  folders: FolderLegend[];
  contents: Record<string, string>;
  aliases: Record<string, string>;
  images: Record<string, string>;
  canvases: Record<string, CanvasData>;
}

export interface WikilinkTarget {
  id: string;
  label: string;
  alias?: string;
}

export interface ResolvedWikilink {
  node: GraphNode | null;
  alias: string;
  target: string;
}