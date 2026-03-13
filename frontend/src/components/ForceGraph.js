import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';

const NODE_COLORS = {
  concept: '#7c3aed',
  tech: '#3B82F6',
  project: '#f59e0b',
  decision: '#ef4444',
  stock: '#22c55e',
  person: '#ec4899',
  event: '#06b6d4',
  organization: '#f97316',
};

const NODE_TYPE_LABELS = {
  concept: '개념',
  tech: '기술',
  project: '프로젝트',
  decision: '결정',
  stock: '주식',
  person: '인물',
  event: '이벤트',
  organization: '조직',
};

const DEFAULT_COLOR = '#6b7280';

function getNodeRadius(connections) {
  return Math.max(6, Math.min(20, 6 + connections * 1.5));
}

function getNodeColor(nodeType) {
  return NODE_COLORS[nodeType] || DEFAULT_COLOR;
}

export default function ForceGraph({ nodes, edges, selectedNodeId, onNodeClick }) {
  const canvasRef = useRef(null);
  const simRef = useRef(null);
  const transformRef = useRef(d3.zoomIdentity);
  const hoveredRef = useRef(null);
  const hoverAnimRef = useRef(0);
  const animFrameRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  // Node animation refs
  const nodeOpacityRef = useRef(new Map());     // id -> current opacity (0~1)
  const prevNodesMapRef = useRef(new Map());    // id -> { x, y, node_type, connections, title }
  const prevNodeIdsRef = useRef(new Set());
  const exitingNodesRef = useRef([]);           // [{ id, x, y, node_type, connections, _opacity }]

  // Build adjacency set for selected node highlighting
  const connectedSetRef = useRef(new Set());
  const connectedEdgesRef = useRef(new Set());

  useEffect(() => {
    const set = new Set();
    const edgeSet = new Set();
    if (selectedNodeId != null) {
      edges.forEach((e) => {
        const src = typeof e.source === 'object' ? e.source.id : e.source;
        const tgt = typeof e.target === 'object' ? e.target.id : e.target;
        if (src === selectedNodeId || tgt === selectedNodeId) {
          set.add(src);
          set.add(tgt);
          edgeSet.add(e.id);
        }
      });
    }
    connectedSetRef.current = set;
    connectedEdgesRef.current = edgeSet;
  }, [selectedNodeId, edges]);

  // Build node map for quick lookup
  const nodeMapRef = useRef(new Map());
  useEffect(() => {
    const m = new Map();
    nodes.forEach((n) => m.set(n.id, n));
    nodeMapRef.current = m;
  }, [nodes]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const t = transformRef.current;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    const hasSelection = selectedNodeId != null;
    const connSet = connectedSetRef.current;
    const connEdges = connectedEdgesRef.current;

    // Draw edges
    edges.forEach((e) => {
      const src = typeof e.source === 'object' ? e.source : nodeMapRef.current.get(e.source);
      const tgt = typeof e.target === 'object' ? e.target : nodeMapRef.current.get(e.target);
      if (!src || !tgt || src.x == null || tgt.x == null) return;

      const highlighted = hasSelection && connEdges.has(e.id);
      const dimmed = hasSelection && !highlighted;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = dimmed
        ? 'rgba(200,200,200,0.15)'
        : `rgba(100,116,139,${Math.min(1, 0.15 + (e.weight || 1) * 0.2)})`;
      ctx.lineWidth = highlighted ? 1.5 : 0.8;
      ctx.stroke();
    });

    // Draw exiting nodes (fading out)
    exitingNodesRef.current.forEach((n) => {
      if (n.x == null) return;
      const r = getNodeRadius(n.connections || 0);
      const color = getNodeColor(n.node_type);
      ctx.globalAlpha = Math.max(0, n._opacity);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * n._opacity, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw nodes
    nodes.forEach((n) => {
      if (n.x == null) return;
      const r = getNodeRadius(n.connections || 0);
      const color = getNodeColor(n.node_type);
      const isSelected = n.id === selectedNodeId;
      const isConnected = connSet.has(n.id);
      const dimmed = hasSelection && !isSelected && !isConnected;
      const isHovered = hoveredRef.current === n.id;
      const opacity = nodeOpacityRef.current.get(n.id) ?? 1;

      ctx.globalAlpha = opacity;

      // Draw node circle
      const drawR = r * (0.3 + 0.7 * opacity); // scale up as appearing
      ctx.beginPath();
      ctx.arc(n.x, n.y, drawR, 0, 2 * Math.PI);
      ctx.fillStyle = dimmed ? `${color}33` : color;
      ctx.fill();

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawR + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = '#1d1d1f';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawR + 6, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (isHovered && !isSelected) {
        const pulse = Math.sin(hoverAnimRef.current * 0.08) * 0.5 + 0.5;
        const glowRadius = drawR + 4 + pulse * 4;

        // Outer glow
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowRadius + 4, 0, 2 * Math.PI);
        ctx.fillStyle = `${color}15`;
        ctx.fill();

        // Inner glow ring
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}88`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Redraw node slightly larger
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawR + 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      }

      // Label for larger or selected/hovered nodes
      if ((r >= 10 || isSelected || isHovered || isConnected) && opacity > 0.4) {
        const label = n.title.length > 18 ? n.title.slice(0, 16) + '...' : n.title;
        ctx.font = `${isSelected ? 'bold ' : ''}${isSelected ? 12 : 10}px -apple-system, "Noto Sans KR", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = dimmed ? 'rgba(0,0,0,0.15)' : 'rgba(30,30,30,0.85)';
        ctx.fillText(label, n.x, n.y + drawR + 4);
      }

      ctx.globalAlpha = 1;
    });

    ctx.restore();
  }, [nodes, edges, selectedNodeId]);

  // Initialize simulation with enter/exit animation
  useEffect(() => {
    if (!nodes.length) {
      simRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    const w = canvas.width;
    const h = canvas.height;
    const prevMap = prevNodesMapRef.current;
    const prevIds = prevNodeIdsRef.current;
    const shouldAnimate = prevIds.size > 0;
    const newIds = new Set();

    // Apply saved positions and set up entering/exiting
    nodes.forEach((n) => {
      newIds.add(n.id);
      const prev = prevMap.get(n.id);
      if (prev) {
        n.x = prev.x;
        n.y = prev.y;
        n.vx = 0;
        n.vy = 0;
      }
      if (shouldAnimate && !prevIds.has(n.id)) {
        nodeOpacityRef.current.set(n.id, 0);
      } else {
        nodeOpacityRef.current.set(n.id, 1);
      }
    });

    // Create exiting nodes
    if (shouldAnimate) {
      const exiting = [];
      for (const [id] of prevMap) {
        if (!newIds.has(id)) {
          const prev = prevMap.get(id);
          if (prev && prev.x != null) {
            exiting.push({
              id, x: prev.x, y: prev.y,
              node_type: prev.node_type,
              connections: prev.connections || 0,
              _opacity: 1,
            });
          }
        }
      }
      exitingNodesRef.current = exiting;
    }

    prevNodeIdsRef.current = newIds;

    const sim = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(edges)
          .id((d) => d.id)
          .distance(80)
          .strength((d) => Math.min(1, (d.weight || 1) * 0.3))
      )
      .force('charge', d3.forceManyBody().strength(-120).distanceMax(300))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide().radius((d) => getNodeRadius(d.connections || 0) + 4))
      .alphaDecay(0.02)
      .on('tick', () => {
        // Lerp entering node opacities
        for (const [id, opacity] of nodeOpacityRef.current.entries()) {
          if (opacity < 1) {
            nodeOpacityRef.current.set(id, Math.min(1, opacity + 0.025));
          }
        }
        // Lerp exiting node opacities
        exitingNodesRef.current = exitingNodesRef.current.filter((n) => {
          n._opacity = Math.max(0, n._opacity - 0.03);
          return n._opacity > 0;
        });
        draw();
      });

    simRef.current = sim;

    return () => {
      // Save current positions before destroying
      const posMap = new Map();
      nodes.forEach((n) => {
        if (n.x != null) {
          posMap.set(n.id, {
            x: n.x, y: n.y,
            node_type: n.node_type,
            connections: n.connections || 0,
            title: n.title,
          });
        }
      });
      prevNodesMapRef.current = posMap;
      sim.stop();
    };
  }, [nodes, edges, draw]);

  // Redraw on selection change
  useEffect(() => {
    draw();
  }, [selectedNodeId, draw]);

  // Resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      draw();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draw]);

  // Zoom + pan + drag + click
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const findNode = (mx, my) => {
      const t = transformRef.current;
      const x = (mx - t.x) / t.k;
      const y = (my - t.y) / t.k;
      let closest = null;
      let minDist = Infinity;
      for (const n of nodes) {
        if (n.x == null) continue;
        const dx = n.x - x;
        const dy = n.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const r = getNodeRadius(n.connections || 0);
        if (dist < r + 4 && dist < minDist) {
          closest = n;
          minDist = dist;
        }
      }
      return closest;
    };

    // Zoom
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        draw();
      });

    const sel = d3.select(canvas);
    sel.call(zoom);

    // Drag
    let dragNode = null;
    let wasDragged = false;

    sel.on('mousedown.drag', (event) => {
      const node = findNode(event.offsetX, event.offsetY);
      if (node) {
        dragNode = node;
        wasDragged = false;
        canvas.style.cursor = 'grabbing';
        event.stopPropagation();
        sel.on('.zoom', null);
      }
    });

    sel.on('mousemove.drag', (event) => {
      const hovered = findNode(event.offsetX, event.offsetY);
      const prevHovered = hoveredRef.current;
      hoveredRef.current = hovered ? hovered.id : null;

      // Update cursor
      if (!dragNode) {
        canvas.style.cursor = hovered ? 'pointer' : 'default';
      }

      if ((hovered ? hovered.id : null) !== prevHovered) {
        if (hovered) {
          setTooltip({
            x: event.offsetX,
            y: event.offsetY,
            title: hovered.title,
            type: hovered.node_type,
            connections: hovered.connections || 0,
            source: hovered.source_type,
            tags: hovered.tags,
          });
          // Start hover animation loop
          hoverAnimRef.current = 0;
          const animate = () => {
            if (hoveredRef.current == null) return;
            hoverAnimRef.current++;
            draw();
            animFrameRef.current = requestAnimationFrame(animate);
          };
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setTooltip(null);
          if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
          }
          draw();
        }
      } else if (hovered) {
        // Update tooltip position while hovering same node
        setTooltip((prev) => prev ? { ...prev, x: event.offsetX, y: event.offsetY } : null);
      }

      if (!dragNode) return;
      wasDragged = true;
      const t = transformRef.current;
      dragNode.fx = (event.offsetX - t.x) / t.k;
      dragNode.fy = (event.offsetY - t.y) / t.k;
      if (simRef.current) {
        simRef.current.alpha(0.3).restart();
      }
    });

    sel.on('mouseup.drag', () => {
      if (dragNode) {
        if (!wasDragged) {
          onNodeClick && onNodeClick(dragNode.id);
        }
        dragNode.fx = null;
        dragNode.fy = null;
        dragNode = null;
        canvas.style.cursor = 'default';
        sel.call(zoom);
        if (simRef.current) simRef.current.alpha(0.1).restart();
      }
    });

    sel.on('click.select', (event) => {
      if (!dragNode) {
        const node = findNode(event.offsetX, event.offsetY);
        if (node) {
          onNodeClick && onNodeClick(node.id);
        } else {
          onNodeClick && onNodeClick(null);
        }
      }
    });

    return () => {
      sel.on('.zoom', null);
      sel.on('mousedown.drag', null);
      sel.on('mousemove.drag', null);
      sel.on('mouseup.drag', null);
      sel.on('click.select', null);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [nodes, draw, onNodeClick]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Enhanced tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2.5 max-w-[240px]"
          style={{
            left: Math.min(tooltip.x + 14, (canvasRef.current?.clientWidth || 800) - 260),
            top: tooltip.y - 12,
          }}
        >
          <div className="font-medium text-gray-900 text-sm leading-snug mb-1">{tooltip.title}</div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: getNodeColor(tooltip.type) }}
            />
            <span className="text-gray-600">{NODE_TYPE_LABELS[tooltip.type] || tooltip.type}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">{tooltip.connections}개 연결</span>
          </div>
          {tooltip.source && (
            <div className="text-[10px] text-gray-400 mt-1">소스: {tooltip.source}</div>
          )}
        </div>
      )}

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-lg font-medium text-gray-600">아직 노드가 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">데이터를 수집하면 그래프가 생성됩니다.</p>
        </div>
      )}
    </div>
  );
}
