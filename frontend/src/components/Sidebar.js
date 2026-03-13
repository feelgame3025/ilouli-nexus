import React, { useState, useEffect, useCallback, useRef } from 'react';
import { searchNodes, fetchStats } from '../services/api';

const NODE_TYPES = [
  { key: 'concept', label: 'Concept', color: 'bg-purple-500' },
  { key: 'tech', label: 'Tech', color: 'bg-blue-500' },
  { key: 'project', label: 'Project', color: 'bg-amber-500' },
  { key: 'decision', label: 'Decision', color: 'bg-red-500' },
  { key: 'stock', label: 'Stock', color: 'bg-green-500' },
];

export default function Sidebar({ nodes, activeFilters, onToggleFilter, onNodeClick, selectedNodeId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
  }, []);

  const doSearch = useCallback((q) => {
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    searchNodes(q)
      .then((res) => setSearchResults(res.nodes || []))
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // Display list: search results or recent nodes
  const displayNodes = searchResults || nodes.slice(0, 50);

  return (
    <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <h1 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Nexus
        </h1>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-100">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search nodes..."
            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-colors bg-slate-50"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-3 py-2 border-b border-slate-100">
        <div className="flex flex-wrap gap-1.5">
          {NODE_TYPES.map((t) => {
            const active = activeFilters.has(t.key);
            return (
              <button
                key={t.key}
                onClick={() => onToggleFilter(t.key)}
                className={`text-xs px-2 py-1 rounded-full transition-colors flex items-center gap-1 ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${t.color} ${active ? 'opacity-100' : 'opacity-60'}`} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-3 text-xs text-slate-500">
          <span>{stats.total_nodes} nodes</span>
          <span className="w-px h-3 bg-slate-200" />
          <span>{stats.total_edges} edges</span>
        </div>
      )}

      {/* Node list */}
      <div className="flex-1 overflow-y-auto">
        {searchLoading && (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!searchLoading && searchResults && searchResults.length === 0 && (
          <div className="text-center py-6 text-sm text-slate-400">No results found</div>
        )}

        {!searchLoading && displayNodes.length > 0 && (
          <div className="py-1">
            {searchResults && (
              <div className="px-3 py-1 text-xs text-slate-400">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
            )}
            {!searchResults && (
              <div className="px-3 py-1 text-xs text-slate-400">Recent nodes</div>
            )}
            {displayNodes.map((n) => {
              const isSelected = n.id === selectedNodeId;
              return (
                <button
                  key={n.id}
                  onClick={() => onNodeClick(n.id)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      NODE_TYPES.find((t) => t.key === n.node_type)?.color || 'bg-gray-400'
                    }`}
                  />
                  <span className="truncate">{n.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {!searchLoading && !searchResults && displayNodes.length === 0 && (
          <div className="text-center py-6 text-sm text-slate-400">No nodes yet</div>
        )}
      </div>
    </div>
  );
}
