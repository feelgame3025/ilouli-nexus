import React, { useState, useEffect, useCallback } from 'react';

const BASE = '/api';

export default function AutomationPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState({});
  const [error, setError] = useState(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/automation/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        // If endpoint doesn't exist yet, show placeholder
        setStatus({
          autolinker: { enabled: false, last_run: null, next_run: null },
          news_ingest: { enabled: false, last_run: null, next_run: null },
          community_ingest: { enabled: false, last_run: null, next_run: null },
        });
      }
    } catch (e) {
      setStatus({
        autolinker: { enabled: false, last_run: null, next_run: null },
        news_ingest: { enabled: false, last_run: null, next_run: null },
        community_ingest: { enabled: false, last_run: null, next_run: null },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleRunJob = async (jobName) => {
    setRunning((prev) => ({ ...prev, [jobName]: true }));
    setError(null);
    try {
      const res = await fetch(`${BASE}/automation/run/${jobName}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed');
      loadStatus();
    } catch (e) {
      setError(`${jobName}: ${e.message}`);
    } finally {
      setRunning((prev) => ({ ...prev, [jobName]: false }));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '없음';
    try {
      return new Date(dateStr).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    } catch {
      return dateStr;
    }
  };

  const jobs = [
    {
      key: 'autolinker',
      name: '자동 링커',
      description: '고립 노드를 유사한 노드와 자동 연결',
      icon: '🔗',
    },
    {
      key: 'news_ingest',
      name: '뉴스 수집',
      description: 'news.ilouli.com에서 최신 뉴스 기사 수집 및 노드 추출',
      icon: '📰',
    },
    {
      key: 'community_ingest',
      name: '커뮤니티 수집',
      description: 'community.ilouli.com에서 게시글 수집 및 노드 추출',
      icon: '🏘️',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">자동화 현황</h1>
          <p className="text-sm text-gray-500 mt-1">데이터 수집 및 그래프 자동화 작업 관리</p>
        </div>
        <button
          onClick={loadStatus}
          disabled={loading}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          새로고침
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const jobStatus = status?.[job.key] || {};
            const isEnabled = jobStatus.enabled;
            const isRunning = running[job.key];

            return (
              <div key={job.key} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{job.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{job.name}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {isEnabled ? '활성' : '비활성'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{job.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span>마지막 실행: {formatDate(jobStatus.last_run)}</span>
                        {jobStatus.next_run && <span>다음 실행: {formatDate(jobStatus.next_run)}</span>}
                        {jobStatus.last_result && (
                          <span className={jobStatus.last_result === 'success' ? 'text-green-500' : 'text-red-500'}>
                            {jobStatus.last_result === 'success' ? '성공' : '실패'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRunJob(job.key)}
                    disabled={isRunning}
                    className="flex-shrink-0 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {isRunning ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        실행 중
                      </span>
                    ) : '수동 실행'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats summary */}
      {status && (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <span className="text-2xl block mb-1">🔗</span>
            <span className="text-sm text-gray-500">자동 링커</span>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {status.autolinker?.edges_created || 0}
            </p>
            <span className="text-xs text-gray-400">생성된 엣지</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <span className="text-2xl block mb-1">📰</span>
            <span className="text-sm text-gray-500">뉴스 수집</span>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {status.news_ingest?.total_ingested || 0}
            </p>
            <span className="text-xs text-gray-400">수집된 기사</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <span className="text-2xl block mb-1">🏘️</span>
            <span className="text-sm text-gray-500">커뮤니티 수집</span>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {status.community_ingest?.total_ingested || 0}
            </p>
            <span className="text-xs text-gray-400">수집된 게시글</span>
          </div>
        </div>
      )}
    </div>
  );
}
