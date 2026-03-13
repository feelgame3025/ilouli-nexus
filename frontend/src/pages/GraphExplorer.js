import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ForceGraph from '../components/ForceGraph';
import NodeDetail from '../components/NodeDetail';
import { fetchGraph, searchNodes } from '../services/api';

/* ── Timeline Slider ──────────────────────────────────────────── */

const TICK_MARKS = [
  { days: 7, label: '1주' },
  { days: 30, label: '1월' },
  { days: 90, label: '3월' },
  { days: 180, label: '6월' },
  { days: 365, label: '1년' },
];

function formatDays(d) {
  if (d >= 365) return '1년';
  if (d >= 30) {
    const m = Math.floor(d / 30);
    const r = d % 30;
    return r ? `${m}개월 ${r}일` : `${m}개월`;
  }
  if (d >= 7) {
    const w = Math.floor(d / 7);
    const r = d % 7;
    return r ? `${w}주 ${r}일` : `${w}주`;
  }
  return `${d}일`;
}

function TimelineSlider({ value, onChange, min = 1, max = 365 }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const updateValue = useCallback(
    (clientX) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const ratio = x / rect.width;
      const newValue = Math.round(min + ratio * (max - min));
      onChange(Math.max(min, Math.min(max, newValue)));
    },
    [min, max, onChange]
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e) => {
      e.preventDefault();
      updateValue(e.clientX);
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, updateValue]);

  // Touch support
  useEffect(() => {
    if (!dragging) return;
    const handleTouchMove = (e) => {
      e.preventDefault();
      updateValue(e.touches[0].clientX);
    };
    const handleTouchEnd = () => setDragging(false);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragging, updateValue]);

  const ratio = (value - min) / (max - min);

  return (
    <div className="w-72" title="기간을 조절하여 수집 데이터 범위를 변경합니다">
      {/* Current value label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400">1일</span>
        <span className="text-xs font-semibold text-gray-700 bg-white/80 px-2 py-0.5 rounded">
          최근 {formatDays(value)}
        </span>
        <span className="text-[10px] text-gray-400">1년</span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-6 cursor-pointer flex items-center select-none"
        onMouseDown={(e) => {
          setDragging(true);
          updateValue(e.clientX);
        }}
        onTouchStart={(e) => {
          setDragging(true);
          updateValue(e.touches[0].clientX);
        }}
      >
        {/* Track background */}
        <div className="absolute w-full h-[3px] bg-gray-300/60 rounded-full" />

        {/* Filled track */}
        <div
          className="absolute h-[3px] bg-blue-500 rounded-full"
          style={{ width: `${ratio * 100}%`, transition: dragging ? 'none' : 'width 0.2s ease' }}
        />

        {/* Tick marks */}
        {TICK_MARKS.map(({ days, label }) => {
          const r = (days - min) / (max - min);
          return (
            <div key={days} className="absolute flex flex-col items-center" style={{ left: `${r * 100}%` }}>
              <div className="w-[1px] h-2.5 bg-gray-300 -mt-[2px]" />
              <span className="text-[8px] text-gray-400 mt-0.5 select-none">{label}</span>
            </div>
          );
        })}

        {/* Draggable dot */}
        <div
          className="absolute w-[18px] h-[18px] -ml-[9px] bg-white border-[2.5px] border-blue-500 rounded-full shadow-md hover:shadow-lg hover:scale-110 active:scale-95 z-10"
          style={{
            left: `${ratio * 100}%`,
            transition: dragging ? 'none' : 'left 0.2s ease, transform 0.15s ease',
            cursor: dragging ? 'grabbing' : 'grab',
          }}
        />
      </div>
    </div>
  );
}

/* ── Type colors ──────────────────────────────────────────────── */

const typeColors = {
  concept: 'bg-purple-500',
  tech: 'bg-blue-500',
  project: 'bg-amber-500',
  decision: 'bg-red-500',
  stock: 'bg-green-500',
  person: 'bg-pink-500',
  event: 'bg-cyan-500',
  organization: 'bg-orange-500',
};

const searchTypeColors = {
  concept: 'bg-purple-100 text-purple-700',
  tech: 'bg-blue-100 text-blue-700',
  project: 'bg-amber-100 text-amber-700',
  decision: 'bg-red-100 text-red-700',
  stock: 'bg-green-100 text-green-700',
  person: 'bg-pink-100 text-pink-700',
  event: 'bg-cyan-100 text-cyan-700',
  organization: 'bg-orange-100 text-orange-700',
};

/* ── GraphExplorer ─────────────────────────────────────────────── */

export default function GraphExplorer() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [days, setDays] = useState(30);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const debounceRef = useRef(null);
  const searchWrapperRef = useRef(null);

  // Close search results on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Load graph data
  const loadGraph = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchGraph({ limit: 500, days })
      .then((data) => setGraphData(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Search handler
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const data = await searchNodes(q);
      setSearchResults(data.nodes || []);
    } catch (e) {
      console.error('Search error:', e);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSearchFocused(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(searchQuery);
  };

  // Filter nodes by type
  const filteredData = useMemo(() => {
    if (activeFilters.size === 0) return graphData;
    const filteredNodes = graphData.nodes.filter((n) => activeFilters.has(n.node_type));
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = graphData.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [graphData, activeFilters]);

  const handleToggleFilter = useCallback((type) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleNodeClick = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const nodeTypes = useMemo(() => {
    const types = new Set(graphData.nodes.map((n) => n.node_type));
    return Array.from(types).sort();
  }, [graphData.nodes]);

  const showResults = searchFocused && searchQuery.trim().length > 0;

  return (
    <div className="h-full w-full relative bg-white">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">그래프 로딩 중...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm text-center">
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button
              onClick={loadGraph}
              className="px-4 py-1.5 text-sm rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* D3 Force Graph */}
      <ForceGraph
        nodes={filteredData.nodes}
        edges={filteredData.edges}
        selectedNodeId={selectedNodeId}
        onNodeClick={handleNodeClick}
      />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-start gap-3 z-20 pointer-events-none">
        {/* Search bar — always visible */}
        <div ref={searchWrapperRef} className="relative pointer-events-auto w-72">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setSearchFocused(true)}
                placeholder="노드 검색..."
                title="노드 이름, 개념, 키워드로 검색"
                className="w-full pl-9 pr-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder:text-gray-400"
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </form>

          {/* Search results dropdown */}
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden max-h-72 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      handleNodeClick(node.id);
                      setSearchFocused(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${searchTypeColors[node.node_type] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {node.node_type}
                      </span>
                      <span className="text-sm text-gray-900 truncate">{node.title}</span>
                    </div>
                    {node.content_snippet && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{node.content_snippet}</p>
                    )}
                  </button>
                ))
              ) : (
                !searchLoading && (
                  <div className="px-4 py-3 text-sm text-gray-400 text-center">결과 없음</div>
                )
              )}
            </div>
          )}
        </div>

        {/* Filter chips */}
        {nodeTypes.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2.5 border border-gray-200 shadow-sm pointer-events-auto" title="노드 유형별 필터">
            <div className="flex flex-wrap gap-1.5">
              {nodeTypes.map((type) => {
                const isFilterActive = activeFilters.has(type);
                const colorClass = typeColors[type] || 'bg-gray-500';
                return (
                  <button
                    key={type}
                    onClick={() => handleToggleFilter(type)}
                    title={`${type} 노드만 표시`}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                      isFilterActive
                        ? 'bg-blue-500 text-white border border-blue-500'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${colorClass}`} />
                    {type}
                  </button>
                );
              })}
              {activeFilters.size > 0 && (
                <button
                  onClick={() => setActiveFilters(new Set())}
                  title="모든 필터 초기화"
                  className="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  초기화
                </button>
              )}
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Node/Edge count */}
        <div
          className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-gray-200 shadow-sm text-xs text-gray-500 pointer-events-auto"
          title={`현재 표시 중인 노드 ${filteredData.nodes.length}개, 엣지 ${filteredData.edges.length}개`}
        >
          {filteredData.nodes.length} nodes · {filteredData.edges.length} edges
        </div>
      </div>

      {/* Bottom-left: Timeline slider + Legend */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto flex flex-col gap-3">
        {/* Timeline slider */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-sm">
          <TimelineSlider value={days} onChange={setDays} />
        </div>

        {/* Legend */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2.5 border border-gray-200 shadow-sm" title="노드 유형별 색상 범례">
          <div className="flex flex-wrap gap-3">
            {[
              { color: 'bg-purple-500', label: 'Concept', desc: '개념' },
              { color: 'bg-blue-500', label: 'Tech', desc: '기술' },
              { color: 'bg-amber-500', label: 'Project', desc: '프로젝트' },
              { color: 'bg-red-500', label: 'Decision', desc: '결정' },
              { color: 'bg-green-500', label: 'Stock', desc: '주식' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5" title={item.desc}>
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-xs text-gray-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Node detail panel */}
      <NodeDetail
        nodeId={selectedNodeId}
        onClose={handleCloseDetail}
        onNavigate={handleNodeClick}
      />
    </div>
  );
}
