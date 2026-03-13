import React, { useState, useEffect, useCallback } from 'react';
import { fetchNodes } from '../services/api';

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

export default function NodeList() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 50;

  const loadNodes = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const currentOffset = reset ? 0 : offset;
      const params = { limit, offset: currentOffset };
      if (filterType) params.node_type = filterType;
      const data = await fetchNodes(params);
      const items = data.nodes || data || [];
      if (reset) {
        setNodes(items);
        setOffset(items.length);
      } else {
        setNodes((prev) => [...prev, ...items]);
        setOffset((prev) => prev + items.length);
      }
      setHasMore(items.length === limit);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterType, offset]);

  useEffect(() => {
    setOffset(0);
    setNodes([]);
    setHasMore(true);
  }, [filterType]);

  useEffect(() => {
    if (nodes.length === 0 && hasMore) {
      loadNodes(true);
    }
  }, [filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  const nodeTypes = ['concept', 'tech', 'project', 'decision', 'stock', 'person', 'event', 'organization'];

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">노드 목록</h1>
        <span className="text-sm text-gray-500">{nodes.length}개</span>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterType('')}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            !filterType
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          전체
        </button>
        {nodeTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
              filterType === type
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => loadNodes(true)}
            className="mt-2 text-sm text-red-600 underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">이름</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">유형</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">소스</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">생성일</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr key={node.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{node.name || node.label}</div>
                    {node.summary && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{node.summary}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColors[node.node_type] || 'bg-gray-100 text-gray-700'}`}>
                      {node.node_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{node.source_type || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(node.created_at)}</td>
                </tr>
              ))}
              {nodes.length === 0 && !loading && (
                <tr>
                  <td colSpan="4" className="px-4 py-12 text-center text-gray-500">
                    노드가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Load more */}
      {hasMore && nodes.length > 0 && (
        <div className="text-center mt-4">
          <button
            onClick={() => loadNodes(false)}
            disabled={loading}
            className="px-6 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? '로딩 중...' : '더 보기'}
          </button>
        </div>
      )}

      {/* Loading initial */}
      {loading && nodes.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
