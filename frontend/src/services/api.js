/**
 * API service for ilouli-nexus Knowledge Graph.
 * All URLs are relative — nginx proxies /api/ to the FastAPI backend on port 4010.
 */

const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

/** GET /api/graph — nodes + edges for D3 visualization */
export function fetchGraph(params = {}) {
  const qs = new URLSearchParams();
  if (params.node_type) qs.set('node_type', params.node_type);
  if (params.source_type) qs.set('source_type', params.source_type);
  if (params.days) qs.set('days', params.days);
  if (params.limit) qs.set('limit', params.limit);
  const query = qs.toString();
  return request(`/graph${query ? '?' + query : ''}`);
}

/** GET /api/graph/stats */
export function fetchStats() {
  return request('/graph/stats');
}

/** GET /api/nodes */
export function fetchNodes(params = {}) {
  const qs = new URLSearchParams();
  if (params.node_type) qs.set('node_type', params.node_type);
  if (params.limit) qs.set('limit', String(params.limit || 100));
  if (params.offset) qs.set('offset', String(params.offset));
  const query = qs.toString();
  return request(`/nodes${query ? '?' + query : ''}`);
}

/** GET /api/nodes/:id — single node with connections */
export function fetchNodeDetail(id) {
  return request(`/nodes/${id}`);
}

/** GET /api/search?q=... */
export function searchNodes(query) {
  if (!query || !query.trim()) return Promise.resolve({ nodes: [], total: 0, query: '' });
  return request(`/search?q=${encodeURIComponent(query)}`);
}
