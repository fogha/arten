"use client"

import { useCallback, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  Connection,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Play, Save } from 'lucide-react';
import type { FlowNode, FlowEdge, TestFlow, TestResult } from '@/types/flow';
import 'reactflow/dist/style.css';

// Custom node types
import ActionNode from '@/components/flow/ActionNode';
import ConditionNode from '@/components/flow/ConditionNode';
import AssertionNode from '@/components/flow/AssertionNode';
import InputNode from '@/components/flow/InputNode';
import WaitNode from '@/components/flow/WaitNode';

const nodeTypes = {
  action: ActionNode,
  condition: ConditionNode,
  assertion: AssertionNode,
  input: InputNode,
  wait: WaitNode
};

import { DOMNode } from '@/types/dom';
import { isDOMNode } from '@/core/dom/domUtils';

interface FlowStudioProps {
  selectedNode: Element | DOMNode | null;
  onRunFlow?: (flow: TestFlow) => Promise<void>;
}

export const FlowStudio = ({ selectedNode, onRunFlow }: FlowStudioProps) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const addActionFromSelection = useCallback(() => {
    if (!selectedNode) return;

    const newNode: FlowNode = {
      id: crypto.randomUUID(),
      type: 'action',
      position: { x: 100, y: 100 },
      data: {
        label: `Click ${selectedNode.tagName.toLowerCase()}`,
        action: {
          type: 'click',
          selector: generateSelector(selectedNode),
        },
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [selectedNode]);

  const generateSelector = (element: Element | DOMNode): string => {
    // Check if this is a DOMNode or an Element
    const isDomNodeObj = isDOMNode(element);
    
    // Handle id
    if (isDomNodeObj) {
      if (element.id) return `#${element.id}`;
    } else {
      if ((element as Element).id) return `#${(element as Element).id}`;
    }
    
    // Get tagName
    let selector = element.tagName.toLowerCase();
    
    // Handle className
    if (isDomNodeObj) {
      if (element.className) {
        selector += `.${element.className.split(' ').join('.')}`;
      }
    } else {
      const el = element as Element;
      const className = typeof el.className === 'string' ? el.className : (el.className as any)?.baseVal || '';
      if (className) {
        selector += `.${className.split(' ').join('.')}`;
      }
      
      // Add nth-child if needed (only for actual DOM elements)
      const parent = el.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(el) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    
    return selector;
  };

  const handleSaveFlow = () => {
    const flow: TestFlow = {
      id: crypto.randomUUID(),
      name: flowName,
      description: flowDescription,
      nodes: nodes as FlowNode[],
      edges: edges as FlowEdge[],
    };
    // TODO: Implement flow persistence
    console.log('Saving flow:', flow);
  };

  const validateFlow = (flow: TestFlow): boolean => {
    const hasStartNode = flow.nodes.some(node => 
      node.type === 'action' && 
      node.data.action?.type === 'start'
    );
    if (!hasStartNode) return false;

    const connectedNodes = new Set<string>();
    flow.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    
    return flow.nodes.every(node => connectedNodes.has(node.id));
  };

  const handleRunFlow = async () => {
    const flow: TestFlow = {
      id: crypto.randomUUID(),
      name: flowName,
      description: flowDescription,
      nodes: nodes as FlowNode[],
      edges: edges as FlowEdge[],
    };

    if (!validateFlow(flow)) {
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    try {
      if (onRunFlow) {
        await onRunFlow(flow);
      } else {
        console.warn('No onRunFlow handler provided');
      }
    } catch (error) {
      console.error('Error running flow:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-none shadow-none h-full">
      <CardHeader>
        <CardTitle className="text-lg">Flow Studio</CardTitle>
        <div className="space-y-2">
          <Input
            placeholder="Flow name"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
          />
          <Textarea
            placeholder="Flow description"
            value={flowDescription}
            onChange={(e) => setFlowDescription(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[500px] border rounded-md">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={addActionFromSelection}
            disabled={!selectedNode}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Action
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleRunFlow}
            disabled={nodes.length === 0}
          >
            <Play className="w-4 h-4 mr-1" />
            Run Flow
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveFlow}
            disabled={!flowName}
          >
            <Save className="w-4 h-4 mr-1" />
            Save Flow
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
