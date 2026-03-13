import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// 심플 아이콘 컴포넌트 (community와 동일)
const Icon = ({ name, size = 16 }) => {
  const icons = {
    announcement: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
    board: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    free: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    issue: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    dev: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    game: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <line x1="6" y1="12" x2="6.01" y2="12"/>
        <line x1="10" y1="12" x2="10.01" y2="12"/>
        <path d="M15 9l2 2-2 2"/>
      </svg>
    ),
    nexus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
        <line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/><line x1="7" y1="19" x2="17" y2="19"/>
      </svg>
    ),
    graph: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/>
        <line x1="14.5" y1="9.5" x2="17.5" y2="6.5"/><line x1="9.5" y1="14.5" x2="6.5" y2="17.5"/>
      </svg>
    ),
    nodes: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    search: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    ingest: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    ),
    automation: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    news: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
        <path d="M18 14h-8"/>
        <path d="M15 18h-5"/>
        <path d="M10 6h8v4h-8V6Z"/>
      </svg>
    ),
    briefing: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
      </svg>
    ),
    youtube: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
      </svg>
    ),
    chevron: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    ),
    collapse: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="11 17 6 12 11 7"/>
        <polyline points="18 17 13 12 18 7"/>
      </svg>
    ),
  };
  return icons[name] || null;
};

const Sidebar = ({ collapsed, onToggle, mobileOpen = false, onMobileClose }) => {
  const location = useLocation();
  const { user } = useAuth();

  // Active path checks for 지식 그래프 internal routes
  const isNexusPath = location.pathname === '/' || location.pathname === '/nodes' || location.pathname === '/search' || location.pathname === '/ingest' || location.pathname === '/automation';

  const [boardExpanded, setBoardExpanded] = useState(false);
  const [nexusExpanded, setNexusExpanded] = useState(isNexusPath);

  useEffect(() => {
    if (isNexusPath) setNexusExpanded(true);
  }, [location.pathname, isNexusPath]);

  // Close mobile menu on route change
  useEffect(() => {
    if (onMobileClose) onMobileClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = user?.tier === 'admin';
  const isFamily = user?.tier === 'family';
  const hasDevAccess = isAdmin || isFamily;

  const isActive = (path) => location.pathname === path;

  // Tailwind class sets (identical to community sidebar)
  const navItemBase = "flex items-center gap-2.5 w-full py-2.5 px-3 border-none rounded-lg bg-transparent no-underline text-gray-500 text-sm font-normal cursor-pointer transition-all duration-150 text-left";
  const navItemHover = "hover:bg-gray-50 hover:text-gray-900";
  const navItemActive = "bg-blue-500/[0.08] text-blue-500";

  const navSubitemBase = "flex items-center gap-2 py-2 px-2.5 rounded-md no-underline text-gray-500 text-[13px] font-normal transition-all duration-150";
  const navSubitemHover = "hover:bg-gray-50 hover:text-gray-900";
  const navSubitemActive = "bg-blue-500/[0.08] text-blue-500";

  return (
    <aside className={`flex flex-col h-full bg-white border-r border-gray-200 transition-[width] duration-200 flex-shrink-0 ${collapsed ? 'w-14' : 'w-60'} ${mobileOpen ? 'max-md:translate-x-0 max-md:shadow-[4px_0_20px_rgba(0,0,0,0.15)]' : ''} max-md:fixed max-md:left-0 max-md:top-11 max-md:bottom-0 max-md:h-[calc(100dvh-44px)] max-md:z-[100] max-md:w-[280px] max-md:-translate-x-full max-md:shadow-none max-md:transition-transform max-md:duration-300 max-md:ease-[cubic-bezier(0.25,0.1,0.25,1)] max-md:overflow-y-auto`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b border-gray-200 min-h-[56px] ${collapsed ? 'justify-center px-3.5' : ''} max-md:justify-start max-md:px-5`}>
        {!collapsed && (
          <div className="flex items-center">
            <Link to="/" className="text-[15px] font-semibold text-gray-900 no-underline tracking-tight hover:text-blue-500">Nexus</Link>
          </div>
        )}
        <button
          onClick={onToggle}
          className={`flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded-md cursor-pointer text-gray-400 transition-all duration-150 hover:bg-gray-100 hover:text-gray-900 max-md:hidden ${collapsed ? 'rotate-180' : ''}`}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          <Icon name="collapse" size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto max-md:pb-5">
        {/* 공지사항 (community 외부 링크) */}
        <a
          href="https://community.ilouli.com/announcements"
          className={`${navItemBase} ${navItemHover} max-md:min-h-[44px] max-md:py-3 max-md:px-4 ${collapsed ? 'justify-center p-2.5' : ''}`}
          title={collapsed ? '공지사항' : undefined}
        >
          <span className={`flex items-center justify-center w-5 h-5 flex-shrink-0 text-gray-400 ${collapsed ? 'm-0' : ''}`}><Icon name="announcement" /></span>
          {!collapsed && <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">공지사항<span className="text-[10px] text-blue-400">↗</span></span>}
        </a>

        {/* 게시판 (하위 메뉴 - community 외부 링크) */}
        <div className={`mb-1 ${collapsed ? 'mb-0' : ''}`}>
          <button
            className={`${navItemBase} ${navItemHover} mb-0.5 max-md:min-h-[44px] max-md:py-3 max-md:px-4 ${collapsed ? 'justify-center p-2.5' : ''}`}
            onClick={() => !collapsed && setBoardExpanded(!boardExpanded)}
            title={collapsed ? '게시판' : undefined}
          >
            <span className={`flex items-center justify-center w-5 h-5 flex-shrink-0 text-gray-400 ${collapsed ? 'm-0' : ''}`}><Icon name="board" /></span>
            {!collapsed && (
              <>
                <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">게시판</span>
                <span className={`flex items-center justify-center text-gray-400 transition-transform duration-200 ${boardExpanded ? 'rotate-90' : ''}`}>
                  <Icon name="chevron" size={14} />
                </span>
              </>
            )}
          </button>

          {!collapsed && boardExpanded && (
            <div className="pl-5 ml-2.5 border-l border-gray-200">
              <a
                href="https://community.ilouli.com/free-board"
                className={`${navSubitemBase} ${navSubitemHover} max-md:min-h-[40px] max-md:py-2.5 max-md:px-3`}
              >
                <span className="flex items-center justify-center w-4 h-4 flex-shrink-0 text-gray-400"><Icon name="free" size={14} /></span>
                <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">자유게시판<span className="text-[10px] text-blue-400">↗</span></span>
              </a>
              <a
                href="https://community.ilouli.com/issue-board"
                className={`${navSubitemBase} ${navSubitemHover} max-md:min-h-[40px] max-md:py-2.5 max-md:px-3`}
              >
                <span className="flex items-center justify-center w-4 h-4 flex-shrink-0 text-gray-400"><Icon name="issue" size={14} /></span>
                <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">이슈게시판<span className="text-[10px] text-blue-400">↗</span></span>
              </a>
            </div>
          )}
        </div>

        {/* Dev Hub (Family 이상 - community 외부 링크) */}
        {hasDevAccess && (
          <a
            href="https://community.ilouli.com/dev-hub"
            className={`${navItemBase} ${navItemHover} max-md:min-h-[44px] max-md:py-3 max-md:px-4 ${collapsed ? 'justify-center p-2.5' : ''}`}
            title={collapsed ? 'Dev Hub' : undefined}
          >
            <span className={`flex items-center justify-center w-5 h-5 flex-shrink-0 text-gray-400 ${collapsed ? 'm-0' : ''}`}><Icon name="dev" /></span>
            {!collapsed && (
              <>
                <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">Dev Hub<span className="text-[10px] text-blue-400">↗</span></span>
                <span className="text-[10px] py-0.5 px-1.5 rounded font-medium uppercase tracking-wide bg-orange-500/[0.12] text-orange-600">비공개</span>
              </>
            )}
          </a>
        )}

        {/* 게임 (community 외부 링크) */}
        <a
          href="https://community.ilouli.com/games"
          className={`${navItemBase} ${navItemHover} max-md:min-h-[44px] max-md:py-3 max-md:px-4 ${collapsed ? 'justify-center p-2.5' : ''}`}
          title={collapsed ? '게임' : undefined}
        >
          <span className={`flex items-center justify-center w-5 h-5 flex-shrink-0 text-gray-400 ${collapsed ? 'm-0' : ''}`}><Icon name="game" /></span>
          {!collapsed && <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">게임<span className="text-[10px] text-blue-400">↗</span></span>}
        </a>

        {/* 구분선 */}
        {!collapsed && <div className="h-px bg-gray-200 my-2 mx-4"></div>}

        {/* 뉴스 (news.ilouli.com 외부 링크) */}
        <a
          href="https://news.ilouli.com/news"
          className={`${navItemBase} ${navItemHover} max-md:min-h-[44px] max-md:py-3 max-md:px-4 ${collapsed ? 'justify-center p-2.5' : ''}`}
          title={collapsed ? '뉴스' : undefined}
        >
          <span className={`flex items-center justify-center w-5 h-5 flex-shrink-0 text-gray-400 ${collapsed ? 'm-0' : ''}`}><Icon name="news" /></span>
          {!collapsed && <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">뉴스<span className="text-[10px] text-blue-400">↗</span></span>}
        </a>

        {/* AI 브리핑 (news.ilouli.com 외부 링크) */}
        <a
          href="https://news.ilouli.com/news/briefing"
          className={`${navItemBase} ${navItemHover} max-md:min-h-[44px] max-md:py-3 max-md:px-4 ${collapsed ? 'justify-center p-2.5' : ''}`}
          title={collapsed ? 'AI 브리핑' : undefined}
        >
          <span className={`flex items-center justify-center w-5 h-5 flex-shrink-0 text-gray-400 ${collapsed ? 'm-0' : ''}`}><Icon name="briefing" /></span>
          {!collapsed && <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">AI 브리핑<span className="text-[10px] text-blue-400">↗</span></span>}
        </a>

        {/* YouTube (news.ilouli.com 외부 링크) */}
        <a
          href="https://news.ilouli.com/youtube"
          className={`${navItemBase} ${navItemHover} max-md:min-h-[44px] max-md:py-3 max-md:px-4 ${collapsed ? 'justify-center p-2.5' : ''}`}
          title={collapsed ? 'YouTube' : undefined}
        >
          <span className={`flex items-center justify-center w-5 h-5 flex-shrink-0 text-gray-400 ${collapsed ? 'm-0' : ''}`}><Icon name="youtube" /></span>
          {!collapsed && <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">YouTube<span className="text-[10px] text-blue-400">↗</span></span>}
        </a>

        {/* 지식 그래프 (내부 - 확장 그룹) */}
        <div className={`mb-1 ${collapsed ? 'mb-0' : ''}`}>
          <button
            className={`${navItemBase} ${navItemHover} ${isNexusPath ? navItemActive : ''} mb-0.5 max-md:min-h-[44px] max-md:py-3 max-md:px-4 ${collapsed ? 'justify-center p-2.5' : ''}`}
            onClick={() => !collapsed && setNexusExpanded(!nexusExpanded)}
            title={collapsed ? '지식 그래프' : undefined}
          >
            <span className={`flex items-center justify-center w-5 h-5 flex-shrink-0 text-gray-400 transition-colors duration-150 ${isNexusPath ? 'text-blue-500' : ''} ${collapsed ? 'm-0' : ''}`}><Icon name="nexus" /></span>
            {!collapsed && (
              <>
                <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">지식 그래프</span>
                <span className={`flex items-center justify-center text-gray-400 transition-transform duration-200 ${nexusExpanded ? 'rotate-90' : ''}`}>
                  <Icon name="chevron" size={14} />
                </span>
              </>
            )}
          </button>

          {!collapsed && nexusExpanded && (
            <div className="pl-5 ml-2.5 border-l border-gray-200">
              <Link to="/"
                className={`${navSubitemBase} ${navSubitemHover} ${isActive('/') ? navSubitemActive : ''} max-md:min-h-[40px] max-md:py-2.5 max-md:px-3`}>
                <span className={`flex items-center justify-center w-4 h-4 flex-shrink-0 text-gray-400 transition-colors duration-150 ${isActive('/') ? 'text-blue-500' : ''}`}><Icon name="graph" size={14} /></span>
                <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">넥서스 탐색</span>
              </Link>
              {isAdmin && (
                <>
                  <Link to="/nodes"
                    className={`${navSubitemBase} ${navSubitemHover} ${isActive('/nodes') ? navSubitemActive : ''} max-md:min-h-[40px] max-md:py-2.5 max-md:px-3`}>
                    <span className={`flex items-center justify-center w-4 h-4 flex-shrink-0 text-gray-400 transition-colors duration-150 ${isActive('/nodes') ? 'text-blue-500' : ''}`}><Icon name="nodes" size={14} /></span>
                    <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">노드 목록</span>
                  </Link>
                  <Link to="/ingest"
                    className={`${navSubitemBase} ${navSubitemHover} ${isActive('/ingest') ? navSubitemActive : ''} max-md:min-h-[40px] max-md:py-2.5 max-md:px-3`}>
                    <span className={`flex items-center justify-center w-4 h-4 flex-shrink-0 text-gray-400 transition-colors duration-150 ${isActive('/ingest') ? 'text-blue-500' : ''}`}><Icon name="ingest" size={14} /></span>
                    <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">노드 추출</span>
                  </Link>
                  <Link to="/automation"
                    className={`${navSubitemBase} ${navSubitemHover} ${isActive('/automation') ? navSubitemActive : ''} max-md:min-h-[40px] max-md:py-2.5 max-md:px-3`}>
                    <span className={`flex items-center justify-center w-4 h-4 flex-shrink-0 text-gray-400 transition-colors duration-150 ${isActive('/automation') ? 'text-blue-500' : ''}`}><Icon name="automation" size={14} /></span>
                    <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">자동화 현황</span>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Spacer */}
      <div className="flex-1 max-md:hidden"></div>
    </aside>
  );
};

export default Sidebar;
