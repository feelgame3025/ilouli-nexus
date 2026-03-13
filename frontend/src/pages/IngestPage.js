import React, { useState, useEffect, useCallback } from 'react';

const BASE = '/api';

const SOURCES = [
  { key: 'articles', label: '뉴스 기사', icon: '📰', endpoint: '/ingest/articles', batchEndpoint: '/batch/news', desc: 'news.ilouli.com 뉴스 테마/기사' },
  { key: 'youtube', label: 'YouTube', icon: '🎬', endpoint: '/ingest/youtube', batchEndpoint: '/batch/youtube', desc: 'YouTube 트렌딩 영상 키워드' },
  { key: 'community', label: '커뮤니티', icon: '💬', endpoint: '/ingest/community', batchEndpoint: '/batch/community', desc: 'community.ilouli.com 게시글' },
  { key: 'stock', label: '주식 데이터', icon: '📈', endpoint: '/ingest/stock', batchEndpoint: '/batch/stock', desc: '주식 특집/뉴스 데이터' },
];

const DAY_OPTIONS = [
  { value: 7, label: '1주일' },
  { value: 14, label: '2주일' },
  { value: 30, label: '1개월' },
  { value: 90, label: '3개월' },
  { value: 180, label: '6개월' },
  { value: 365, label: '1년' },
];

export default function IngestPage() {
  const [manualText, setManualText] = useState('');
  const [manualLabel, setManualLabel] = useState('manual');
  const [loadingSource, setLoadingSource] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedResult, setEmbedResult] = useState(null);

  // Batch state
  const [batchDays, setBatchDays] = useState(7);
  const [batchSize, setBatchSize] = useState(20);
  const [batchCounts, setBatchCounts] = useState(null);
  const [batchCountsLoading, setBatchCountsLoading] = useState(false);

  // Drip state
  const [dripStatus, setDripStatus] = useState(null);
  const [dripDays, setDripDays] = useState(30);
  const [dripDaily, setDripDaily] = useState(30);

  // Active tab
  const [tab, setTab] = useState('realtime'); // 'realtime' | 'batch' | 'drip'

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${BASE}/ingest/status?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to load ingest history:', e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadDripStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/batch/drip/status`);
      if (res.ok) setDripStatus(await res.json());
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    loadHistory();
    loadDripStatus();
  }, [loadHistory, loadDripStatus]);

  // Load batch counts when days change
  const loadBatchCounts = useCallback(async (days) => {
    setBatchCountsLoading(true);
    try {
      const res = await fetch(`${BASE}/batch/counts?days=${days}`);
      if (res.ok) setBatchCounts(await res.json());
    } catch (e) { /* ignore */ }
    finally { setBatchCountsLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'batch') loadBatchCounts(batchDays);
  }, [tab, batchDays, loadBatchCounts]);

  // Realtime ingest
  const handleSourceIngest = async (source) => {
    setLoadingSource(source.key);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${BASE}${source.endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ingest failed');
      setResult({ source: source.label, ...data });
      loadHistory();
    } catch (e) { setError(e.message); }
    finally { setLoadingSource(null); }
  };

  const handleIngestAll = async () => {
    setLoadingSource('all');
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${BASE}/ingest/all`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ingest failed');
      setResult({ source: '전체 수집', ...data });
      loadHistory();
    } catch (e) { setError(e.message); }
    finally { setLoadingSource(null); }
  };

  const handleManualIngest = async (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setLoadingSource('manual');
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${BASE}/ingest/manual`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ text: manualText.trim(), source_label: manualLabel }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ingest failed');
      setResult({ source: '수동 입력', ...data });
      setManualText('');
      loadHistory();
    } catch (e) { setError(e.message); }
    finally { setLoadingSource(null); }
  };

  const handleEmbed = async () => {
    setEmbedLoading(true);
    setEmbedResult(null);
    try {
      const res = await fetch(`${BASE}/ingest/embed`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Embed failed');
      setEmbedResult(data);
    } catch (e) { setError(e.message); }
    finally { setEmbedLoading(false); }
  };

  // Batch ingest
  const handleBatchIngest = async (source) => {
    setLoadingSource(`batch_${source.key}`);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${BASE}${source.batchEndpoint}?days=${batchDays}&batch_size=${batchSize}`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Batch failed');
      setResult({ source: `${source.label} 배치`, ...data });
      loadHistory();
      loadBatchCounts(batchDays);
    } catch (e) { setError(e.message); }
    finally { setLoadingSource(null); }
  };

  // Drip start/stop
  const handleDripStart = async () => {
    setError(null);
    try {
      const res = await fetch(`${BASE}/batch/drip/start?days=${dripDays}&daily_per_source=${dripDaily}`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Drip start failed');
      setDripStatus(data);
      loadDripStatus();
    } catch (e) { setError(e.message); }
  };

  const handleDripStop = async () => {
    try {
      const res = await fetch(`${BASE}/batch/drip/stop`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      setDripStatus(data);
      loadDripStatus();
    } catch (e) { setError(e.message); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }); }
    catch { return dateStr; }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">노드 추출</h1>
      <p className="text-sm text-gray-500 mb-6">데이터 소스에서 AI가 자동으로 노드와 엣지를 추출합니다.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { id: 'realtime', label: '실시간 수집' },
          { id: 'batch', label: '배치 수집' },
          { id: 'drip', label: '일일 자동 수집' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Realtime Tab ═══ */}
      {tab === 'realtime' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {SOURCES.map((source) => (
              <div key={source.key} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{source.icon}</span>
                  <span className="font-medium text-gray-900">{source.label}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3 flex-1">{source.desc}</p>
                <button onClick={() => handleSourceIngest(source)} disabled={loadingSource !== null}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50">
                  {loadingSource === source.key ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />수집 중...
                    </span>
                  ) : '최신 수집'}
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mb-8">
            <button onClick={handleIngestAll} disabled={loadingSource !== null}
              className="px-6 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium disabled:opacity-50">
              {loadingSource === 'all' ? '전체 수집 중...' : '전체 수집'}
            </button>
            <button onClick={handleEmbed} disabled={embedLoading || loadingSource !== null}
              className="px-6 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium disabled:opacity-50">
              {embedLoading ? '임베딩 중...' : '임베딩 생성'}
            </button>
          </div>

          {/* Manual text */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-3">수동 텍스트 입력</h2>
            <form onSubmit={handleManualIngest} className="flex flex-col gap-3">
              <textarea value={manualText} onChange={(e) => setManualText(e.target.value)}
                placeholder="분석할 텍스트를 입력하세요... (최대 10,000자)" rows={4} maxLength={10000}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-y" />
              <div className="flex items-center gap-3">
                <input type="text" value={manualLabel} onChange={(e) => setManualLabel(e.target.value)} placeholder="소스 라벨"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" disabled={loadingSource !== null || !manualText.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50">
                  {loadingSource === 'manual' ? '추출 중...' : '노드 추출'}
                </button>
                <span className="text-xs text-gray-400">{manualText.length}/10,000</span>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ═══ Batch Tab ═══ */}
      {tab === 'batch' && (
        <>
          {/* Period selector */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">수집 기간 설정</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <label className="block text-xs text-gray-500 mb-1">기간</label>
                <div className="flex gap-2">
                  {DAY_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setBatchDays(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        batchDays === opt.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">배치 크기</label>
                <select value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value={10}>10건</option>
                  <option value={20}>20건</option>
                  <option value={30}>30건</option>
                  <option value={50}>50건</option>
                </select>
              </div>
            </div>

            {/* Counts */}
            {batchCountsLoading ? (
              <div className="mt-4 text-sm text-gray-400">데이터 확인 중...</div>
            ) : batchCounts && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(batchCounts.sources || {}).map(([key, val]) => {
                  const src = SOURCES.find(s => s.key === key || s.batchEndpoint.includes(key));
                  return (
                    <div key={key} className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500">{src?.icon} {src?.label || key}</div>
                      <div className="text-xl font-bold text-gray-900">{(val.available || 0).toLocaleString()}</div>
                      <div className="text-xs text-gray-400">건</div>
                    </div>
                  );
                })}
              </div>
            )}
            {batchCounts && (
              <div className="mt-3 text-xs text-gray-400">
                기간: {batchCounts.period} | 현재 Nexus: 노드 {batchCounts.nexus?.nodes}개, 엣지 {batchCounts.nexus?.edges}개
              </div>
            )}
          </div>

          {/* Batch source cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {SOURCES.map((source) => {
              const countKey = source.batchEndpoint.split('/').pop();
              const available = batchCounts?.sources?.[countKey]?.available || 0;
              return (
                <div key={source.key} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{source.icon}</span>
                    <span className="font-medium text-gray-900">{source.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{available.toLocaleString()}건 수집 가능</p>
                  <button onClick={() => handleBatchIngest(source)} disabled={loadingSource !== null || available === 0}
                    className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium disabled:opacity-50">
                    {loadingSource === `batch_${source.key}` ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />처리 중...
                      </span>
                    ) : `${batchSize}건 배치 수집`}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ Drip Tab ═══ */}
      {tab === 'drip' && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-1">일일 자동 수집 (Drip)</h2>
          <p className="text-xs text-gray-500 mb-4">매일 자정(KST)에 각 소스에서 설정한 건수만큼 자동으로 수집합니다.</p>

          {/* Status */}
          {dripStatus?.running ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-700">자동 수집 실행 중</span>
              </div>
              <div className="text-xs text-green-600 space-y-1">
                {dripStatus.config && (
                  <p>설정: 최근 {dripStatus.config.days}일, 소스당 {dripStatus.config.daily_per_source}건/일</p>
                )}
                {dripStatus.current_source && <p>현재 처리 중: {dripStatus.current_source}</p>}
                {dripStatus.last_run && <p>마지막 실행: {dripStatus.last_run}</p>}
                {dripStatus.progress && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {Object.entries(dripStatus.progress).map(([src, info]) => (
                      <div key={src} className="bg-white/50 rounded p-2">
                        <span className="font-medium">{src}</span>: {info.total_processed}건 처리 (offset: {info.offset})
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleDripStop}
                className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium">
                자동 수집 중지
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">수집 기간</label>
                  <select value={dripDays} onChange={(e) => setDripDays(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    {DAY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">소스당 하루 처리량</label>
                  <select value={dripDaily} onChange={(e) => setDripDaily(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value={10}>10건</option>
                    <option value={20}>20건</option>
                    <option value={30}>30건</option>
                    <option value={50}>50건</option>
                    <option value={100}>100건</option>
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
                시작하면 즉시 첫 배치를 실행하고, 이후 매일 01:00 KST에 자동 실행됩니다.
                <br />4개 소스 × {dripDaily}건 = 하루 최대 {dripDaily * 4}건 처리
              </div>
              <button onClick={handleDripStart}
                className="px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium">
                자동 수집 시작
              </button>
            </div>
          )}

          {dripStatus && !dripStatus.running && dripStatus.progress && Object.values(dripStatus.progress).some(p => p.total_processed > 0) && (
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">이전 실행 결과</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                {Object.entries(dripStatus.progress).map(([src, info]) => (
                  <div key={src}>{src}: {info.total_processed}건 처리</div>
                ))}
              </div>
              {dripStatus.last_run && <p className="text-xs text-gray-400 mt-1">마지막: {dripStatus.last_run}</p>}
            </div>
          )}
        </div>
      )}

      {/* ═══ Shared: Result / Error / History ═══ */}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-green-700 mb-2">{result.source} - 완료</h3>
          <div className="text-sm text-green-600 space-y-1">
            {result.nodes_created !== undefined && <p>생성된 노드: {result.nodes_created}개</p>}
            {result.edges_created !== undefined && <p>생성된 엣지: {result.edges_created}개</p>}
            {result.processed !== undefined && <p>처리된 항목: {result.processed}개</p>}
            {result.skipped !== undefined && result.skipped > 0 && <p>중복 건너뜀: {result.skipped}개</p>}
            {result.total_available !== undefined && <p>전체 수집 가능: {result.total_available.toLocaleString()}개</p>}
            {result.articles_fetched !== undefined && <p>수집된 기사: {result.articles_fetched}개</p>}
            {result.videos_fetched !== undefined && <p>수집된 영상: {result.videos_fetched}개</p>}
            {result.posts_fetched !== undefined && <p>수집된 게시글: {result.posts_fetched}개</p>}
            {result.items_fetched !== undefined && <p>수집된 항목: {result.items_fetched}개</p>}
            {result.total_nodes_created !== undefined && <p>전체 생성 노드: {result.total_nodes_created}개</p>}
            {result.total_edges_created !== undefined && <p>전체 생성 엣지: {result.total_edges_created}개</p>}
            {result.sources && (
              <div className="mt-2 space-y-1">
                {Object.entries(result.sources).map(([src, info]) => (
                  <p key={src} className={info.status === 'ok' ? 'text-green-600' : 'text-red-500'}>
                    {src}: {info.status === 'ok' ? `노드 ${info.nodes_created}개, 엣지 ${info.edges_created}개` : info.detail}
                  </p>
                ))}
              </div>
            )}
            {result.next_offset !== undefined && <p className="text-green-500 text-xs">다음 offset: {result.next_offset}</p>}
            {result.timestamp && <p className="text-green-500 text-xs mt-1">{result.timestamp}</p>}
          </div>
        </div>
      )}

      {embedResult && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-purple-700 mb-2">임베딩 완료</h3>
          <p className="text-sm text-purple-600">임베딩 생성: {embedResult.embedded}개</p>
          {embedResult.message && <p className="text-sm text-purple-500">{embedResult.message}</p>}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">수집 이력</h2>
        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-3xl block mb-2">📥</span>
            <p>아직 수집 이력이 없습니다.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">소스</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">항목 수</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">노드</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">엣지</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-36">시간</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{item.source_type || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.source_count || 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.nodes_created || 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.edges_created || 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(item.ingested_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
