/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Graph renderer for the Apex Symbol Graph webview
 * Handles Canvas-based graph visualization with force-directed layout
 */

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  size: number;
  color: string;
  type: 'class' | 'method' | 'property' | 'namespace' | 'block';
  namespace?: string;
  filePath?: string;
  line?: number;
  description?: string;
  originalX: number;
  originalY: number;
  fixed: boolean;
  // Additional properties from parser-ast GraphNode
  name?: string;
  kind?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  color: string;
}

/** Diagnostic from LSP (simplified for webview) */
export interface GraphDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  message: string;
  severity?: number;
  code?: string | number;
}

/** Diagnostic correlation with graph nodes/edges */
export interface GraphDiagnosticCorrelation {
  diagnostic: GraphDiagnostic;
  relatedNodeIds: string[];
  relatedEdgeIds: string[];
  analysis?: {
    isFalsePositive: boolean;
    reason: string;
    evidence: Array<{ type: string; description: string; nodeId?: string }>;
    suggestions?: string[];
  };
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  diagnostics?: GraphDiagnostic[];
  diagnosticCorrelations?: GraphDiagnosticCorrelation[];
}

export type LayoutType =
  | 'forceatlas2'
  | 'force'
  | 'dagre'
  | 'circular'
  | 'grid'
  | 'random';

export class GraphRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private camera = { x: 0, y: 0, zoom: 1 };
  private selectedNode: string | null = null;
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private animationId: number | null = null;
  private isSimulating = false;
  private labelsVisible = true;
  private vscode: any;
  private currentLayout: LayoutType = 'forceatlas2';
  private diagnosticHighlightNodeIds = new Set<string>();
  private diagnosticHighlightEdgeIds = new Set<string>();
  private diagnostics: GraphDiagnostic[] = [];
  private diagnosticCorrelations: GraphDiagnosticCorrelation[] = [];
  private diagnosticsHighlightEnabled = false;

  constructor(canvas: HTMLCanvasElement, vscode: any) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.vscode = vscode;
  }

  /**
   * Set up responsive canvas that maintains aspect ratio
   */
  private setupResponsiveCanvas(onInitialResize?: () => void): void {
    const resizeCanvas = (isInitial = false) => {
      const container = this.canvas.parentElement;
      if (!container) {
        console.warn('Canvas parent container not found');
        return;
      }

      // Use a small delay to ensure layout is complete
      setTimeout(() => {
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Use the full available space
        const width = Math.max(rect.width || 800, 400);
        const height = Math.max(rect.height || 600, 300);

        // Set display size to fill the container
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

        // Set actual canvas size (for crisp rendering)
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;

        // Reset context scale and apply device pixel ratio
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        console.log(
          'Canvas resized to:',
          width,
          height,
          'DPR:',
          dpr,
          'Container rect:',
          rect,
          'Canvas offset:',
          this.canvas.offsetWidth,
          this.canvas.offsetHeight,
        );

        // Re-render the graph
        if (this.nodes.length > 0) {
          this.render();
        }

        // Call callback on initial resize
        if (isInitial && onInitialResize) {
          onInitialResize();
        }
      }, 10);
    };

    // Initial resize
    resizeCanvas(true);

    // Add resize listener
    window.addEventListener('resize', () => resizeCanvas(false));

    // Store resize function for cleanup
    (this.canvas as any)._resizeHandler = resizeCanvas;
  }

  /**
   * Initialize the graph with data and start rendering
   */
  initGraph(data: GraphData): void {
    console.log('Initializing custom graph renderer...');
    console.log('Received graph data:', data);
    console.log('Number of nodes:', data.nodes?.length || 0);
    console.log('Number of edges:', data.edges?.length || 0);
    if (data.nodes && data.nodes.length > 0) {
      console.log('First node:', data.nodes[0]);
    }

    // Convert data to internal format with physics properties
    this.nodes = data.nodes.map((node, index) => {
      // Start with random positions in a circle
      const angle = (index / data.nodes.length) * 2 * Math.PI;
      const radius = 200;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 100;
      const y = Math.sin(angle) * radius + (Math.random() - 0.5) * 100;

      // Map the node properties correctly
      const rawType = node.kind || node.type || 'unknown';
      const nodeType = this.mapSymbolKindToType(rawType);
      const nodeLabel = node.name || node.label || 'undefined';

      return {
        ...node,
        id: node.id,
        label: nodeLabel,
        type: nodeType,
        x: x,
        y: y,
        vx: 0, // velocity x
        vy: 0, // velocity y
        fx: 0, // force x
        fy: 0, // force y
        size:
          nodeType === 'class'
            ? 20
            : nodeType === 'method'
              ? 12
              : nodeType === 'block'
                ? 6
                : 8,
        color: this.getNodeColor(nodeType),
        originalX: x,
        originalY: y,
        fixed: false, // whether node position is fixed
      };
    });

    console.log('Processing edges:', data.edges?.length || 0);
    if (data.edges && data.edges.length > 0) {
      console.log('First edge:', data.edges[0]);
    }

    this.edges = data.edges.map((edge) => {
      const edgeType = edge.type || 'unknown';
      const edgeColor = this.getEdgeColor(edgeType);

      // Check if source and target nodes exist
      const sourceExists = this.nodes.some((node) => node.id === edge.source);
      const targetExists = this.nodes.some((node) => node.id === edge.target);

      if (!sourceExists || !targetExists) {
        console.warn(
          `Edge ${edge.id}: source=${edge.source} (exists: ${sourceExists}), ` +
            `target=${edge.target} (exists: ${targetExists})`,
        );
      }

      console.log(
        `Edge ${edge.id}: type=${edgeType}, color=${edgeColor}, source=${edge.source}, target=${edge.target}`,
      );
      return {
        ...edge,
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edgeType,
        color: edgeColor,
      };
    });

    console.log(
      'Graph data loaded:',
      this.nodes.length,
      'nodes,',
      this.edges.length,
      'edges',
    );

    // Store diagnostics and correlations
    this.diagnostics = data.diagnostics ?? [];
    this.diagnosticCorrelations = data.diagnosticCorrelations ?? [];
    this.diagnosticHighlightNodeIds.clear();
    this.diagnosticHighlightEdgeIds.clear();
    if (
      this.diagnosticsHighlightEnabled &&
      this.diagnosticCorrelations.length > 0
    ) {
      this.diagnosticCorrelations.forEach((c) => {
        c.relatedNodeIds.forEach((id) =>
          this.diagnosticHighlightNodeIds.add(id),
        );
        c.relatedEdgeIds.forEach((id) =>
          this.diagnosticHighlightEdgeIds.add(id),
        );
      });
    }

    // Add event listeners
    this.setupEventListeners();

    // Initialize layout selection UI
    this.updateLayoutSelection();

    // Set up responsive canvas (this will trigger initial render)
    this.setupResponsiveCanvas(() => {
      // After canvas is sized, start simulation and center
      // Start force-directed simulation
      this.startSimulation();

      // Center the graph initially (after canvas is sized)
      setTimeout(() => {
        this.centerGraph();
        this.render();
      }, 50);
    });
  }

  private getNodeColor(type: string): string {
    switch (type) {
      case 'class':
        return '#4CAF50';
      case 'method':
        return '#2196F3';
      case 'property':
        return '#FF9800';
      case 'namespace':
        return '#9C27B0';
      case 'block':
        return '#78909C'; // Muted blue-gray to distinguish from semantic classes
      default:
        return '#666';
    }
  }

  private getEdgeColor(type: string | number): string {
    // Handle both string and numeric ReferenceType values
    const typeStr = String(type);

    switch (typeStr) {
      // String types (legacy)
      case 'contains':
        return '#4CAF50';
      case 'calls':
        return '#2196F3';
      case 'references':
        return '#FF9800';
      case 'inherits':
        return '#9C27B0';
      case 'implements':
        return '#E91E63';

      // Numeric ReferenceType values
      case '1': // METHOD_CALL
        return '#2196F3'; // Blue for calls
      case '2': // FIELD_ACCESS
        return '#FF9800'; // Orange for references
      case '3': // TYPE_REFERENCE
        return '#FF9800'; // Orange for references
      case '4': // INHERITANCE
        return '#9C27B0'; // Purple for inherits
      case '5': // INTERFACE_IMPLEMENTATION
        return '#E91E63'; // Pink for implements
      case '6': // CONSTRUCTOR_CALL
        return '#2196F3'; // Blue for calls
      case '7': // STATIC_ACCESS
        return '#2196F3'; // Blue for calls
      case '8': // INSTANCE_ACCESS
        return '#2196F3'; // Blue for calls
      case '9': // IMPORT_REFERENCE (used as "contains" relationship)
        return '#4CAF50'; // Green for contains
      case '10': // NAMESPACE_REFERENCE
        return '#4CAF50'; // Green for contains
      case '16': // PROPERTY_ACCESS
        return '#FF9800'; // Orange for references
      default:
        console.log(`Unknown edge type: ${type} (${typeStr})`);
        return '#666';
    }
  }

  private mapSymbolKindToType(
    kind: string,
  ): 'class' | 'method' | 'property' | 'namespace' | 'block' {
    switch (kind) {
      case 'class':
      case 'interface':
      case 'trigger':
      case 'enum':
        return 'class';
      case 'method':
      case 'constructor':
        return 'method';
      case 'property':
      case 'field':
      case 'variable':
      case 'parameter':
        return 'property';
      case 'namespace':
        return 'namespace';
      case 'block':
        return 'block';
      default:
        return 'class'; // Default to class for unknown types
    }
  }

  private startSimulation(): void {
    if (this.isSimulating) return;
    this.isSimulating = true;
    console.log('Starting force-directed simulation...');

    // Run simulation for a fixed number of iterations
    let iterations = 0;
    const maxIterations = 300;

    const tick = () => {
      if (iterations >= maxIterations) {
        this.isSimulating = false;
        console.log('Force simulation completed');
        return;
      }

      // Apply forces
      this.applyForces();

      // Update positions
      this.updatePositions();

      // Render
      this.render();

      iterations++;
      this.animationId = requestAnimationFrame(tick);
    };

    tick();
  }

  private applyForces(): void {
    // Reset forces
    this.nodes.forEach((node) => {
      node.fx = 0;
      node.fy = 0;
    });

    // Repulsion force between all nodes
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const nodeA = this.nodes[i];
        const nodeB = this.nodes[j];

        const dx = nodeA.x - nodeB.x;
        const dy = nodeA.y - nodeB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          const force = 1000 / (distance * distance); // Repulsion force
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          nodeA.fx += fx;
          nodeA.fy += fy;
          nodeB.fx -= fx;
          nodeB.fy -= fy;
        }
      }
    }

    // Attraction force for connected nodes
    this.edges.forEach((edge) => {
      const sourceNode = this.nodes.find((n) => n.id === edge.source);
      const targetNode = this.nodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          const force = distance * 0.01; // Attraction force
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          sourceNode.fx += fx;
          sourceNode.fy += fy;
          targetNode.fx -= fx;
          targetNode.fy -= fy;
        }
      }
    });
  }

  private updatePositions(): void {
    const damping = 0.9; // Damping factor to prevent infinite oscillation
    const timeStep = 0.1;

    this.nodes.forEach((node) => {
      if (node.fixed) return; // Skip fixed nodes

      // Update velocity
      node.vx = (node.vx + node.fx * timeStep) * damping;
      node.vy = (node.vy + node.fy * timeStep) * damping;

      // Update position
      node.x += node.vx * timeStep;
      node.y += node.vy * timeStep;

      // Keep nodes within reasonable bounds
      const maxDistance = 1000;
      const distance = Math.sqrt(node.x * node.x + node.y * node.y);
      if (distance > maxDistance) {
        node.x = (node.x / distance) * maxDistance;
        node.y = (node.y / distance) * maxDistance;
      }
    });
  }

  private setupEventListeners(): void {
    // Dropdown menu event listeners
    const resetBtn = document.getElementById('reset-btn');
    const centerBtn = document.getElementById('center-btn');
    const fitBtn = document.getElementById('fit-btn');
    const toggleLabelsBtn = document.getElementById('toggle-labels-btn');
    const restartSimulationBtn = document.getElementById(
      'restart-simulation-btn',
    );

    // Layout option event listeners
    const layoutButtons = [
      'layout-forceatlas2-btn',
      'layout-force-btn',
      'layout-dagre-btn',
      'layout-circular-btn',
      'layout-grid-btn',
      'layout-random-btn',
    ];

    // Prevent default link behavior and handle clicks
    const handleMenuClick = (e: Event, action: () => void) => {
      e.preventDefault();
      action();
    };

    resetBtn?.addEventListener('click', (e) =>
      handleMenuClick(e, () => this.resetView()),
    );
    centerBtn?.addEventListener('click', (e) =>
      handleMenuClick(e, () => this.centerGraph()),
    );
    fitBtn?.addEventListener('click', (e) =>
      handleMenuClick(e, () => this.fitToView()),
    );
    toggleLabelsBtn?.addEventListener('click', (e) =>
      handleMenuClick(e, () => this.toggleLabels()),
    );
    restartSimulationBtn?.addEventListener('click', (e) =>
      handleMenuClick(e, () => this.restartSimulation()),
    );

    const diagnosticToggleBtn = document.getElementById(
      'diagnostic-highlight-toggle',
    );
    diagnosticToggleBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleDiagnosticsHighlight();
    });

    // Layout selection event listeners
    layoutButtons.forEach((buttonId) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          const layoutType = buttonId
            .replace('layout-', '')
            .replace('-btn', '') as LayoutType;
          this.setLayout(layoutType);
        });
      }
    });

    // Canvas event listeners
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
  }

  private render(): void {
    // Ensure canvas is properly sized
    const canvasWidth =
      this.canvas.offsetWidth ||
      this.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight =
      this.canvas.offsetHeight ||
      this.canvas.height / (window.devicePixelRatio || 1);

    if (canvasWidth === 0 || canvasHeight === 0) {
      console.warn('Canvas not sized, skipping render', {
        offsetWidth: this.canvas.offsetWidth,
        offsetHeight: this.canvas.offsetHeight,
        width: this.canvas.width,
        height: this.canvas.height,
      });
      return;
    }

    // Clear the entire canvas (use display dimensions since context is scaled)
    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Debug: Log canvas dimensions and camera (only occasionally to avoid spam)
    if (Math.random() < 0.01) {
      console.log('Canvas dimensions:', this.canvas.width, this.canvas.height);
      console.log('Camera:', this.camera);
      console.log('Nodes count:', this.nodes.length);
    }

    // Apply camera transform
    this.ctx.save();
    this.ctx.translate(this.camera.x, this.camera.y);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);

    // Draw edges
    this.edges.forEach((edge) => {
      const sourceNode = this.nodes.find((n) => n.id === edge.source);
      const targetNode = this.nodes.find((n) => n.id === edge.target);

      if (!sourceNode) return;
      if (!targetNode) return;
      const isHighlighted = this.diagnosticHighlightEdgeIds.has(edge.id);
      const edgeColor = isHighlighted ? '#f44336' : edge.color;

      // Calculate arrow properties
      const dx = targetNode.x - sourceNode.x;
      const dy = targetNode.y - sourceNode.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const unitX = dx / distance;
        const unitY = dy / distance;
        const arrowLength = 12;
        const arrowWidth = 6;
        const offset = targetNode.size + 5; // Small gap from target node

        const arrowX = targetNode.x - unitX * offset;
        const arrowY = targetNode.y - unitY * offset;

        // Draw the edge line
        this.ctx.strokeStyle = edgeColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(sourceNode.x, sourceNode.y);
        this.ctx.lineTo(arrowX, arrowY);
        this.ctx.stroke();

        // Draw the arrowhead
        this.ctx.fillStyle = edgeColor;
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX, arrowY);
        this.ctx.lineTo(
          arrowX - unitX * arrowLength + unitY * arrowWidth,
          arrowY - unitY * arrowLength - unitX * arrowWidth,
        );
        this.ctx.lineTo(
          arrowX - unitX * arrowLength - unitY * arrowWidth,
          arrowY - unitY * arrowLength + unitX * arrowWidth,
        );
        this.ctx.closePath();
        this.ctx.fill();
      }
    });

    // Draw nodes
    this.nodes.forEach((node, index) => {
      const isHighlighted = this.diagnosticHighlightNodeIds.has(node.id);
      const nodeColor = isHighlighted ? '#f44336' : node.color;

      this.ctx.fillStyle = nodeColor;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
      this.ctx.fill();

      // Draw border for selected node or highlighted diagnostic node
      if (this.selectedNode === node.id) {
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      } else if (isHighlighted) {
        this.ctx.strokeStyle = '#f44336';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }

      // Draw labels
      if (this.labelsVisible) {
        this.ctx.fillStyle = 'var(--vscode-foreground, #000)';
        this.ctx.font = '12px var(--vscode-font-family, monospace)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(node.label, node.x, node.y + node.size + 15);
      }
    });

    this.ctx.restore();
  }

  private highlightDiagnosticCorrelation(index: number): void {
    const corr = this.diagnosticCorrelations[index];
    if (!corr) return;
    this.diagnosticHighlightNodeIds.clear();
    this.diagnosticHighlightEdgeIds.clear();
    corr.relatedNodeIds.forEach((id) =>
      this.diagnosticHighlightNodeIds.add(id),
    );
    corr.relatedEdgeIds.forEach((id) =>
      this.diagnosticHighlightEdgeIds.add(id),
    );
    this.render();
  }

  private toggleDiagnosticsHighlight(): void {
    this.diagnosticsHighlightEnabled = !this.diagnosticsHighlightEnabled;
    if (
      this.diagnosticsHighlightEnabled &&
      this.diagnosticCorrelations.length > 0
    ) {
      this.diagnosticCorrelations.forEach((c) => {
        c.relatedNodeIds.forEach((id) =>
          this.diagnosticHighlightNodeIds.add(id),
        );
        c.relatedEdgeIds.forEach((id) =>
          this.diagnosticHighlightEdgeIds.add(id),
        );
      });
    } else {
      this.diagnosticHighlightNodeIds.clear();
      this.diagnosticHighlightEdgeIds.clear();
    }
    this.render();
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
    const y = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;

    // Check if clicking on a node
    for (let node of this.nodes) {
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      if (distance <= node.size) {
        this.selectedNode = node.id;
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };

        // Fix the node position while dragging
        node.fixed = true;
        node.vx = 0;
        node.vy = 0;

        this.render();
        return;
      }
    }

    // Start panning
    this.isDragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY };
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    if (this.selectedNode) {
      // Drag node
      const node = this.nodes.find((n) => n.id === this.selectedNode);
      if (node) {
        const rect = this.canvas.getBoundingClientRect();
        node.x = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
        node.y = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;
        this.render();
      }
    } else {
      // Pan camera
      this.camera.x += e.clientX - this.dragStart.x;
      this.camera.y += e.clientY - this.dragStart.y;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.render();
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (this.selectedNode) {
      // Unfix the node and let it participate in simulation again
      const node = this.nodes.find((n) => n.id === this.selectedNode);
      if (node) {
        node.fixed = false;
      }
    }
    this.isDragging = false;
    this.selectedNode = null;
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = 0.1;
    const zoom = e.deltaY > 0 ? 1 - zoomFactor : 1 + zoomFactor;
    this.camera.zoom *= zoom;
    this.camera.zoom = Math.max(0.1, Math.min(5, this.camera.zoom));
    this.render();
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
    const y = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;

    // Check if clicking on a node
    for (let node of this.nodes) {
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      if (distance <= node.size) {
        console.log('Node clicked:', node);
        this.vscode.postMessage({ type: 'nodeClick', node });
        return;
      }
    }
  }

  private resetView(): void {
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.nodes.forEach((node) => {
      node.x = node.originalX;
      node.y = node.originalY;
      node.vx = 0;
      node.vy = 0;
      node.fixed = false;
    });
    this.render();
  }

  private restartSimulation(): void {
    // Stop current simulation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isSimulating = false;

    // Apply the current layout instead of defaulting to random
    this.applyLayout();
  }

  private centerGraph(): void {
    if (this.nodes.length === 0) {
      console.warn('Cannot center graph: no nodes');
      return;
    }

    // Ensure canvas has valid dimensions
    const canvasWidth =
      this.canvas.offsetWidth ||
      this.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight =
      this.canvas.offsetHeight ||
      this.canvas.height / (window.devicePixelRatio || 1);

    if (canvasWidth === 0 || canvasHeight === 0) {
      console.warn('Cannot center graph: canvas dimensions are 0', {
        offsetWidth: this.canvas.offsetWidth,
        offsetHeight: this.canvas.offsetHeight,
        width: this.canvas.width,
        height: this.canvas.height,
      });
      return;
    }

    const bounds = {
      minX: Math.min(...this.nodes.map((n) => n.x)),
      maxX: Math.max(...this.nodes.map((n) => n.x)),
      minY: Math.min(...this.nodes.map((n) => n.y)),
      maxY: Math.max(...this.nodes.map((n) => n.y)),
    };

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    this.camera.x = canvasWidth / 2 - centerX * this.camera.zoom;
    this.camera.y = canvasHeight / 2 - centerY * this.camera.zoom;

    console.log('Centered graph:', {
      canvasWidth,
      canvasHeight,
      centerX,
      centerY,
      camera: this.camera,
      bounds,
    });

    this.render();
  }

  private fitToView(): void {
    if (this.nodes.length === 0) return;

    const bounds = {
      minX: Math.min(...this.nodes.map((n) => n.x)),
      maxX: Math.max(...this.nodes.map((n) => n.x)),
      minY: Math.min(...this.nodes.map((n) => n.y)),
      maxY: Math.max(...this.nodes.map((n) => n.y)),
    };

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    if (width === 0 || height === 0) return;

    const canvasWidth = this.canvas.offsetWidth;
    const canvasHeight = this.canvas.offsetHeight;
    const padding = 50; // pixels of padding around the graph

    const scaleX = (canvasWidth - padding * 2) / width;
    const scaleY = (canvasHeight - padding * 2) / height;
    const scale = Math.min(scaleX, scaleY, 2); // Cap zoom at 2x

    this.camera.x = canvasWidth / 2 - centerX * scale;
    this.camera.y = canvasHeight / 2 - centerY * scale;
    this.camera.zoom = scale;

    console.log('Fit to view:', {
      width,
      height,
      canvasWidth,
      canvasHeight,
      scale,
    });
    this.render();
  }

  private toggleLabels(): void {
    this.labelsVisible = !this.labelsVisible;
    this.render();
  }

  private setLayout(layoutType: LayoutType): void {
    this.currentLayout = layoutType;
    this.updateLayoutSelection();
    this.applyLayout();
  }

  private updateLayoutSelection(): void {
    // Remove active class from all layout options
    document.querySelectorAll('.layout-option').forEach((option) => {
      option.classList.remove('active');
    });

    // Add active class to current layout
    const currentOption = document.getElementById(
      `layout-${this.currentLayout}-btn`,
    );
    currentOption?.classList.add('active');
  }

  private applyLayout(): void {
    // Stop current simulation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isSimulating = false;

    // Apply the selected layout
    switch (this.currentLayout) {
      case 'forceatlas2':
        this.applyForceAtlas2Layout();
        break;
      case 'force':
        this.applyForceLayout();
        break;
      case 'dagre':
        this.applyDagreLayout();
        break;
      case 'circular':
        this.applyCircularLayout();
        break;
      case 'grid':
        this.applyGridLayout();
        break;
      case 'random':
        this.applyRandomLayout();
        break;
    }

    // Start simulation for force-based layouts
    if (['forceatlas2', 'force'].includes(this.currentLayout)) {
      this.startSimulation();
    } else {
      // For non-force layouts, center the graph and render
      this.centerGraph();
      this.render();
    }
  }

  private applyForceAtlas2Layout(): void {
    // Enhanced force-directed layout (similar to current implementation)
    this.nodes.forEach((node, index) => {
      const angle = (index / this.nodes.length) * 2 * Math.PI;
      const radius = 200;
      node.x = Math.cos(angle) * radius + (Math.random() - 0.5) * 100;
      node.y = Math.sin(angle) * radius + (Math.random() - 0.5) * 100;
      node.vx = 0;
      node.vy = 0;
      node.fixed = false;
    });
  }

  private applyForceLayout(): void {
    // Simple force-directed layout
    this.nodes.forEach((node, index) => {
      const angle = (index / this.nodes.length) * 2 * Math.PI;
      const radius = 150;
      node.x = Math.cos(angle) * radius;
      node.y = Math.sin(angle) * radius;
      node.vx = 0;
      node.vy = 0;
      node.fixed = false;
    });
  }

  private applyDagreLayout(): void {
    // Hierarchical layout - arrange nodes in levels
    const typeOrder = ['namespace', 'class', 'block', 'method', 'property'];
    const levelHeight = 120;
    const nodeSpacing = 100;
    const centerX = 0; // Center around origin
    const centerY = 0;

    // Group nodes by type and assign levels
    const nodesByType: Record<string, GraphNode[]> = {};
    this.nodes.forEach((node) => {
      if (!nodesByType[node.type]) {
        nodesByType[node.type] = [];
      }
      nodesByType[node.type].push(node);
    });

    // Position nodes by type
    let currentLevel = 0;
    typeOrder.forEach((type) => {
      const typeNodes = nodesByType[type] || [];
      if (typeNodes.length === 0) return;

      typeNodes.forEach((node, index) => {
        const totalInType = typeNodes.length;
        const startX = centerX - ((totalInType - 1) * nodeSpacing) / 2;

        node.x = startX + index * nodeSpacing;
        node.y = centerY + currentLevel * levelHeight;
        node.vx = 0;
        node.vy = 0;
        node.fixed = false;
      });

      currentLevel++;
    });

    // Handle any remaining types not in the order
    Object.keys(nodesByType).forEach((type) => {
      if (!typeOrder.includes(type)) {
        const typeNodes = nodesByType[type] || [];
        typeNodes.forEach((node, index) => {
          const totalInType = typeNodes.length;
          const startX = centerX - ((totalInType - 1) * nodeSpacing) / 2;

          node.x = startX + index * nodeSpacing;
          node.y = centerY + currentLevel * levelHeight;
          node.vx = 0;
          node.vy = 0;
          node.fixed = false;
        });
        currentLevel++;
      }
    });
  }

  private applyCircularLayout(): void {
    const radius =
      Math.min(this.canvas.offsetWidth, this.canvas.offsetHeight) / 3;
    this.nodes.forEach((node, index) => {
      const angle = (index / this.nodes.length) * 2 * Math.PI;
      node.x = Math.cos(angle) * radius;
      node.y = Math.sin(angle) * radius;
      node.vx = 0;
      node.vy = 0;
      node.fixed = false;
    });
  }

  private applyGridLayout(): void {
    const cols = Math.ceil(Math.sqrt(this.nodes.length));
    const spacing = 120;

    this.nodes.forEach((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      node.x = (col - (cols - 1) / 2) * spacing;
      node.y = (row - (Math.ceil(this.nodes.length / cols) - 1) / 2) * spacing;
      node.vx = 0;
      node.vy = 0;
      node.fixed = false;
    });
  }

  private applyRandomLayout(): void {
    const maxX = this.canvas.offsetWidth / 2;
    const maxY = this.canvas.offsetHeight / 2;

    this.nodes.forEach((node) => {
      node.x = (Math.random() - 0.5) * maxX;
      node.y = (Math.random() - 0.5) * maxY;
      node.vx = 0;
      node.vy = 0;
      node.fixed = false;
    });
  }

  private groupNodesByType(): Record<string, number> {
    const groups: Record<string, number> = {};
    this.nodes.forEach((node) => {
      groups[node.type] = (groups[node.type] || 0) + 1;
    });
    return groups;
  }
}
