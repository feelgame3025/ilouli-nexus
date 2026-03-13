import React, { useEffect, useState } from 'react';
import { fetchNodeDetail } from '../services/api';

const TYPE_BADGES = {
  concept: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Concept' },
  tech: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Tech' },
  project: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Project' },
  decision: { bg: 'bg-red-100', text: 'text-red-700', label: 'Decision' },
  stock: { bg: 'bg-green-100', text: 'text-green-700', label: 'Stock' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return dateStr;
  }
}

function parseTags(tagsStr) {
  if (!tagsStr) return [];
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function NodeDetail({ nodeId, onClose, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (nodeId == null) return;
    setLoading(true);
    setError(null);
    fetchNodeDetail(nodeId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [nodeId]);

  if (nodeId == null) return null;

  const badge = data?.node ? TYPE_BADGES[data.node.node_type] || { bg: 'bg-gray-100', text: 'text-gray-600', label: data.node.node_type } : null;
  const tags = data?.node ? parseTags(data.node.tags) : [];

  return (
    <div className="absolute top-0 right-0 w-96 h-full bg-white/95 backdrop-blur-sm border-l border-gray-200 z-20 animate-slide-in-right overflow-y-auto shadow-lg">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">Node Detail</span>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>
        )}

        {data?.node && !loading && (
          <>
            {/* Title + Badge */}
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{data.node.title}</h2>
            {badge && (
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} mb-3`}>
                {badge.label}
              </span>
            )}

            {/* Content */}
            {data.node.content && (
              <div className="mt-3">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Content</h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{data.node.content}</p>
              </div>
            )}

            {/* AI Summary */}
            {data.node.ai_summary && (
              <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h3 className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">AI Summary</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{data.node.ai_summary}</p>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source Link */}
            {data.node.url && (
              <div className="mt-4">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Source</h3>
                <a
                  href={data.node.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:text-blue-600 hover:underline break-all"
                >
                  {data.node.url}
                </a>
              </div>
            )}

            {/* Meta */}
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
              {data.node.source_type && <span>Source: {data.node.source_type}</span>}
              <span>Created: {formatDate(data.node.created_at)}</span>
            </div>

            {/* Connected Nodes */}
            {data.edges && data.edges.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Connected ({data.edges.length})
                </h3>
                <div className="space-y-1.5">
                  {data.edges.map((edge) => {
                    const connectedId =
                      edge.source_id === nodeId ? edge.target_id : edge.source_id;
                    const connBadge = TYPE_BADGES[edge.connected_type] || {
                      bg: 'bg-gray-100',
                      text: 'text-gray-600',
                    };
                    return (
                      <button
                        key={edge.id}
                        onClick={() => onNavigate && onNavigate(connectedId)}
                        className="w-full text-left px-3 py-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-2 border border-gray-100"
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${connBadge.bg}`} />
                        <span className="text-sm text-gray-700 truncate">
                          {edge.connected_title}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                          {edge.relation_type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Summary Button */}
            {!data.node.ai_summary && (
              <div className="mt-6">
                <button
                  className="w-full py-2 rounded-lg bg-purple-50 text-purple-600 text-sm font-medium hover:bg-purple-100 transition-colors border border-purple-200"
                  onClick={() => {}}
                  title="AI 요약 생성"
                >
                  AI 요약 생성
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
