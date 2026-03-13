import React, { useState, useCallback, useRef } from 'react';
import { searchNodes } from '../services/api';

const typeColors = {
  concept: 'bg-purple-100 text-purple-700',
  tech: 'bg-blue-100 text-blue-700',
  project: 'bg-amber-100 text-amber-700',
  decision: 'bg-red-100 text-red-700',
  stock: 'bg-green-100 text-green-700',
  person: 'bg-pink-100 text-pink-700',
  event: 'bg-cyan-100 text-cyan-700',
  organization: 'bg-orange-100 text-orange-700',
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchNodes(q);
      setResults(data.nodes || []);
      setTotal(data.total || (data.nodes || []).length);
    } catch (e) {
      console.error('Search error:', e);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">전문 검색</h1>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={handleChange}
              placeholder="노드 이름, 개념, 키워드로 검색..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">FTS5 전문 검색 + 벡터 유사도 검색을 지원합니다.</p>
      </form>

      {/* Results */}
      {searched && (
        <div className="mb-4">
          <span className="text-sm text-gray-500">
            {loading ? '검색 중...' : `${total}개 결과`}
          </span>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((node) => (
            <div key={node.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start gap-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0 mt-0.5 ${typeColors[node.node_type] || 'bg-gray-100 text-gray-700'}`}>
                  {node.node_type}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm">{node.name || node.label}</h3>
                  {node.summary && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{node.summary}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {node.source_type && <span>소스: {node.source_type}</span>}
                    {node.score && <span>유사도: {(node.score * 100).toFixed(1)}%</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl block mb-3">🔍</span>
          <p className="text-gray-500">검색 결과가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-1">다른 키워드로 시도해보세요.</p>
        </div>
      )}

      {!searched && (
        <div className="text-center py-12">
          <span className="text-4xl block mb-3">🔎</span>
          <p className="text-gray-500">검색어를 입력하면 노드를 찾아드립니다.</p>
        </div>
      )}
    </div>
  );
}
