"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DagNodeCard } from "@/components/dag-node-card";
import type { DagNodeData } from "@/lib/dag-layout";

const nodeTypes = { dagNode: DagNodeCard };

type Props = {
  initialNodes: Node<DagNodeData>[];
  initialEdges: Edge[];
  onNodeClick?: (nodeId: string) => void;
};

export function DagGraph({ initialNodes, initialEdges, onNodeClick }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick: NodeMouseHandler<Node<DagNodeData>> = useCallback(
    (_, node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

  return (
    <div className="h-[600px] w-full rounded-xl border border-slate-200 dark:border-slate-700">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange as OnNodesChange}
        onEdgesChange={onEdgesChange as OnEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as DagNodeData;
            switch (data.status) {
              case "completed":
              case "approved":
                return "#10b981";
              case "running":
                return "#3b82f6";
              case "needs_review":
                return "#f59e0b";
              case "rejected":
              case "failed":
                return "#ef4444";
              default:
                return "#94a3b8";
            }
          }}
        />
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
